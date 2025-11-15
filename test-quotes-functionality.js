#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Motivational Quotes Application
 * Tests all API endpoints and functionality
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test assertion helper
function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.log(`❌ FAIL: ${testName} ${details}`);
    failedTests++;
  }
}

// Test suite functions
async function testHealthEndpoint() {
  console.log('\n🔍 Testing Health Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/health`);
    assert(response.statusCode === 200, 'Health endpoint returns 200');
    assert(response.body.success === true, 'Health endpoint returns success');
    assert(response.body.message, 'Health endpoint returns message');
  } catch (error) {
    assert(false, 'Health endpoint accessible', error.message);
  }
}

async function testQuotesEndpoint() {
  console.log('\n📚 Testing Quotes Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/quotes`);
    assert(response.statusCode === 200, 'Quotes endpoint returns 200');
    assert(response.body.success === true, 'Quotes endpoint returns success');
    assert(Array.isArray(response.body.data.quotes), 'Quotes endpoint returns array');
    assert(response.body.data.quotes.length > 0, 'Quotes endpoint returns quotes', `Found ${response.body.data.quotes.length} quotes`);
    
    // Test pagination
    assert(response.body.data.pagination, 'Quotes endpoint includes pagination');
    assert(typeof response.body.data.pagination.total === 'number', 'Pagination includes total count');
    
    // Test quote structure
    if (response.body.data.quotes.length > 0) {
      const quote = response.body.data.quotes[0];
      assert(quote.id, 'Quote has ID');
      assert(quote.text, 'Quote has text');
      assert(quote.author, 'Quote has author');
      assert(quote.category, 'Quote has category');
    }
  } catch (error) {
    assert(false, 'Quotes endpoint accessible', error.message);
  }
}

async function testRandomQuoteEndpoint() {
  console.log('\n🎲 Testing Random Quote Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/quotes/random`);
    assert(response.statusCode === 200, 'Random quote endpoint returns 200');
    assert(response.body.success === true, 'Random quote endpoint returns success');
    assert(response.body.data.quote, 'Random quote endpoint returns quote object');
    
    const quote = response.body.data.quote;
    assert(quote.text, 'Random quote has text');
    assert(quote.author, 'Random quote has author');
    assert(quote.id, 'Random quote has ID');
    
    // Test multiple requests return different quotes (probabilistic)
    const response2 = await makeRequest(`${API_BASE}/quotes/random`);
    const quote2 = response2.body.data.quote;
    // Note: This might occasionally fail due to randomness, but it's a good indicator
    console.log(`   📝 Quote 1: "${quote.text.substring(0, 50)}..."`);
    console.log(`   📝 Quote 2: "${quote2.text.substring(0, 50)}..."`);
  } catch (error) {
    assert(false, 'Random quote endpoint accessible', error.message);
  }
}

async function testDailyQuoteEndpoint() {
  console.log('\n📅 Testing Daily Quote Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/quotes/daily`);
    assert(response.statusCode === 200, 'Daily quote endpoint returns 200');
    assert(response.body.success === true, 'Daily quote endpoint returns success');
    assert(response.body.data.quote, 'Daily quote endpoint returns quote object');
    
    const quote = response.body.data.quote;
    assert(quote.text, 'Daily quote has text');
    assert(quote.author, 'Daily quote has author');
    
    // Test consistency - daily quote should be the same on multiple requests
    const response2 = await makeRequest(`${API_BASE}/quotes/daily`);
    const quote2 = response2.body.data.quote;
    assert(quote.id === quote2.id, 'Daily quote is consistent across requests');
    
    console.log(`   📝 Today's quote: "${quote.text}" - ${quote.author}`);
  } catch (error) {
    assert(false, 'Daily quote endpoint accessible', error.message);
  }
}

async function testCategoriesEndpoint() {
  console.log('\n📂 Testing Categories Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/quotes/categories`);
    assert(response.statusCode === 200, 'Categories endpoint returns 200');
    assert(response.body.success === true, 'Categories endpoint returns success');
    assert(Array.isArray(response.body.data.categories), 'Categories endpoint returns array');
    assert(response.body.data.categories.length > 0, 'Categories endpoint returns categories');
    
    console.log(`   📂 Found categories: ${response.body.data.categories.join(', ')}`);
  } catch (error) {
    assert(false, 'Categories endpoint accessible', error.message);
  }
}

async function testAuthorsEndpoint() {
  console.log('\n👥 Testing Authors Endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/quotes/authors`);
    assert(response.statusCode === 200, 'Authors endpoint returns 200');
    assert(response.body.success === true, 'Authors endpoint returns success');
    assert(Array.isArray(response.body.data.authors), 'Authors endpoint returns array');
    assert(response.body.data.authors.length > 0, 'Authors endpoint returns authors');
    
    console.log(`   👥 Found ${response.body.data.authors.length} authors`);
  } catch (error) {
    assert(false, 'Authors endpoint accessible', error.message);
  }
}

async function testSearchEndpoint() {
  console.log('\n🔍 Testing Search Endpoint...');
  try {
    // Test basic search
    const response = await makeRequest(`${API_BASE}/quotes/search?q=success`);
    assert(response.statusCode === 200, 'Search endpoint returns 200');
    assert(response.body.success === true, 'Search endpoint returns success');
    assert(Array.isArray(response.body.data.quotes), 'Search endpoint returns quotes array');
    
    console.log(`   🔍 Search for "success" found ${response.body.data.quotes.length} quotes`);
    
    // Test empty search
    const emptyResponse = await makeRequest(`${API_BASE}/quotes/search?q=nonexistentterm12345`);
    assert(emptyResponse.body.data.quotes.length === 0, 'Search returns empty array for non-existent terms');
  } catch (error) {
    assert(false, 'Search endpoint accessible', error.message);
  }
}

async function testQuotesByCategory() {
  console.log('\n📂 Testing Quotes by Category...');
  try {
    const response = await makeRequest(`${API_BASE}/quotes?category=Success`);
    assert(response.statusCode === 200, 'Quotes by category endpoint returns 200');
    assert(response.body.success === true, 'Quotes by category endpoint returns success');
    assert(Array.isArray(response.body.data.quotes), 'Quotes by category returns array');
    
    console.log(`   📂 Found ${response.body.data.quotes.length} quotes in Success category`);
    
    // Verify all quotes are from the requested category
    if (response.body.data.quotes.length > 0) {
      const allCorrectCategory = response.body.data.quotes.every(quote => 
        quote.category.toLowerCase() === 'success'
      );
      assert(allCorrectCategory, 'All returned quotes match requested category');
    }
  } catch (error) {
    assert(false, 'Quotes by category endpoint accessible', error.message);
  }
}

async function testFrontendAccessibility() {
  console.log('\n🌐 Testing Frontend Accessibility...');
  try {
    const response = await makeRequest(BASE_URL);
    assert(response.statusCode === 200, 'Frontend homepage accessible');
    assert(typeof response.body === 'string', 'Frontend returns HTML');
    assert(response.body.includes('Motivational Quotes'), 'Frontend contains expected content');
    
    // Test admin panel
    const adminResponse = await makeRequest(`${BASE_URL}/admin`);
    assert(adminResponse.statusCode === 200, 'Admin panel accessible');
    assert(adminResponse.body.includes('Admin Panel'), 'Admin panel contains expected content');
  } catch (error) {
    assert(false, 'Frontend accessible', error.message);
  }
}

async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling...');
  try {
    // Test non-existent quote ID
    const response = await makeRequest(`${API_BASE}/quotes/99999`);
    assert(response.statusCode === 404 || response.body.success === false, 'Non-existent quote returns appropriate error');
    
    // Test invalid endpoint
    const invalidResponse = await makeRequest(`${API_BASE}/invalid-endpoint`);
    assert(invalidResponse.statusCode === 404, 'Invalid endpoint returns 404');
  } catch (error) {
    assert(false, 'Error handling works', error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Test Suite for Motivational Quotes Application');
  console.log('=' .repeat(70));
  
  const startTime = Date.now();
  
  try {
    await testHealthEndpoint();
    await testQuotesEndpoint();
    await testRandomQuoteEndpoint();
    await testDailyQuoteEndpoint();
    await testCategoriesEndpoint();
    await testAuthorsEndpoint();
    await testSearchEndpoint();
    await testQuotesByCategory();
    await testFrontendAccessibility();
    await testErrorHandling();
  } catch (error) {
    console.error('❌ Test suite encountered an error:', error);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(70));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! The application is working correctly.');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the issues above.`);
  }
  
  console.log('\n🔗 Application URLs:');
  console.log(`   Frontend: ${BASE_URL}`);
  console.log(`   Admin Panel: ${BASE_URL}/admin`);
  console.log(`   API Health: ${API_BASE}/health`);
  
  process.exit(failedTests === 0 ? 0 : 1);
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  makeRequest,
  assert
};