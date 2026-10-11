const fs = require('fs');
const os = require('os');
const path = require('path');
const {hashPassword} = require('../../server/src/auth');

const PASSWORD = 'gizli-sifre-123';
let cachedHash = null;

const validLesson = overrides => Object.assign({
    id: 'ilk-ders',
    title: 'İlk ders',
    description: 'Açıklama',
    level: 'baslangic',
    cover: null,
    order: 0,
    published: true,
    startProject: null,
    steps: [{text: 'Merhaba', media: null, hint: null, checks: [], guide: []}]
}, overrides);

const testConfig = overrides => {
    if (!cachedHash) cachedHash = hashPassword(PASSWORD);
    return Object.assign({
        port: 0,
        host: '127.0.0.1',
        dataDir: '',
        uploadsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sk-uploads-')),
        staticDir: null,
        seedDir: '',
        adminPasswordHash: cachedHash,
        sessionSecret: 'x'.repeat(40),
        secureCookies: false,
        trustProxy: false
    }, overrides);
};

module.exports = {PASSWORD, validLesson, testConfig};
