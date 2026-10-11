// jest 21'in eski sandbox'ında olmayan, supertest bağımlılıklarının ihtiyaç duyduğu global'ler
const util = require('util');

if (typeof global.TextEncoder === 'undefined') global.TextEncoder = util.TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = util.TextDecoder;
