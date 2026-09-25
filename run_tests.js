/**
 * Lanceur de tests automatisés RecupFFE en environnement local Node.js.
 * Émule l'environnement Google Apps Script (UrlFetchApp, CacheService, Logger).
 *
 * Utilisation :
 *   node run_tests.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

// 1. Émulation Utilities.sleep
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// 2. Émulation UrlFetchApp avec curl synchrone
class MockHTTPResponse {
  constructor(status, text, headers = {}) {
    this._status = status;
    this._text = text;
    this._headers = headers;
  }
  getResponseCode() { return this._status; }
  getContentText() { return this._text; }
  getHeaders() { return this._headers; }
}

const mockCache = new Map();
const CacheService = {
  getScriptCache: () => ({
    get: (k) => mockCache.get(k) || null,
    put: (k, v) => mockCache.set(k, v)
  })
};

const Utilities = {
  sleep: (ms) => sleepSync(ms)
};

const Logger = {
  log: (...args) => console.log(...args)
};

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
  if (body) {
    cmdArgs.push('--data', body);
  }
  cmdArgs.push(url);

  const res = spawnSync('curl', cmdArgs.slice(1), { maxBuffer: 10 * 1024 * 1024 });

  if (res.error) {
    throw new Error('Curl error: ' + res.error.message);
  }

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

  return new MockHTTPResponse(statusCode, utf8Body);
}

const UrlFetchApp = {
  fetch: (url, options = {}) => performFetch(url, options),
  fetchAll: (requests) => {
    return requests.map(req => performFetch(req.url, req));
  }
};

// Injection des variables globales Google Apps Script
global.UrlFetchApp = UrlFetchApp;
global.Utilities = Utilities;
global.Logger = Logger;
global.CacheService = CacheService;

// Chargement ordonné des fichiers Google Apps Script
const baseDir = __dirname;
const filesToLoad = [
  'API_FFE_CONFIG.gs',
  'API_FFE_UTILITIES.gs',
  'API_FFE_CLASSES.gs',
  'API_FFE_PARSE.gs',
  'API_FFE_FETCH.gs',
  'API_FFE_FIDE.gs',
  'API_FFE_BUSINESS_LOGIC.gs',
  'API_FFE_CLIENT.gs',
  'API_FFE_JSON.gs',
  'API_FFE.gs',
  'API_FFE_TESTS.gs'
];

let combinedCode = '';
for (const file of filesToLoad) {
  const filePath = path.join(baseDir, file);
  combinedCode += `\n// --- FILE: ${file} ---\n` + fs.readFileSync(filePath, 'utf8') + '\n';
}

try {
  vm.runInThisContext(combinedCode, { filename: 'recup_ffe_bundle.js' });
} catch (err) {
  console.error('Erreur lors du chargement des fichiers .gs :', err);
  process.exit(1);
}

console.log('====================================================');
console.log(' Lancement de la suite de tests RecupFFE (34 tests)');
console.log('====================================================\n');

test_ALL();
