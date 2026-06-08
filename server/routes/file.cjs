/**
 * 文件上传 — 临时后端实现，对齐 Arca 存储范式。
 *
 * Arca 正式范式（arca.api: POST /file/tos_credential → GetTosUploadCredentialResp）：
 *   客户端拿 TOS 临时凭证 → 直传火山对象存储 → 业务数据只存 Media.url 短链。
 * 业务数据里【绝不存 base64】，避免角色 payload / PG 行无限膨胀。
 *
 * 当前阶段（未接 Arca）：图片落持久卷文件 .data/uploads/<email_hash>/<id>.<ext>，
 * 接口返回 { url } 短链。后续接专业后端时，本接口整体替换为
 * /file/tos_credential + 客户端直传 TOS，前端 service 入口与返回结构保持不变。
 *
 * 前端端点：
 *   POST /api/file/upload   body: { dataUrl: string, ext?: string } → { url, width?, height? }
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readBody, sendJson } = require('../utils/body.cjs');
const { resolveEmail } = require('../utils/auth.cjs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', '.data', 'uploads');

const EXT_BY_MIME = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

function emailDir(email) {
    const hash = crypto.createHash('sha1').update(email).digest('hex').slice(0, 16);
    return path.join(UPLOAD_DIR, hash);
}

// 解析 data:image/png;base64,xxxx → { buffer, ext }
function parseDataUrl(dataUrl) {
    const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl || '');
    if (!m) return null;
    const mime = (m[1] || 'image/png').toLowerCase();
    const isBase64 = !!m[2];
    const ext = EXT_BY_MIME[mime] || 'png';
    const buffer = isBase64
        ? Buffer.from(m[3], 'base64')
        : Buffer.from(decodeURIComponent(m[3]), 'utf-8');
    return { buffer, ext };
}

// POST /api/file/upload
async function handleUpload(req, res) {
    const email = resolveEmail(req, res);
    if (!email) return;
    try {
        const raw = await readBody(req);
        let parsed = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = {}; }
        const parsedData = parseDataUrl(parsed.dataUrl);
        if (!parsedData) return sendJson(res, 400, { error: '无效的图片数据' });
        if (parsedData.buffer.length > 8 * 1024 * 1024) {
            return sendJson(res, 413, { error: '图片过大（>8MB）' });
        }
        const dir = emailDir(email);
        fs.mkdirSync(dir, { recursive: true });
        const id = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const fileName = `${id}.${parsedData.ext}`;
        fs.writeFileSync(path.join(dir, fileName), parsedData.buffer);
        const hash = path.basename(dir);
        sendJson(res, 200, { url: `/uploads/${hash}/${fileName}` });
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
}

module.exports = { handleUpload, UPLOAD_DIR };
