/**
 * SoraVer2 — Local Dev Server
 * Serves static files with Cross-Origin headers required for SharedArrayBuffer / FFmpeg.wasm
 *
 * Headers needed:
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3001;
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm',
    '.mov':  'video/quicktime',
    '.avi':  'video/x-msvideo',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.mp3':  'audio/mpeg',
    '.wav':  'audio/wav',
    '.aac':  'audio/aac',
    '.m4a':  'audio/mp4',
    '.bat':  'text/plain',
    '.txt':  'text/plain',
};

const server = http.createServer((req, res) => {
    // --- CORS headers for SharedArrayBuffer (FFmpeg.wasm requirement) ---
    res.setHeader('Cross-Origin-Opener-Policy',   'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless'); // allows CDN resources without CORP header
    res.setHeader('Access-Control-Allow-Origin',  '*');

    // Clean URL — strip query string, decode URI
    let urlPath = req.url.split('?')[0];
    try { urlPath = decodeURIComponent(urlPath); } catch(_) {}

    // Route: serve index.html for bare /
    if (urlPath === '/') urlPath = '/index.html';

    // Route: extensionless paths → try .html
    let filePath = path.join(ROOT, urlPath);
    if (!path.extname(urlPath) && !fs.existsSync(filePath)) {
        const withHtml = filePath + '.html';
        if (fs.existsSync(withHtml)) filePath = withHtml;
    }

    // Security: prevent path traversal outside ROOT
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found: ' + urlPath);
            return;
        }
        const ext  = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('');
    console.log('  ==========================================');
    console.log('   SoraVer2 - Local Development Server');
    console.log('  ==========================================');
    console.log('');
    console.log('  URL    : http://localhost:' + PORT);
    console.log('  Mashup : http://localhost:' + PORT + '/mashup');
    console.log('  Status : SharedArrayBuffer = ENABLED (COOP/COEP headers active)');
    console.log('');
    console.log('  Nhan Ctrl+C de dung server.');
    console.log('');
});
