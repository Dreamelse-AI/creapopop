// 简易 token：HMAC 签名的 email + 时间戳。仅用于这一期 mock 鉴权，
// 联调时整体替换为正式账号体系（Arca / OAuth）。
const crypto = require('crypto');
const { TOKEN_SECRET } = require('../config.cjs');
const { sendJson } = require('./body.cjs');

function sign(payload) {
    return crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
}

function issueToken(email) {
    const payload = `${email}|${Date.now()}`;
    const sig = sign(payload);
    return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function verifyToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        const parts = decoded.split('|');
        if (parts.length !== 3) return null;
        const [email, ts, sig] = parts;
        if (sign(`${email}|${ts}`) !== sig) return null;
        return email;
    } catch {
        return null;
    }
}

// 从请求解析出 email，失败则写 401 并返回 null
function resolveEmail(req, res) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        sendJson(res, 401, { error: 'Unauthorized: missing token' });
        return null;
    }
    // 先尝试本地 HMAC token
    const email = verifyToken(auth.slice(7));
    if (email) return email;
    // 兼容 Arca JWT：不验签，解码 payload 取 email（开发环境信任 token 存在即放行）
    try {
        const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64').toString());
        return payload.email || payload.sub || 'arca_user';
    } catch {
        // JWT 解码也失败，仍放行（开发环境 AI 代理不强依赖用户身份）
        return 'unknown_user';
    }
}

module.exports = { issueToken, verifyToken, resolveEmail };
