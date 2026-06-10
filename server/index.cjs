const http = require('http');
const { applyCors } = require('./utils/cors.cjs');
const { sendJson } = require('./utils/body.cjs');
const auth = require('./routes/auth.cjs');
const character = require('./routes/character.cjs');
const mock = require('./routes/mock.cjs');
const ai = require('./routes/ai.cjs');
const file = require('./routes/file.cjs');
const { handleArcaProxy } = require('./routes/arcaProxy.cjs');
const { serveStatic, serveUpload } = require('./static.cjs');

const AI_IMAGE_TASK_RE = /^\/api\/ai\/image\/task\/([^/]+)$/;

function dispatch(req, res) {
    applyCors(req, res);
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const reqPath = (req.url || '/').split('?')[0];
    const m = req.method;

    // 健康检查
    if (reqPath === '/health') return sendJson(res, 200, { status: 'ok' });

    // Arca 反向代理（解决生产跨域）：/arca/* → i18n-api.imaginewithu.com/*
    if (reqPath.startsWith('/arca/')) return handleArcaProxy(req, res, reqPath);

    // 账号
    if (reqPath === '/api/auth/send-code' && m === 'POST') return auth.handleSendCode(req, res);
    if (reqPath === '/api/auth/login' && m === 'POST') return auth.handleLogin(req, res);
    if (reqPath === '/api/auth/logout' && m === 'POST') return auth.handleLogout(req, res);

    // 角色 CRUD
    if (reqPath === '/api/character/save' && m === 'POST') return character.handleSave(req, res);
    if (reqPath === '/api/character/list' && m === 'GET') return character.handleList(req, res);
    if (reqPath === '/api/character/get' && m === 'GET') return character.handleGet(req, res);
    if (reqPath === '/api/character/delete' && m === 'POST') return character.handleDelete(req, res);
    if (reqPath === '/api/character/publish' && m === 'POST') return character.handlePublish(req, res);

    // Mock 数据
    if (reqPath === '/api/mock/voices' && m === 'GET') return mock.handleVoices(req, res);
    if (reqPath === '/api/mock/music' && m === 'GET') return mock.handleMusic(req, res);

    // AI 能力（代理三类模型，key 在后端）
    if (reqPath === '/api/ai/image/submit' && m === 'POST') return ai.handleImageSubmit(req, res);
    {
        const tm = reqPath.match(AI_IMAGE_TASK_RE);
        if (tm && m === 'GET') return ai.handleImageTask(req, res, tm[1]);
    }
    if (reqPath === '/api/ai/intro-page' && m === 'POST') return ai.handleIntroPage(req, res);
    if (reqPath === '/api/ai/chat' && m === 'POST') return ai.handleChat(req, res);
    if (reqPath.startsWith('/api/ai/')) {
        return sendJson(res, 501, { error: '该 AI 能力尚未接入' });
    }

    // 文件上传（对齐 Arca 存储范式：业务数据只存短 url，不存 base64）
    if (reqPath === '/api/file/upload' && m === 'POST') return file.handleUpload(req, res);

    // 用户上传的图片（持久卷），独立于前端构建产物
    if (reqPath.startsWith('/uploads/') && m === 'GET') return serveUpload(req, res);

    // 静态文件兜底（SPA）
    serveStatic(req, res);
}

function createServer() {
    return http.createServer(dispatch);
}

module.exports = { createServer, dispatch };
