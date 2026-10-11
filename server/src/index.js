/**
 * Sunucuyu başlatır. `node server/src/index.js` ile çalıştırılır; testler `start`'ı çağırır.
 */

const fs = require('fs');
const path = require('path');
const {loadConfig} = require('./config');
const {openStore} = require('./db');
const {createApp} = require('./app');

// seed/assets/ içindeki dosyalar (örn. ders başlangıç projeleri) yükleme klasörüne kopyalanır;
// var olan dosyaların üzerine yazılmaz.
const installSeedAssets = (seedDir, uploadsDir) => {
    const assetsDir = path.join(seedDir, 'assets');
    let names = [];
    try {
        names = fs.readdirSync(assetsDir);
    } catch (e) {
        return 0;
    }
    let copied = 0;
    names.forEach(name => {
        const target = path.join(uploadsDir, name);
        if (/^[A-Za-z0-9._-]+$/.test(name) && !fs.existsSync(target)) {
            fs.copyFileSync(path.join(assetsDir, name), target);
            copied += 1;
        }
    });
    return copied;
};

const start = ({env = process.env, log = console.log} = {}) => new Promise((resolve, reject) => {
    let config;
    try {
        config = loadConfig(env);
    } catch (error) {
        reject(error);
        return;
    }
    fs.mkdirSync(config.uploadsDir, {recursive: true});
    installSeedAssets(config.seedDir, config.uploadsDir);
    const store = openStore(path.join(config.dataDir, 'sarikedi.db'));

    const seeded = store.seedFromDir(config.seedDir);
    log(`Tohum dersler: ${seeded.added.length} ders eklendi, ${seeded.skipped.length} atlandı`);
    seeded.invalid.forEach(item => log(`Tohum dosyası geçersiz: ${item.file}: ${item.errors.join('; ')}`));
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
