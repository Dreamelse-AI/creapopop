// 环境变量常量。自解析 .env，不依赖 dotenv。
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!(key in process.env)) process.env[key] = value;
    }
}

loadEnv();

module.exports = {
    PORT: parseInt(process.env.PORT || '9527', 10),

    // 鉴权（mock）
    MOCK_PASSWORD: process.env.MOCK_PASSWORD || '123456',
    TOKEN_SECRET: process.env.TOKEN_SECRET || 'creapopop-dev-secret',

    // PG（未配置时回退到本地 JSON 文件存储）
    PG_CONFIG: process.env.PG_HOST
        ? {
              host: process.env.PG_HOST,
              port: parseInt(process.env.PG_PORT || '5432', 10),
              user: process.env.PG_USER,
              password: process.env.PG_PASSWORD,
              database: process.env.PG_DATABASE,
          }
        : null,

    // 三类模型代理（key 仅在后端）
    APIMART_API_BASE: process.env.APIMART_API_BASE || 'https://api.apimart.ai',
    APIMART_API_KEY: process.env.APIMART_API_KEY || '',
    ARK_TARGET: process.env.ARK_TARGET || '',
    SHARED_ARK_API_KEY: process.env.SHARED_ARK_API_KEY || '',
    SHARED_OR_API_KEY: process.env.SHARED_OR_API_KEY || '',
    SHARED_OR_MODEL: process.env.SHARED_OR_MODEL || 'google/gemini-2.5-flash',

    // Gemini（聊天试聊）+ TTS
    SA_KEY_PATH: process.env.GOOGLE_APPLICATION_CREDENTIALS || './secrets/service-account.json',
    GOOGLE_API_PROXY: process.env.NLB_PROXY_URL || '',
    AIGC_TARGET: process.env.AIGC_TARGET || '',
    MAX_BODY_SIZE: 10 * 1024 * 1024,

    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
};
