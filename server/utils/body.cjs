// 请求体读取
function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        let size = 0;
        const MAX = 10 * 1024 * 1024; // 10MB
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX) {
                reject(new Error('Body too large'));
                req.destroy();
                return;
            }
            data += chunk;
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

function sendJson(res, status, obj) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
}

module.exports = { readBody, sendJson };
