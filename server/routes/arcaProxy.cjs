/**
 * Arca 反向代理 — 解决生产环境跨域。
 *
 * 前端统一走同源 /arca/* 前缀，由本服务转发到 Arca 海外后端，
 * 避免浏览器直接跨域请求 i18n-api.imaginewithu.com 被 CORS 拦截。
 * 开发环境由 vite proxy 承担同样职责；本代理用于生产容器。
 *
 * 透传：method、Authorization、Content-Type、请求体、Arca 响应 status/body。
 */
const https = require('https');
const { URL } = require('url');

const ARCA_ORIGIN = process.env.ARCA_ORIGIN || 'https://i18n-api.imaginewithu.com';

// reqPath 形如 /arca/character/list_drafts → 转发到 ARCA_ORIGIN/character/list_drafts
function handleArcaProxy(req, res, reqPath) {
    const targetPath = reqPath.replace(/^\/arca/, '') || '/';
    const target = new URL(targetPath, ARCA_ORIGIN);

    const headers = {};
    if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'];
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
        const body = Buffer.concat(chunks);
        const options = {
            method: req.method,
            headers,
        };
        const proxyReq = https.request(target, options, (proxyRes) => {
            const respChunks = [];
            proxyRes.on('data', (c) => respChunks.push(c));
            proxyRes.on('end', () => {
                const buf = Buffer.concat(respChunks);
                res.writeHead(proxyRes.statusCode || 502, {
                    'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                });
                res.end(buf);
            });
        });
        proxyReq.on('error', (e) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: -1, msg: `Arca 代理失败: ${e.message}` }));
        });
        if (body.length) proxyReq.write(body);
        proxyReq.end();
    });
}

module.exports = { handleArcaProxy };
