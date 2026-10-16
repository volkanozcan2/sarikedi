/**
 * Kaydedilen ders adımları için otomatik Türkçe yönerge metni.
 * Öğretmen adımın metnini değiştirmişse (step.text) o kullanılır.
 */

// işlem kodu öneki → blok paletindeki kategori
const CATEGORIES = {
    motion: {id: 'motion', name: 'Hareket'},
    looks: {id: 'looks', name: 'Görünüm'},
    sound: {id: 'sound', name: 'Ses'},
    event: {id: 'events', name: 'Olaylar'},
    control: {id: 'control', name: 'Kontrol'},
    sensing: {id: 'sensing', name: 'Algılama'},
    operator: {id: 'operators', name: 'Operatörler'},
    data: {id: 'variables', name: 'Değişkenler'},
    procedures: {id: 'myBlocks', name: 'Bloklarım'},
    pen: {id: 'pen', name: 'Kalem'},
    music: {id: 'music', name: 'Müzik'},
    videoSensing: {id: 'videoSensing', name: 'Video Algılama'},
    text2speech: {id: 'text2speech', name: 'Yazıdan Konuşmaya'},
    translate: {id: 'translate', name: 'Çeviri'}
};

const TABS = {code: 'Kod', costumes: 'Kostümler', sounds: 'Sesler'};

const categoryOf = opcode => {
    const prefix = String(opcode || '').split('_')[0];
    return CATEGORIES[prefix] || {id: prefix, name: prefix};
};

const quote = text => `"${text}"`;

const placement = (attach, parentLabel, verb) => {
    if (!attach || attach.how === 'top' || !parentLabel) return 'kod alanına bırak';
    if (attach.how === 'next') return `${quote(parentLabel)} bloğunun altına ${verb}`;
    if (/^SUBSTACK/.test(attach.input || '')) return `${quote(parentLabel)} bloğunun içine yerleştir`;
    return `${quote(parentLabel)} bloğundaki boşluğa yerleştir`;
};

const changedValues = step => (step.changed || [])
    .map(key => (step.values && key in step.values ? step.values[key] : (step.fields || {})[key]))
    .filter(value => typeof value !== 'undefined' && value !== null);

const describers = {
    addBlock: step => {
        const sentence = `${categoryOf(step.opcode).name} kategorisinden ${quote(step.label)} bloğunu al, ` +
            `${placement(step.attach, step.parentLabel, 'tak')}.`;
        const values = changedValues(step);
        if (!values.length) return sentence;
        return `${sentence} ${values.length === 1 ? 'Değeri' : 'Değerleri'} ${values.join(', ')} yap.`;
    },
    moveBlock: step => `${quote(step.label)} bloğunu ${placement(step.attach, step.parentLabel, 'taşı')
        .replace('kod alanına bırak', 'kod alanında boş bir yere taşı')
        .replace('yerleştir', 'taşı')}.`,
    setValue: step => `${quote(step.label)} bloğundaki değeri ${step.value} yap.`,
    deleteBlock: step => `${quote(step.label)} bloğunu sil: bloğu sürükleyip blok paletinin üzerine bırak.`,
    addSprite: step => (step.any ? '"Kukla Seç" düğmesinden istediğin bir kuklayı ekle.' :
        `"Kukla Seç" düğmesinden ${quote(step.name)} kuklasını ekle.`),
    deleteSprite: step => `${quote(step.name)} kuklasını sil.`,
    addBackdrop: step => (step.any ? '"Dekor Seç" düğmesinden istediğin bir dekoru ekle.' :
        `"Dekor Seç" düğmesinden ${quote(step.name)} dekorunu ekle.`),
    addCostume: step => `Kostümler sekmesinde ${quote(step.target)} kuklasına ${quote(step.name)} kostümünü ekle.`,
    addSound: step => `Sesler sekmesinde ${quote(step.target)} kuklasına ${quote(step.name)} sesini ekle.`,
    selectSprite: step => (step.isStage ? 'Sağdaki "Sahne"yi seç.' :
        `Kukla listesinden ${quote(step.name)} kuklasını seç.`),
    addExtension: step => `Sol alttaki "Eklenti Ekle" düğmesinden ${quote(step.name)} eklentisini ekle.`,
    selectTab: step => `${quote(TABS[step.tab] || step.tab)} sekmesine geç.`,
    note: step => step.text,
    point: step => step.text
};

/**
 * @param {object} step - kaydedilen adım
 * @returns {string} öğrenciye gösterilecek yönerge
 */
const describeStep = step => {
    if (step.text && step.type !== 'note' && step.type !== 'point') return step.text;
    const describe = describers[step.type];
    return describe ? describe(step) : '';
};

export {describeStep, categoryOf};
