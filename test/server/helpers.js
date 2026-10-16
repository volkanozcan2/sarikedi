const fs = require('fs');
const os = require('os');
const path = require('path');
const {hashPassword} = require('../../server/src/auth');

const PASSWORD = 'gizli-sifre-123';
let cachedHash = null;

const testConfig = overrides => {
    if (!cachedHash) cachedHash = hashPassword(PASSWORD);
    return Object.assign({
        port: 0,
        host: '127.0.0.1',
        dataDir: '',
        projectsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sk-projects-')),
        staticDir: null,
        adminPasswordHash: cachedHash,
        sessionSecret: 'x'.repeat(40),
        secureCookies: false,
        trustProxy: false,
        builtinLessonsDir: null
    }, overrides);
};

module.exports = {PASSWORD, testConfig};
