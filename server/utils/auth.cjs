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
    const email = verifyToken(auth.slice(7));
    if (!email) {
        sendJson(res, 401, { error: 'Unauthorized: invalid token' });
        return null;
    }
    return email;
}

module.exports = { issueToken, verifyToken, resolveEmail };
