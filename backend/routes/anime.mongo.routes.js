import { Router } from "express";
import { getMongo } from "../lib/mongo.js";

const router = Router();

// List anime (with filters)
router.get("/", async (req, res) => {
  const { db } = await getMongo();
  const { q, genre, minScore = 0, page = 1, limit = 20 } = req.query;
  const filter = { score: { $gte: Number(minScore) } };
  if (q) filter.title = { $regex: String(q), $options: "i" };
  if (genre) filter.genres = genre;

  const docs = await db.collection("anime_cache")
    .find(filter, { projection: { _id: 0 } })
    .sort({ score: -1, members: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .toArray();

  res.json(docs);
});

// Get one anime by ID
router.get("/:id", async (req, res) => {
  const { db } = await getMongo();
  const id = Number(req.params.id);
  const doc = await db.collection("anime_cache").findOne({ anime_id: id }, { projection: { _id: 0 } });
  res.json(doc ?? {});
});

export default router;
