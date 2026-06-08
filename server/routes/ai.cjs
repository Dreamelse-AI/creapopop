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
const { APIMART_API_BASE, APIMART_API_KEY, GOOGLE_API_PROXY } = require('../config.cjs');
const { getGeminiAccessToken, getServiceAccount, getProxyAgent } = require('../services/googleAuth.cjs');

const ANTHROPIC_VERSION = '2025-10-01';

// 国内服务器直连 apimart 海外域名会超时，需经代理（与 Gemini 同一个 NLB 代理）
let _apimartAgent = null;
if (GOOGLE_API_PROXY) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    _apimartAgent = new HttpsProxyAgent(GOOGLE_API_PROXY);
}

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
                agent: _apimartAgent || undefined,
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

// POST /api/ai/chat → 角色试聊（Gemini generateContent，非流式，返回整段文本）
// body: { messages: [{role, content}], system?, temperature? }
async function handleChat(req, res) {
    if (!resolveEmail(req, res)) return;
    try {
        const accessToken = await getGeminiAccessToken();
        const sa = getServiceAccount();
        if (!accessToken || !sa) {
            return sendJson(res, 500, { error: 'Gemini 凭据不可用，请检查 service-account.json' });
        }
        const parsed = JSON.parse(await readBody(req));
        const model = (parsed.model || 'gemini-2.5-flash').replace(/^google\//, '');
        const host = 'us-central1-aiplatform.googleapis.com';
        const path = `/v1beta1/projects/${sa.project_id}/locations/us-central1/publishers/google/models/${model}:generateContent`;

        const sys = parsed.system || parsed.messages?.find((m) => m.role === 'system')?.content || '';
        const vertexBody = JSON.stringify({
            contents: (parsed.messages || [])
                .filter((m) => m.role !== 'system')
                .map((m) => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }],
                })),
            systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
            generationConfig: {
                temperature: parsed.temperature ?? 0.8,
                maxOutputTokens: parsed.max_tokens ?? 1024,
            },
        });

        const opts = {
            hostname: host,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'Content-Length': Buffer.byteLength(vertexBody),
            },
            timeout: 60000,
        };
        const agent = getProxyAgent();
        if (agent) opts.agent = agent;

        const vReq = https.request(opts, (vRes) => {
            let data = '';
            vRes.on('data', (c) => (data += c));
            vRes.on('end', () => {
                if ((vRes.statusCode || 500) >= 400) {
                    return sendJson(res, vRes.statusCode, { error: `Gemini ${vRes.statusCode}: ${data.slice(0, 200)}` });
                }
                try {
                    const j = JSON.parse(data);
                    const text = (j.candidates?.[0]?.content?.parts || [])
                        .filter((p) => p.text)
                        .map((p) => p.text)
                        .join('');
                    sendJson(res, 200, { text });
                } catch {
                    sendJson(res, 502, { error: 'Gemini 响应解析失败' });
                }
            });
        });
        vReq.on('error', (e) => sendJson(res, 502, { error: e.message }));
        vReq.on('timeout', () => { vReq.destroy(); sendJson(res, 504, { error: 'Gemini 超时' }); });
        vReq.write(vertexBody);
        vReq.end();
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
}

module.exports = { handleImageSubmit, handleImageTask, handleIntroPage, handleChat };
