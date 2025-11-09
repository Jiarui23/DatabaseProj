const { pool } = require('./backend/mysql_db.js');

async function cleanup() {
  const [result] = await pool.query(`
    DELETE FROM anime_hub.review 
    WHERE username LIKE 'testuser_%' 
       OR username IN ('alice', 'bob', 'charlie', 'diana')
  `);
  console.log(`✅ Deleted ${result.affectedRows} test reviews`);
  process.exit(0);
}

cleanup();
