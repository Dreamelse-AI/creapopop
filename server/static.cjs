const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const UPLOAD_DIR = path.join(__dirname, '..', '.data', 'uploads');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
};

// 静态文件服务 + SPA 兜底（找不到文件回 index.html）
function serveStatic(req, res) {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(DIST, urlPath);

    // 防目录穿越
    if (!filePath.startsWith(DIST)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }
    const ext = path.extname(filePath);
    // index.html 绝不缓存（否则用户拿到旧 HTML、仍指向旧 JS）；带 hash 的 assets 长期缓存。
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.html') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
}

// 用户上传的图片：/uploads/<hash>/<file> → .data/uploads/...，带长缓存（文件名含时间戳+随机，不可变）
function serveUpload(req, res) {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = urlPath.replace(/^\/uploads\//, '');
    const filePath = path.join(UPLOAD_DIR, rel);
    if (!filePath.startsWith(UPLOAD_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(filePath).pipe(res);
}

module.exports = { serveStatic, serveUpload };
