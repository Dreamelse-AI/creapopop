/**
 * creapopop 创作页 — 后端入口（临时服务，联调时整体替换为正式后端）
 *
 * 结构（参考 newcreation）：
 *   server/config.cjs       env 常量（自解析 .env）
 *   server/utils/           body / auth / cors
 *   server/services/        store（PG + 本地 JSON 回退）
 *   server/routes/          auth / character / mock
 *   server/static.cjs       静态文件 + SPA 兜底
 *   server/index.cjs        主分发器
 *
 * 模型 key 仅存于后端 .env，前端不持有。
 */
const { PORT } = require('./server/config.cjs');
const { createServer } = require('./server/index.cjs');
const { initStore } = require('./server/services/store.cjs');

process.on('uncaughtException', (err) => {
    console.error(`[Uncaught] ${err.stack || err.message}`);
    setTimeout(() => process.exit(1), 1000);
});
process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
});

(async () => {
    await initStore();
    const server = createServer();
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\n  creapopop Server`);
        console.log(`  地址: http://0.0.0.0:${PORT}`);
        console.log('');
    });

    function shutdown(signal) {
        console.log(`\n[${signal}] 正在优雅关闭...`);
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 5000);
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
})();
