// 角色存储。PG 已配置则用 PG，否则回退本地 JSON 文件（保证本地能跑起来）。
// 数据按 owner_email 隔离。表结构见 docs/SPEC.md。
const fs = require('fs');
const path = require('path');
const { PG_CONFIG } = require('../config.cjs');

let pgPool = null;
let useFile = false;
const FILE_PATH = path.join(__dirname, '..', '..', '.data', 'characters.json');

async function initStore() {
    if (PG_CONFIG) {
        const { Pool } = require('pg');
        pgPool = new Pool(PG_CONFIG);
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS creapopop_characters (
                id          TEXT PRIMARY KEY,
                owner_email TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'draft',
                name        TEXT NOT NULL DEFAULT '',
                payload     JSONB NOT NULL DEFAULT '{}',
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                updated_at  TIMESTAMPTZ DEFAULT NOW(),
                deleted_at  TIMESTAMPTZ
            )
        `);
        await pgPool.query(`
            CREATE INDEX IF NOT EXISTS idx_creapopop_owner_status
            ON creapopop_characters(owner_email, status, updated_at DESC)
            WHERE deleted_at IS NULL
        `);
        console.log('[Store] PG 模式就绪');
    } else {
        useFile = true;
        const dir = path.dirname(FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, '[]');
        console.log('[Store] 本地 JSON 文件模式（未配置 PG）:', FILE_PATH);
    }
}

function readFile() {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
}
function writeFile(rows) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(rows, null, 2));
}

async function saveCharacter(email, character) {
    const now = Date.now();
    const record = { ...character, ownerEmail: email, updatedAt: now };
    if (useFile) {
        const rows = readFile();
        const idx = rows.findIndex((r) => r.id === record.id && r.ownerEmail === email);
        if (idx >= 0) record.createdAt = rows[idx].createdAt;
        else record.createdAt = now;
        if (idx >= 0) rows[idx] = record;
        else rows.push(record);
        writeFile(rows);
        return record;
    }
    await pgPool.query(
        `INSERT INTO creapopop_characters (id, owner_email, status, name, payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status, name = EXCLUDED.name,
            payload = EXCLUDED.payload, updated_at = NOW(), deleted_at = NULL
         WHERE creapopop_characters.owner_email = EXCLUDED.owner_email`,
        [record.id, email, record.status || 'draft', record.name || '', JSON.stringify(record)]
    );
    return record;
}

async function listCharacters(email, status) {
    if (useFile) {
        return readFile()
            .filter((r) => r.ownerEmail === email && !r.deletedAt && (!status || r.status === status))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    let q = 'SELECT payload FROM creapopop_characters WHERE owner_email = $1 AND deleted_at IS NULL';
    const params = [email];
    if (status) {
        params.push(status);
        q += ` AND status = $${params.length}`;
    }
    q += ' ORDER BY updated_at DESC LIMIT 300';
    const result = await pgPool.query(q, params);
    return result.rows.map((r) => r.payload);
}

async function getCharacter(email, id) {
    if (useFile) {
        return readFile().find((r) => r.id === id && r.ownerEmail === email && !r.deletedAt) || null;
    }
    const result = await pgPool.query(
        'SELECT payload FROM creapopop_characters WHERE id = $1 AND owner_email = $2 AND deleted_at IS NULL LIMIT 1',
        [id, email]
    );
    return result.rows[0]?.payload || null;
}

async function deleteCharacter(email, id) {
    if (useFile) {
        const rows = readFile();
        const row = rows.find((r) => r.id === id && r.ownerEmail === email);
        if (row) row.deletedAt = Date.now();
        writeFile(rows);
        return;
    }
    await pgPool.query(
        'UPDATE creapopop_characters SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND owner_email = $2',
        [id, email]
    );
}

module.exports = { initStore, saveCharacter, listCharacters, getCharacter, deleteCharacter };
