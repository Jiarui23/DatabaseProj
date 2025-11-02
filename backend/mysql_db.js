// backend/mysql_db.js (ESM version)
import dotenv from "dotenv";
import mysql from "mysql2/promise";
dotenv.config();

// Accept either DB_* or MYSQL_* env names
const DB_HOST = process.env.DB_HOST || process.env.MYSQL_HOST;
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);
const DB_USER = process.env.DB_USER || process.env.MYSQL_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQL_PASS;
const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DB;

function assertEnv(name, value) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}
assertEnv("DB_HOST (or MYSQL_HOST)", DB_HOST);
assertEnv("DB_USER (or MYSQL_USER)", DB_USER);
assertEnv("DB_PASSWORD (or MYSQL_PASS)", DB_PASSWORD);
assertEnv("DB_NAME (or MYSQL_DB)", DB_NAME);

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection() {
  const [rows] = await pool.query("SELECT DATABASE() AS db, NOW() AS now");
  return rows?.[0];
}
