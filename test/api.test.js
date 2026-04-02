const http = require('http');
const assert = require('assert');
const { server, resetState } = require('../src/server');

const PORT = 9876;
let passed = 0;
let failed = 0;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: PORT, path, method, headers: { 'Content-Type': 'application/json' } };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { /* empty body for 204 */ }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

async function run() {
  server.listen(PORT, async () => {
    console.log('Running tests...\n');

    // Health
    await test('GET /health returns status ok', async () => {
      const res = await request('GET', '/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.strictEqual(typeof res.body.uptime, 'number');
      assert.strictEqual(res.headers['content-type'], 'application/json');
    });

    // Empty list
    await test('GET /api/items returns empty array initially', async () => {
      const res = await request('GET', '/api/items');
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, []);
    });

    // Create item
    await test('POST /api/items creates an item', async () => {
      const res = await request('POST', '/api/items', { name: 'Widget' });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.name, 'Widget');
      assert.strictEqual(res.body.id, 1);
      assert.ok(res.body.createdAt);
    });

    // Create second item
    await test('POST /api/items creates a second item', async () => {
      const res = await request('POST', '/api/items', { name: 'Gadget' });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.id, 2);
    });

    // List items
    await test('GET /api/items returns all items', async () => {
      const res = await request('GET', '/api/items');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 2);
    });

    // Get single item
    await test('GET /api/items/:id returns a single item', async () => {
      const res = await request('GET', '/api/items/1');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.name, 'Widget');
      assert.strictEqual(res.body.id, 1);
    });

    // Get non-existent item
    await test('GET /api/items/:id returns 404 for missing item', async () => {
      const res = await request('GET', '/api/items/999');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error, 'Item not found');
    });

    // Delete item
    await test('DELETE /api/items/:id deletes an item', async () => {
      const res = await request('DELETE', '/api/items/1');
      assert.strictEqual(res.status, 204);
    });

    // Verify deletion
    await test('GET /api/items/:id returns 404 after deletion', async () => {
      const res = await request('GET', '/api/items/1');
      assert.strictEqual(res.status, 404);
    });

    // List after deletion
    await test('GET /api/items returns 1 item after deletion', async () => {
      const res = await request('GET', '/api/items');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 1);
    });

    // Delete non-existent
    await test('DELETE /api/items/:id returns 404 for missing item', async () => {
      const res = await request('DELETE', '/api/items/999');
      assert.strictEqual(res.status, 404);
    });

    // POST without name
    await test('POST /api/items returns 400 without name', async () => {
      const res = await request('POST', '/api/items', { foo: 'bar' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'name is required');
    });

    // 404 for unknown route
    await test('Unknown route returns 404', async () => {
      const res = await request('GET', '/unknown');
      assert.strictEqual(res.status, 404);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  });
}

run();
