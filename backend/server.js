// backend/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import animeMongoRoutes from "./routes/anime.mongo.routes.js";
import { testConnection } from "./mysql_db.js";

const app = express();
app.use(cors());
app.use(express.json());

// --- API routes first ---
app.get("/health", async (_req, res) => {
  try { res.json({ ok: true, mysql: await testConnection() }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});
app.use("/api/anime", animeMongoRoutes);

// --- Static frontend ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, "../frontend");

// Serve everything in /frontend (js, css, images, html)
app.use(express.static(FRONTEND_DIR, { extensions: ["html"] }));

// Root → index.html
app.get("/", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// (Optional) pretty path for /details/:id → details.html
app.get("/details/:id", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "details.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ All set: http://localhost:${PORT}`));
