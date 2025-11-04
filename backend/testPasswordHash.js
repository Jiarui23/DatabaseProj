const crypto = require('crypto');

// Hash password using SHA-256 (same as authController)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Test with common passwords
const testPasswords = ['admin', 'password', '123456', 'Admin123'];

console.log('Password Hash Test:');
console.log('==================');
testPasswords.forEach(pwd => {
  const hash = hashPassword(pwd);
  console.log(`Password: "${pwd}"`);
  console.log(`Hash: ${hash}`);
  console.log('');
});

// If you want to test a specific password, run:
// node backend/testPasswordHash.js
