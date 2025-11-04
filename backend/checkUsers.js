const { pool } = require('./mysql_db');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function checkUsers() {
  try {
    console.log('Checking Users table...\n');
    
    // Get all users
    const [users] = await pool.query('SELECT id, username, password, is_admin FROM anime_hub.Users');
    
    if (users.length === 0) {
      console.log('❌ No users found in the database!');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Username: ${user.username}`);
        console.log(`Password (stored): ${user.password}`);
        console.log(`Is Admin: ${user.is_admin}`);
        console.log('---');
      });
      
      console.log('\nPassword hash examples:');
      console.log(`"admin" -> ${hashPassword('admin')}`);
      console.log(`"password" -> ${hashPassword('password')}`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
