const { readBody, sendJson } = require('../utils/body.cjs');
const { issueToken } = require('../utils/auth.cjs');
const { MOCK_PASSWORD } = require('../config.cjs');

// 验证码内存存储：email -> { code, expireAt }
// mock 阶段不真正发邮件，固定返回 MOCK_PASSWORD（默认 123456）。
const codeStore = new Map();
const CODE_TTL_MS = 5 * 60 * 1000;

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/send-code { email }
async function handleSendCode(req, res) {
    try {
        const { email } = JSON.parse(await readBody(req) || '{}');
        if (!isValidEmail(email)) {
            return sendJson(res, 400, { error: '邮箱格式不正确' });
        }
        // mock：验证码固定为 MOCK_PASSWORD，真实场景这里生成随机码并发邮件。
        const code = MOCK_PASSWORD;
        codeStore.set(email, { code, expireAt: Date.now() + CODE_TTL_MS });
        sendJson(res, 200, { success: true, ttl: CODE_TTL_MS / 1000, mockCode: code });
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
}

// POST /api/auth/login { email, code }
async function handleLogin(req, res) {
    try {
        const { email, code, password } = JSON.parse(await readBody(req) || '{}');
        if (!isValidEmail(email)) {
            return sendJson(res, 400, { error: '邮箱格式不正确' });
        }
        // 兼容旧入参：优先用 code，回退到 password（便于联调）。
        const input = code ?? password;
        const entry = codeStore.get(email);
        const validByStore = entry && entry.expireAt > Date.now() && entry.code === input;
        // mock 容错：未走发码流程时，直接用固定码也可登录。
        const validByMock = input === MOCK_PASSWORD;
        if (!validByStore && !validByMock) {
            return sendJson(res, 401, { error: '验证码错误或已过期' });
        }
        codeStore.delete(email);
        const token = issueToken(email);
        sendJson(res, 200, { token, email });
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
}

// POST /api/auth/logout — 无状态 token，前端清除即可
function handleLogout(_req, res) {
    sendJson(res, 200, { success: true });
}

module.exports = { handleSendCode, handleLogin, handleLogout };
