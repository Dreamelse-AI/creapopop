/**
 * 一次性迁移：把 characters.json 里内联的 base64 dataURL 图片抽成文件，
 * payload 中改存 /uploads/<hash>/<file> 短 url。
 *
 * 处理范围：每个角色的 images[].url（dataURL）。AI 生图本就是 http url，跳过。
 * 幂等：已是 /uploads/ 或 http(s) 的 url 不动；重复执行安全。
 *
 * 用法（容器内）：node server/scripts/migrate-base64-images.cjs
 * 会就地重写 .data/characters.json，并把图片写入 .data/uploads/<emailHash>/。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', '.data');
const FILE_PATH = path.join(DATA_DIR, 'characters.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const EXT_BY_MIME = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

function emailDirHash(email) {
    return crypto.createHash('sha1').update(email || 'unknown').digest('hex').slice(0, 16);
}

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

function main() {
    if (!fs.existsSync(FILE_PATH)) {
        console.log('[migrate] 无 characters.json，跳过');
        return;
    }
    const rows = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
    let migrated = 0;
    let kept = 0;

    for (const row of rows) {
        const hash = emailDirHash(row.ownerEmail);
        const dir = path.join(UPLOAD_DIR, hash);
        if (!Array.isArray(row.images)) continue;
        for (const img of row.images) {
            if (typeof img.url !== 'string' || !img.url.startsWith('data:')) {
                kept++;
                continue;
            }
            const parsed = parseDataUrl(img.url);
            if (!parsed) { kept++; continue; }
            fs.mkdirSync(dir, { recursive: true });
            const id = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            const fileName = `${id}.${parsed.ext}`;
            fs.writeFileSync(path.join(dir, fileName), parsed.buffer);
            img.url = `/uploads/${hash}/${fileName}`;
            migrated++;
        }
    }

    if (migrated > 0) {
        fs.writeFileSync(FILE_PATH, JSON.stringify(rows, null, 2));
    }
    const sizeMB = (fs.statSync(FILE_PATH).size / 1024 / 1024).toFixed(2);
    console.log(`[migrate] 完成：抽离 ${migrated} 张 base64 图，保留 ${kept} 个已是 url 的图。characters.json 现 ${sizeMB}MB`);
}

main();
