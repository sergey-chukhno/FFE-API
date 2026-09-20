const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const PORT = 3030;
const BASE_DIR = '/Users/sergeychukhno/Desktop/RecupFFE';

// Emulate GAS Environment
function performFetch(url, options = {}) {
  const method = (options.method || 'get').toUpperCase();
  const headers = Object.assign({}, options.headers || {});
  let body = undefined;
  if (method === 'POST') {
    if (typeof options.payload === 'object') {
      const formParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.payload)) {
        formParams.append(k, v);
      }
      body = formParams.toString();
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    } else {
      body = options.payload;
    }
  }

  const cmdArgs = ['curl', '-s', '-i', '-X', method];
  for (const [hk, hv] of Object.entries(headers)) {
    cmdArgs.push('-H', `${hk}: ${hv}`);
  }
  if (body) cmdArgs.push('--data', body);
  cmdArgs.push(url);

  const res = spawnSync('curl', cmdArgs.slice(1), { maxBuffer: 10 * 1024 * 1024 });
  const rawOutput = res.stdout.toString('latin1');
  const parts = rawOutput.split(/\r?\n\r?\n/);
  let headerPart = parts[0];
  let bodyPart = parts.slice(1).join('\r\n\r\n');
  if (headerPart.includes('100 Continue') && parts.length > 2) {
    headerPart = parts[1];
    bodyPart = parts.slice(2).join('\r\n\r\n');
  }
  const statusMatch = headerPart.match(/HTTP\/[\d\.]+\s+(\d+)/);
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 200;
  const utf8Body = Buffer.from(bodyPart, 'latin1').toString('utf8');
  return {
    getResponseCode: () => statusCode,
    getContentText: () => utf8Body,
    getHeaders: () => ({})
  };
}

global.UrlFetchApp = {
  fetch: (url, options) => performFetch(url, options),
  fetchAll: (reqs) => reqs.map(r => performFetch(r.url, r))
};
global.Utilities = { sleep: (ms) => {} };
global.Logger = { log: console.log };
global.CacheService = { getScriptCache: () => ({ get: () => null, put: () => {} }) };

// Load GAS files
const filesToLoad = [
  'API_FFE_CONFIG.gs', 'API_FFE_UTILITIES.gs', 'API_FFE_CLASSES.gs',
  'API_FFE_PARSE.gs', 'API_FFE_FETCH.gs', 'API_FFE_FIDE.gs',
  'API_FFE_BUSINESS_LOGIC.gs', 'API_FFE_CLIENT.gs', 'API_FFE_JSON.gs'
];
let code = '';
for (const f of filesToLoad) {
  code += fs.readFileSync(path.join(BASE_DIR, f), 'utf8') + '\n';
}
vm.runInThisContext(code);

// Polyfill script injected into HTML for local browser testing
const CLIENT_POLYFILL = `
<script>
if (typeof google === "undefined" || !google.script || !google.script.run) {
  function createGasRunner(successCb, failureCb) {
    return new Proxy({}, {
      get(target, prop) {
        if (prop === "withSuccessHandler") {
          return function(cb) {
            return createGasRunner(cb, failureCb);
          };
        }
        if (prop === "withFailureHandler") {
          return function(cb) {
            return createGasRunner(successCb, cb);
          };
        }
        return function(...args) {
          fetch("/api/rpc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fn: prop, args: args })
          })
          .then(res => {
            if (!res.ok) throw new Error("Erreur HTTP " + res.status);
            return res.json();
          })
          .then(data => {
            if (data && data.error && !data.count && !data.joueurs) {
              if (failureCb) failureCb(new Error(data.error));
            } else {
              if (successCb) successCb(data);
            }
          })
          .catch(err => {
            if (failureCb) failureCb(err);
          });
        };
      }
    });
  }

  window.google = {
    script: {
      run: createGasRunner()
    }
  };
}
</script>
`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && url === '/api/rpc') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { fn, args } = JSON.parse(body);
        if (typeof global[fn] === 'function') {
          console.log(`[RPC] Executing ${fn}(${(args || []).map(a => JSON.stringify(a)).join(', ')})`);
          const result = global[fn](...(args || []));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Function ${fn} not found` }));
        }
      } catch (err) {
        console.error('[RPC ERROR]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve static HTML files with polyfill
  let filePath = '';
  if (url === '/' || url === '/index.html') {
    filePath = path.join(BASE_DIR, 'index.html');
  } else if (url === '/licence.html') {
    filePath = path.join(BASE_DIR, 'licence.html');
  }

  if (filePath && fs.existsSync(filePath)) {
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('<head>', '<head>' + CLIENT_POLYFILL);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Serveur de Test Local RecupFFE démarré ! `);
  console.log(` 👉 Recherche Joueurs : http://localhost:${PORT}/index.html`);
  console.log(` 👉 Import Excel      : http://localhost:${PORT}/licence.html`);
  console.log(`====================================================`);
});
