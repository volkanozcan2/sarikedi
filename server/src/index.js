/**
 * Sunucuyu başlatır. `node server/src/index.js` ile çalıştırılır; testler `start`'ı çağırır.
 */

const fs = require('fs');
const path = require('path');
const {loadConfig} = require('./config');
const {openStore} = require('./db');
const {createApp} = require('./app');

const start = ({env = process.env, log = console.log} = {}) => new Promise((resolve, reject) => {
    let config;
    try {
        config = loadConfig(env);
    } catch (error) {
        reject(error);
        return;
    }
    fs.mkdirSync(config.projectsDir, {recursive: true});
    const store = openStore(path.join(config.dataDir, 'sarikedi.db'));

    if (!config.adminPasswordHash) log('UYARI: ADMIN_PASSWORD_HASH tanımlı değil, yönetici girişi kapalı');

    const app = createApp({store, config});
    const server = app.listen(config.port, config.host, () => {
        log(`Dinleniyor: http://${config.host}:${server.address().port}`);
        resolve({
            server: server,
            store: store,
            config: config,
            close: () => new Promise(done => {
                server.close(() => {
                    store.close();
                    done();
                });
            })
        });
    });
    server.on('error', error => {
        store.close();
        reject(error);
    });
});

if (require.main === module) {
    start().then(running => {
        const shutdown = () => running.close().then(() => process.exit(0));
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    })
        .catch(error => {
            console.error(error.message);
            process.exit(1);
        });
}

module.exports = {
    start
};
