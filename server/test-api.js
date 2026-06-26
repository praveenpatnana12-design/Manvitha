const { spawn } = require('child_process');
const http = require('http');

const PORT = 5051;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Starts the express server in a child process
const startServer = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting backend test server...');
    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: PORT.toString(), NODE_ENV: 'test' },
      stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running')) {
        console.log('Server is running and listening.');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server stderr: ${data}`);
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    // Timeout fallback
    setTimeout(() => resolve(), 3000);
  });
};

const stopServer = () => {
  if (serverProcess) {
    console.log('Stopping test server...');
    serverProcess.kill();
  }
};

// Perform test fetch calls
const runTests = async () => {
  let testsFailed = 0;
  let testsPassed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      testsFailed++;
    }
  };

  try {
    // 1. Health Check
    console.log('\n--- Running Test: Health Check ---');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check status is 200');
    assert(healthData.status === 'healthy', 'Health check reports healthy status');

    // 2. Authentication Login
    console.log('\n--- Running Test: Auth Login ---');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Admin login status is 200');
    assert(loginData.token !== undefined, 'Admin login returns JWT token');
    assert(loginData.user.role === 'admin', 'Login user role is admin');

    const adminToken = loginData.token;

    // 3. Authenticated Get Me
    console.log('\n--- Running Test: Auth Me (Get Profile) ---');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Get profile status is 200');
    assert(meData.username === 'admin', 'Profile returns correct username');

    // 4. Get Dashboard Metrics
    console.log('\n--- Running Test: Dashboard Metrics ---');
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200, 'Dashboard data status is 200');
    assert(dashData.metrics !== undefined, 'Dashboard response contains core KPIs');
    assert(dashData.charts !== undefined, 'Dashboard response contains chart parameters');
    assert(dashData.insights !== undefined, 'Dashboard response contains AI insights summary');

    // 5. Get Bookings
    console.log('\n--- Running Test: Get Trips & Bookings ---');
    const bookingsRes = await fetch(`${BASE_URL}/api/bookings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const bookingsData = await bookingsRes.json();
    assert(bookingsRes.status === 200, 'Fetch bookings status is 200');
    assert(Array.isArray(bookingsData), 'Bookings list is returned as an array');
    assert(bookingsData.length > 0, 'Seed bookings loaded successfully');

    // Summary
    console.log('\n======================================');
    console.log(`Test Execution Finished.`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log('======================================\n');

    return testsFailed === 0;
  } catch (error) {
    console.error('Test execution failed with error:', error);
    return false;
  }
};

const execute = async () => {
  let success = false;
  try {
    await startServer();
    await delay(1000); // Wait for boot
    success = await runTests();
  } catch (err) {
    console.error('Error executing integration tests:', err);
  } finally {
    stopServer();
    await delay(500); // Wait briefly for clean process termination
    process.exit(success ? 0 : 1);
  }
};

execute();
