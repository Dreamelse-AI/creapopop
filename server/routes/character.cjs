const url = require('url');
const crypto = require('crypto');
const { readBody, sendJson } = require('../utils/body.cjs');
const { resolveEmail } = require('../utils/auth.cjs');
const store = require('../services/store.cjs');

// POST /api/character/save
async function handleSave(req, res) {
    const email = resolveEmail(req, res);
    if (!email) return;
    try {
        const body = await readBody(req);
        const character = JSON.parse(body);
        if (!character.id) {
            character.id = `char_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        }
        const saved = await store.saveCharacter(email, character);
        sendJson(res, 200, { success: true, character: saved });
    } catch (e) {
        console.error('[Character Save]', e.message);
        sendJson(res, 500, { error: e.message });
    }
}

// GET /api/character/list?status=
async function handleList(req, res) {
    const email = resolveEmail(req, res);
    if (!email) return;
    try {
        const status = url.parse(req.url, true).query.status || '';
        const characters = await store.listCharacters(email, status);
        sendJson(res, 200, { success: true, characters });
    } catch (e) {
        console.error('[Character List]', e.message);
        sendJson(res, 500, { error: e.message });
    }
}

// GET /api/character/get?id=
async function handleGet(req, res) {
    const email = resolveEmail(req, res);
    if (!email) return;
    try {
        const id = url.parse(req.url, true).query.id;
        if (!id) return sendJson(res, 400, { error: 'Missing id' });
        const character = await store.getCharacter(email, id);
        sendJson(res, 200, { success: true, character });
    } catch (e) {
        console.error('[Character Get]', e.message);
        sendJson(res, 500, { error: e.message });
    }
}

// POST /api/character/delete { id }
async function handleDelete(req, res) {
    const email = resolveEmail(req, res);
    if (!email) return;
    try {
        const { id } = JSON.parse(await readBody(req));
        if (!id) return sendJson(res, 400, { error: 'Missing id' });
        await store.deleteCharacter(email, id);
        sendJson(res, 200, { success: true });
    } catch (e) {
        console.error('[Character Delete]', e.message);
        sendJson(res, 500, { error: e.message });
    }
}

// POST /api/character/publish { id } — mock 审核即过
async function handlePublish(req, res) {
    const email = resolveEmail(req, res);
    if (!email) return;
    try {
        const { id } = JSON.parse(await readBody(req));
        if (!id) return sendJson(res, 400, { error: 'Missing id' });
        const character = await store.getCharacter(email, id);
        if (!character) return sendJson(res, 404, { error: 'Not found' });
        character.status = 'published';
        const saved = await store.saveCharacter(email, character);
        sendJson(res, 200, { success: true, character: saved });
    } catch (e) {
        console.error('[Character Publish]', e.message);
        sendJson(res, 500, { error: e.message });
    }
}

module.exports = { handleSave, handleList, handleGet, handleDelete, handlePublish };
