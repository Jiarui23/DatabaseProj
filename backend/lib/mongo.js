import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let _client;
let _db;

export async function getMongo() {
  if (_db) return { client: _client, db: _db };
  _client = new MongoClient(process.env.MONGO_URI);
  await _client.connect();
  _db = _client.db(); // uses the db from URI path (animehub)
  return { client: _client, db: _db };
}
