/**
 * Test script to verify rate limiting lock prevents race conditions
 * This sends multiple reviews simultaneously to test if the lock works
 */

const SERVER_URL = 'http://localhost:3000';

// Test 1: Send reviews simultaneously to same anime
async function testSimultaneousReviews(numRequests = 12) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST 1: Sending ${numRequests} reviews SIMULTANEOUSLY`);
  console.log(`${'='.repeat(60)}\n`);
  
  const username = `testuser_${Date.now()}`;
  console.log(`Username: ${username}`);
  console.log(`Rate limit: 10 reviews per day`);
  console.log(`Expected: First 10 succeed, remaining ${numRequests - 10} fail\n`);
  
  // Create all fetch promises at once (truly simultaneous)
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 1; i <= numRequests; i++) {
    promises.push(
      fetch(`${SERVER_URL}/api/anime/1/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: username,
          score: Math.floor(Math.random() * 10) + 1,
          review: `Test review #${i} - Timestamp: ${Date.now()}`
        })
      }).then(async res => {
        const body = await res.json();
        return {
          requestNum: i,
          status: res.status,
          body: body,
          timestamp: Date.now() - startTime
        };
      }).catch(err => ({
        requestNum: i,
        status: 'ERROR',
        error: err.message,
        timestamp: Date.now() - startTime
      }))
    );
  }
  
  // Wait for ALL requests to complete
  console.log('Sending all requests NOW...\n');
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  // Sort by completion time to see execution order
  results.sort((a, b) => a.timestamp - b.timestamp);
  
  // Analyze results
  const successful = results.filter(r => r.status === 201);
  const rateLimited = results.filter(r => r.status === 429);
  const errors = results.filter(r => r.status === 'ERROR');
  
  console.log('RESULTS:');
  console.log(`${'─'.repeat(60)}`);
  console.log(`✅ Successful:    ${successful.length} (should be 10)`);
  console.log(`❌ Rate Limited:  ${rateLimited.length} (should be ${numRequests - 10})`);
  console.log(`⚠️  Errors:        ${errors.length}`);
  console.log(`⏱️  Total Time:    ${totalTime}ms`);
  console.log(`${'─'.repeat(60)}\n`);
  
  console.log('DETAILED RESULTS (in completion order):');
  console.log(`${'─'.repeat(60)}`);
  
  results.forEach(r => {
    if (r.status === 201) {
      console.log(
        `  [+${r.timestamp}ms] Request #${r.requestNum}: ` +
        `✅ SUCCESS - Reviews today: ${r.body.reviewsToday}, Remaining: ${r.body.remainingToday}`
      );
    } else if (r.status === 429) {
      console.log(
        `  [+${r.timestamp}ms] Request #${r.requestNum}: ` +
        `❌ RATE LIMITED - ${r.body.message}`
      );
    } else {
      console.log(
        `  [+${r.timestamp}ms] Request #${r.requestNum}: ` +
        `⚠️  ERROR - ${r.error}`
      );
    }
  });
  
  // Verify lock worked correctly
  console.log(`\n${'='.repeat(60)}`);
  if (successful.length === 10 && rateLimited.length === numRequests - 10) {
    console.log('✅ LOCK TEST PASSED!');
    console.log('   Rate limit correctly enforced despite simultaneous requests');
  } else {
    console.log('❌ LOCK TEST FAILED!');
    console.log('   Race condition detected - lock may not be working');
  }
  console.log(`${'='.repeat(60)}\n`);
  
  return {
    passed: successful.length === 10 && rateLimited.length === numRequests - 10,
    successful: successful.length,
    rateLimited: rateLimited.length,
    errors: errors.length
  };
}

// Test 2: Test with staggered timing
async function testStaggeredReviews() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 2: Sending reviews with 50ms delay between each');
  console.log(`${'='.repeat(60)}\n`);
  
  const username = `testuser_${Date.now()}`;
  console.log(`Username: ${username}`);
  console.log('This should process in order without lock contention\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 1; i <= 12; i++) {
    const res = await fetch(`${SERVER_URL}/api/anime/1/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: username,
        score: 8,
        review: `Staggered test review #${i}`
      })
    });
    
    const body = await res.json();
    
    if (res.status === 201) {
      successCount++;
      console.log(`  Request #${i}: ✅ SUCCESS (Reviews: ${body.reviewsToday})`);
    } else {
      failCount++;
      console.log(`  Request #${i}: ❌ RATE LIMITED`);
    }
    
    // Wait 50ms before next request
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n✅ Successful: ${successCount}, ❌ Failed: ${failCount}\n`);
}

// Test 3: Multiple users simultaneously (should NOT block each other)
async function testMultipleUsers() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 3: Multiple DIFFERENT users posting simultaneously');
  console.log(`${'='.repeat(60)}\n`);
  
  console.log('Testing if locks are per-user (different users should NOT wait)\n');
  
  const users = ['alice', 'bob', 'charlie', 'diana'];
  const promises = [];
  const startTime = Date.now();
  
  // Each user posts 3 reviews simultaneously
  for (const user of users) {
    for (let i = 1; i <= 3; i++) {
      promises.push(
        fetch(`${SERVER_URL}/api/anime/1/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: user,
            score: 9,
            review: `${user}'s review #${i}`
          })
        }).then(async res => ({
          user: user,
          status: res.status,
          body: await res.json()
        }))
      );
    }
  }
  
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  console.log('RESULTS:');
  console.log(`${'─'.repeat(60)}`);
  
  users.forEach(user => {
    const userResults = results.filter(r => r.user === user);
    const successful = userResults.filter(r => r.status === 201).length;
    console.log(`  ${user}: ${successful}/3 reviews posted`);
  });
  
  console.log(`\n⏱️  Total Time: ${totalTime}ms`);
  console.log(`${'─'.repeat(60)}`);
  
  if (totalTime < 500) {
    console.log('\n✅ PARALLEL EXECUTION CONFIRMED!');
    console.log('   Different users did NOT block each other');
  } else {
    console.log('\n⚠️  Execution seems slow - locks may be blocking incorrectly');
  }
  console.log(`${'='.repeat(60)}\n`);
}

// Run all tests
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       RATE LIMITING LOCK - RACE CONDITION TEST SUITE       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // Test server is running
    const healthCheck = await fetch(SERVER_URL).catch(() => null);
    if (!healthCheck) {
      console.error('\n❌ ERROR: Server is not running at', SERVER_URL);
      console.error('   Start the server with: npm start\n');
      return;
    }
    
    // Run tests
    await testSimultaneousReviews(12);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between tests
    
    await testStaggeredReviews();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testMultipleUsers();
    
    console.log('\n✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

// Run tests
runAllTests();
