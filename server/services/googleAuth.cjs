// Gemini 鉴权（service account → access token）。复用 newcreation googleAuth。
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const { SA_KEY_PATH, GOOGLE_API_PROXY } = require('../config.cjs');

let _saCredentials = null;
let _cachedToken = null;
let _tokenExpiresAt = 0;

let _proxyAgent = null;
if (GOOGLE_API_PROXY) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    _proxyAgent = new HttpsProxyAgent(GOOGLE_API_PROXY);
    console.log(`[Gemini] 使用 NLB 代理: ${GOOGLE_API_PROXY}`);
}

const _googleAuth = new GoogleAuth({
    scopes: [
        'https://www.googleapis.com/auth/generative-language',
        'https://www.googleapis.com/auth/cloud-platform',
    ],
});

function loadServiceAccount() {
    try {
        _saCredentials = JSON.parse(fs.readFileSync(SA_KEY_PATH, 'utf8'));
        const email = _saCredentials.client_email || '';
        console.log(`[Gemini] Service Account 已加载: ${email.slice(0, 6)}***`);
    } catch (e) {
        console.warn(`[Gemini] Service Account 未找到: ${e.message}`);
    }
}

function getServiceAccount() {
    return _saCredentials;
}

function getProxyAgent() {
    return _proxyAgent;
}

async function getGeminiAccessToken() {
    const now = Date.now();
    if (_cachedToken && now < _tokenExpiresAt - 60000) return _cachedToken;
    if (!_saCredentials) return null;
    if (GOOGLE_API_PROXY) process.env.HTTPS_PROXY = GOOGLE_API_PROXY;
    try {
        const client = await _googleAuth.getClient();
        const res = await client.getAccessToken();
        _cachedToken = res.token || res;
        _tokenExpiresAt = now + 3500 * 1000;
        return _cachedToken;
    } catch (e) {
        console.warn('[Gemini] token 获取失败:', e.message);
        return null;
    } finally {
        if (GOOGLE_API_PROXY) delete process.env.HTTPS_PROXY;
    }
}

module.exports = { loadServiceAccount, getServiceAccount, getProxyAgent, getGeminiAccessToken };
