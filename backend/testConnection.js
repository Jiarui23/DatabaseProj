const { testConnection, pool } = require('./mysql_db');

async function main() {
  try {
    console.log('Testing database connection...');
    const result = await testConnection();
    console.log('✓ Connection successful!', result);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

main();
