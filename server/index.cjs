const http = require('http');
const { applyCors } = require('./utils/cors.cjs');
const { sendJson } = require('./utils/body.cjs');
const auth = require('./routes/auth.cjs');
const character = require('./routes/character.cjs');
const mock = require('./routes/mock.cjs');
const { serveStatic } = require('./static.cjs');

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

    // 账号
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

    // AI 代理位（P1 接入：/api/ai/image、/api/ai/chat、/api/ai/intro-page）
    if (reqPath.startsWith('/api/ai/')) {
        return sendJson(res, 501, { error: 'AI 能力将在 P1 接入' });
    }

    // 静态文件兜底（SPA）
    serveStatic(req, res);
}

function createServer() {
    return http.createServer(dispatch);
}

module.exports = { createServer, dispatch };
