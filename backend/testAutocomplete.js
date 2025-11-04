const { pool } = require('./mysql_db');

async function testAutocomplete() {
  try {
    console.log('Testing autocomplete query...\n');
    
    // Test 1: Check if any anime exist
    const [allAnime] = await pool.query('SELECT COUNT(*) as count FROM anime_hub.anime');
    console.log(`Total anime in database: ${allAnime[0].count}\n`);
    
    // Test 2: Show sample anime titles
    const [samples] = await pool.query('SELECT anime_id, title FROM anime_hub.anime LIMIT 10');
    console.log('Sample anime titles:');
    samples.forEach(a => console.log(`  - ${a.title}`));
    console.log('');
    
    // Test 3: Test the autocomplete query with "hunter"
    const query = 'hunter';
    const sql = `
      SELECT 
        anime_id,
        title,
        score,
        score_rank
      FROM anime_hub.anime
      WHERE title LIKE ?
      ORDER BY 
        score_rank IS NULL,
        score_rank ASC,
        score DESC,
        title ASC
      LIMIT 10
    `;
    const [results] = await pool.query(sql, [`%${query}%`]);
    console.log(`Search results for "${query}":`);
    if (results.length === 0) {
      console.log('  No results found');
    } else {
      results.forEach(a => {
        console.log(`  - ${a.title} (rank: ${a.score_rank || 'N/A'}, score: ${a.score || 'N/A'})`);
      });
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testAutocomplete();
