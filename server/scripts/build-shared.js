/**
 * GUI'deki ders doğrulama kodunu (src/lib/lessons) sunucu için CommonJS'e derler.
 * `--check`: dosyaları yazmaz, güncel olup olmadığını denetler (çıkış kodu 1 = eski).
 */

// browserslist'in "veri eski" uyarısı çıktıyı kirletmesin
process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'lib');
const FILES = ['block-pattern', 'schema', 'outcome', 'check-runner'];

const transform = name => {
    const source = path.join(ROOT, 'src', 'lib', 'lessons', `${name}.js`);
    const result = babel.transformFileSync(source, {
        babelrc: false,
        configFile: false,
        presets: [[require.resolve('@babel/preset-env'), {targets: {node: '20'}, modules: 'commonjs'}]]
    });
    return `// ÜRETİLDİ: server/scripts/build-shared.js, kaynak: src/lib/lessons/${name}.js. Elle düzenleme.\n` +
        `${result.code}\n`;
};

const check = process.argv.indexOf('--check') !== -1;
let stale = false;

FILES.forEach(name => {
    const target = path.join(OUT_DIR, `${name}.js`);
    const code = transform(name);
    if (check) {
        const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
        if (current !== code) {
            console.error(`${target} eski; "npm run build:shared" çalıştır`);
            stale = true;
        }
    } else {
        fs.mkdirSync(OUT_DIR, {recursive: true});
        fs.writeFileSync(target, code);
        console.log(`yazıldı: ${target}`);
    }
});

if (stale) process.exit(1);
