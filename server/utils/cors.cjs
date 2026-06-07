const { ALLOWED_ORIGINS } = require('../config.cjs');

// 开发期允许本地跨域；生产由同源/反代处理
function applyCors(req, res) {
    const origin = req.headers.origin;
    const allowed = ALLOWED_ORIGINS ? ALLOWED_ORIGINS.split(',') : [];
    if (origin && (allowed.length === 0 || allowed.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { applyCors };
