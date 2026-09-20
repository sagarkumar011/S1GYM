const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Handle /api/... routes
    if (pathname.startsWith('/api/')) {
        const routeName = pathname.replace('/api/', '').split('/')[0];
        const routeFile = path.join(__dirname, 'api', `${routeName}.js`);

        if (fs.existsSync(routeFile)) {
            try {
                let body = '';
                for await (const chunk of req) {
                    body += chunk;
                }
                if (body) {
                    try { req.body = JSON.parse(body); } catch(e) { req.body = body; }
                } else {
                    req.body = {};
                }
                req.query = Object.fromEntries(parsedUrl.searchParams);

                res.status = function(code) {
                    this.statusCode = code;
                    return this;
                };
                res.json = function(data) {
                    this.setHeader('Content-Type', 'application/json');
                    this.end(JSON.stringify(data));
                    return this;
                };

                const handler = require(routeFile);
                return await handler(req, res);
            } catch (err) {
                console.error('API Error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: err.message }));
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'API route not found' }));
        }
    }

    // Static file serving from public/
    let reqPath = decodeURIComponent(pathname);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const filePath = path.join(PUBLIC_DIR, reqPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`S1 GYMA server running at http://localhost:${PORT}/`);
});
