// backend/scripts/sync_to_mongo.js
// Robust MySQL → MongoDB (Atlas) sync with adaptive column mapping.

import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const DB = process.env.MYSQL_DB;

// ---------- helpers ----------
async function hasCol(conn, table, col) {
  const [rows] = await conn.query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [DB, table, col]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA=? AND TABLE_NAME=? LIMIT 1`,
    [DB, table]
  );
  return rows.length > 0;
}

// Build a SELECT that maps whatever columns you actually have to the canonical names
async function selectAnime(conn) {
  // maps: "wantedName" <- [aliases...]  (falls back to NULL/default)
  const wants = {
    anime_id: [],
    title: ["name"],
    type: [],
    episodes: ["episode_count", "total_episodes"],
    score: ["rating"],
    members: ["popularity", "member_count"],
    synopsis: ["description"],
  };

  const pieces = [];
  for (const [want, aliases] of Object.entries(wants)) {
    let picked = null;
    if (await hasCol(conn, "anime", want)) picked = want;
    else {
      for (const alt of aliases) {
        if (await hasCol(conn, "anime", alt)) {
          picked = `${alt}`;
          break;
        }
      }
    }
    if (!picked) {
      // sensible defaults
      const def =
        want === "title" ? `'Untitled'` :
        want === "score" ? `0` :
        want === "members" ? `0` :
        `NULL`;
      pieces.push(`${def} AS ${want}`);
    } else {
      pieces.push(`${picked} AS ${want}`);
    }
  }

  const sql = `SELECT ${pieces.join(", ")} FROM anime`;
  const [rows] = await conn.query(sql);
  return rows;
}

function groupToSetMap(rows, keyField, valField) {
  const m = new Map();
  for (const r of rows) {
    const k = r[keyField];
    const v = r[valField];
    if (k == null || v == null) continue;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(v);
  }
  return m;
}

function groupToArrMap(rows, keyField, valField) {
  const m = new Map();
  for (const r of rows) {
    const k = r[keyField];
    const v = r[valField];
    if (k == null || v == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(v);
  }
  return m;
}

// ---------- main ----------
(async () => {
  try {
    // 1) MySQL connect (to target DB)
    const sql = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS,
      database: DB,
    });

    // 2) Pull core anime (adaptive)
    console.log("→ Reading anime…");
    const animeRows = await selectAnime(sql);
    console.log(`   ${animeRows.length} rows`);

    // 3) Genres
    let genreRows = [];
    if (await tableExists(sql, "anime_genre") && await tableExists(sql, "genre")) {
      const [rows] = await sql.query(`
        SELECT ag.anime_id, g.name AS genre
          FROM anime_genre ag
          JOIN genre g ON ag.genre_id = g.genre_id
      `);
      genreRows = rows;
    } else {
      console.warn("⚠️  Skipping genres (anime_genre/genre table not found).");
    }
    const genresByAnime = groupToSetMap(genreRows, "anime_id", "genre");

    // 4) Studios
    let studioRows = [];
    if (await tableExists(sql, "anime_studio") && await tableExists(sql, "studio")) {
      const [rows] = await sql.query(`
        SELECT ast.anime_id, s.name AS studio
          FROM anime_studio ast
          JOIN studio s ON ast.studio_id = s.studio_id
      `);
      studioRows = rows;
    } else {
      console.warn("⚠️  Skipping studios (anime_studio/studio table not found).");
    }
    const studiosByAnime = groupToSetMap(studioRows, "anime_id", "studio");

    // 5) Relations (support multiple column namings in anime_relation or anime_link)
    let linkRows = [];
    if (await tableExists(sql, "anime_relation")) {
      // try common variants
      const tries = [
        `SELECT anime_id AS src_anime_id, related_id AS dst_anime_id,
                relation_type AS link_type FROM anime_relation`,
        `SELECT src_anime_id, dst_anime_id, link_type FROM anime_relation`,
        `SELECT source_anime_id AS src_anime_id, target_anime_id AS dst_anime_id,
                relation_type AS link_type FROM anime_relation`,
      ];
      for (const q of tries) {
        try {
          const [rows] = await sql.query(q);
          if (rows.length) { linkRows = rows; break; }
        } catch { /* try next */ }
      }
      if (!linkRows.length) console.warn("⚠️  anime_relation exists but columns didn’t match; skipping.");
    } else if (await tableExists(sql, "anime_link")) {
      const [rows] = await sql.query(`SELECT src_anime_id, dst_anime_id, link_type FROM anime_link`);
      linkRows = rows;
    } else {
      console.warn("⚠️  Skipping relations (no anime_relation/anime_link table).");
    }

    const relatedByAnime = new Map(); // anime_id -> {related:[], recommended:[]}
    for (const r of linkRows) {
      const src = Number(r.src_anime_id);
      const dst = Number(r.dst_anime_id);
      if (!src || !dst) continue;
      const kind = (String(r.link_type || "").toLowerCase().includes("recommend"))
        ? "recommended" : "related";
      if (!relatedByAnime.has(src)) relatedByAnime.set(src, { related: [], recommended: [] });
      relatedByAnime.get(src)[kind].push(dst);
    }

    // 6) Images (optional)
    let imageRows = [];
    if (await tableExists(sql, "anime_image")) {
      const [rows] = await sql.query(`SELECT anime_id, image_path FROM anime_image`);
      imageRows = rows;
    } else {
      console.warn("⚠️  Skipping images (no anime_image table).");
    }
    const imagesByAnime = groupToArrMap(imageRows, "anime_id", "image_path");

    // 7) Build docs
    console.log("→ Building documents…");
    const docs = animeRows.map(a => ({
      anime_id: Number(a.anime_id),
      title: a.title ?? "Untitled",
      type: a.type ?? null,
      episodes: a.episodes != null ? Number(a.episodes) : null,
      score: a.score != null ? Number(a.score) : null,
      members: a.members != null ? Number(a.members) : null,
      synopsis: a.synopsis ?? null,
      genres: Array.from(genresByAnime.get(a.anime_id) ?? []),
      studios: Array.from(studiosByAnime.get(a.anime_id) ?? []),
      related: relatedByAnime.get(a.anime_id)?.related ?? [],
      recommended: relatedByAnime.get(a.anime_id)?.recommended ?? [],
      images: imagesByAnime.get(a.anime_id) ?? [],
      updated_at: new Date(),
    }));

    // 8) Mongo upsert
    console.log("→ Connecting to MongoDB Atlas…");
    const mc = new MongoClient(process.env.MONGO_URI);
    await mc.connect();
    const cache = mc.db().collection("anime_cache");

    await cache.createIndex({ anime_id: 1 }, { unique: true });
    await cache.createIndex({ score: -1 });
    await cache.createIndex({ genres: 1 });

    console.log(`→ Upserting ${docs.length} docs…`);
    const batchSize = 1000;
    for (let i = 0; i < docs.length; i += batchSize) {
      const slice = docs.slice(i, i + batchSize);
      const ops = slice.map(d => ({
        updateOne: { filter: { anime_id: d.anime_id }, update: { $set: d }, upsert: true }
      }));
      await cache.bulkWrite(ops);
      console.log(`   batch ${Math.floor(i / batchSize) + 1} ✓`);
    }

    console.log("✅ Sync complete!");
    await mc.close();
    await sql.end();
  } catch (err) {
    console.error("❌ Sync failed:", err);
    process.exit(1);
  }
})();
