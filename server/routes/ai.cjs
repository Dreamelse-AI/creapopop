/**
 * AI 代理 — 三类模型 + TTS，key 仅在后端。
 *
 * 复用 newcreation 的调用方式：
 *   - 生图/Claude：APIMart（APIMART_API_KEY）
 *     图片：POST /v1/images/generations（异步 task）+ GET /v1/tasks/:id
 *     Claude：POST /v1/messages（x-api-key + anthropic-version）
 *   - 聊天试聊：Gemini（service account），见 gemini.cjs
 *
 * 前端端点：
 *   POST /api/ai/image/submit      → 提交生图任务 { prompt, aspectRatio?, referenceImages? }
 *   GET  /api/ai/image/task/:id    → 查询任务
 *   POST /api/ai/intro-page        → Claude 生成介绍页 HTML（Anthropic messages）
 *   POST /api/ai/chat              → 聊天试聊（Gemini，SSE）
 */
const https = require('https');
const { URL } = require('url');
const { readBody, sendJson } = require('../utils/body.cjs');
const { resolveEmail } = require('../utils/auth.cjs');
const { APIMART_API_BASE, APIMART_API_KEY } = require('../config.cjs');

const ANTHROPIC_VERSION = '2025-10-01';

function apimartRequest(method, pathSuffix, body, authMode = 'bearer') {
    return new Promise((resolve, reject) => {
        if (!APIMART_API_KEY) return reject(new Error('APIMART_API_KEY 未配置'));
        const target = new URL(APIMART_API_BASE + pathSuffix);
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
        if (authMode === 'anthropic') {
            headers['x-api-key'] = APIMART_API_KEY;
            headers['anthropic-version'] = ANTHROPIC_VERSION;
        } else {
            headers['Authorization'] = `Bearer ${APIMART_API_KEY}`;
        }
        const r = https.request(
            {
                hostname: target.hostname,
                port: target.port || 443,
                path: target.pathname + (target.search || ''),
                method,
                headers,
                timeout: 120000,
            },
            (resp) => {
                let data = '';
                resp.on('data', (c) => (data += c));
                resp.on('end', () => resolve({ status: resp.statusCode || 500, body: data }));
            }
        );
        r.on('error', reject);
        r.on('timeout', () => { r.destroy(); reject(new Error('上游超时')); });
        if (body) r.write(body);
        r.end();
    });
}

// POST /api/ai/image/submit
async function handleImageSubmit(req, res) {
    if (!resolveEmail(req, res)) return;
    try {
        const body = await readBody(req);
        const resp = await apimartRequest('POST', '/v1/images/generations', body);
        res.writeHead(resp.status, { 'Content-Type': 'application/json' });
        res.end(resp.body);
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
}

// GET /api/ai/image/task/:id
async function handleImageTask(req, res, taskId) {
    if (!resolveEmail(req, res)) return;
    try {
        const resp = await apimartRequest(
            'GET',
            `/v1/tasks/${encodeURIComponent(taskId)}?language=zh`
        );
        res.writeHead(resp.status, { 'Content-Type': 'application/json' });
        res.end(resp.body);
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
}

// POST /api/ai/intro-page → Claude messages
async function handleIntroPage(req, res) {
    if (!resolveEmail(req, res)) return;
    try {
        const body = await readBody(req);
        const resp = await apimartRequest('POST', '/v1/messages', body, 'anthropic');
        res.writeHead(resp.status, { 'Content-Type': 'application/json' });
        res.end(resp.body);
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
}

module.exports = { handleImageSubmit, handleImageTask, handleIntroPage };
