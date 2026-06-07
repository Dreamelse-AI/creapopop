const { readBody, sendJson } = require('../utils/body.cjs');
const { issueToken } = require('../utils/auth.cjs');
const { MOCK_PASSWORD } = require('../config.cjs');

// POST /api/auth/login { email, password }
async function handleLogin(req, res) {
    try {
        const body = await readBody(req);
        const { email, password } = JSON.parse(body);
        if (!email || !email.includes('@')) {
            return sendJson(res, 400, { error: '邮箱格式不正确' });
        }
        // mock：任意邮箱 + 固定密码。后续替换为验证码/真实校验。
        if (password !== MOCK_PASSWORD) {
            return sendJson(res, 401, { error: '邮箱或密码错误' });
        }
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

module.exports = { handleLogin, handleLogout };
