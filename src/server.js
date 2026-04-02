const http = require('http');

const items = new Map();
let nextId = 1;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseUrl(url) {
  const [path] = url.split('?');
  const parts = path.split('/').filter(Boolean);
  return { path, parts };
}

async function handleRequest(req, res) {
  const { path, parts } = parseUrl(req.url);
  const method = req.method;

  if (path === '/health' && method === 'GET') {
    return send(res, 200, { status: 'ok', uptime: process.uptime() });
  }

  if (parts[0] === 'api' && parts[1] === 'items') {
    const id = parts[2] ? parseInt(parts[2], 10) : null;

    if (!id && method === 'GET') {
      return send(res, 200, Array.from(items.values()));
    }

    if (!id && method === 'POST') {
      let body;
      try {
        body = await parseBody(req);
      } catch (e) {
        return send(res, 400, { error: 'Invalid JSON' });
      }
      if (!body.name) {
        return send(res, 400, { error: 'name is required' });
      }
      const item = { id: nextId++, name: body.name, createdAt: new Date().toISOString() };
      items.set(item.id, item);
      return send(res, 201, item);
    }

    if (id && method === 'GET') {
      const item = items.get(id);
      if (!item) return send(res, 404, { error: 'Item not found' });
      return send(res, 200, item);
    }

    if (id && method === 'DELETE') {
      if (!items.has(id)) return send(res, 404, { error: 'Item not found' });
      items.delete(id);
      res.writeHead(204, { 'Content-Type': 'application/json' });
      return res.end();
    }
  }

  send(res, 404, { error: 'Not found' });
}

const server = http.createServer(handleRequest);

// Allow external usage for testing
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { server, items, resetState() { items.clear(); nextId = 1; } };
