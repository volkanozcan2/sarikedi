/**
 * Yönetici şifresinin özetini üretir: `npm run hash-password -- "şifreniz"`
 * Çıktıyı ADMIN_PASSWORD_HASH ortam değişkenine koyun. Şifre argüman yerine
 * standart girdiden de okunabilir: `echo -n "şifreniz" | npm run hash-password`.
 */

const {hashPassword} = require('../src/auth');

const MIN_LENGTH = 10;

const output = password => {
    if (!password || password.length < MIN_LENGTH) {
        console.error(`Şifre en az ${MIN_LENGTH} karakter olmalı.`);
        process.exit(1);
    }
    console.log(hashPassword(password));
};

if (process.argv[2]) {
    output(process.argv[2]);
} else {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
        input += chunk;
    });
    process.stdin.on('end', () => output(input.replace(/\r?\n$/, '')));
}
