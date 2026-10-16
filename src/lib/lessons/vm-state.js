/**
 * Ders kaydedicinin okuduğu proje durumu (kuklalar, düzenlenen kukla, açık sekme) VM'den okunur.
 */

const TAB_NAMES = ['code', 'costumes', 'sounds'];

/**
 * @param {VM} vm - sanal makine
 * @param {number} activeTabIndex - editördeki açık sekme (0 kod, 1 kostümler, 2 sesler)
 * @returns {object} kaydedici durumu
 */
const readLessonState = (vm, activeTabIndex) => ({
    targets: vm.runtime.targets
        .filter(target => target.isOriginal)
        .map(target => ({
            id: target.id,
            name: target.getName(),
            isStage: target.isStage,
            blocks: target.blocks._blocks,
            costumes: target.getCostumes().map(costume => costume.name),
            sounds: target.getSounds().map(sound => sound.name)
        })),
    // eklenen eklentiler (Kalem, Müzik...): {id, name}
    extensions: (vm.runtime._blockInfo || []).map(info => ({id: info.id, name: info.name})),
    editingTarget: vm.editingTarget ? vm.editingTarget.id : null,
    tab: TAB_NAMES[activeTabIndex] || 'code'
});

const STATEMENT_INPUT = 3; // Blockly.NEXT_STATEMENT: C bloklarının ağzı

/**
 * Bloğun kendi yazısı: alanları ve değer girdilerindeki blokların yazısı. C bloklarının içindekiler katılmaz.
 * @param {object} block - Blockly bloğu
 * @returns {string} yazı
 */
const blockText = block => {
    const parts = [];
    block.inputList.forEach(input => {
        input.fieldRow.forEach(field => {
            // resim alanları (bayrak, döngü oku) yazıya alt metniyle girer; bayrak dışındakiler atlanır
            if (field.src_) {
                if (/flag/.test(field.src_)) parts.push('yeşil bayrak');
                return;
            }
            const text = field.getText();
            if (text) parts.push(text);
        });
        if (!input.connection || input.type === STATEMENT_INPUT) return;
        const child = input.connection.targetBlock();
        parts.push(child ? blockText(child) : '( )');
    });
    return parts.join(' ').replace(/\s+/g, ' ')
        .replace('yeşil bayrak e ', 'yeşil bayrağa ')
        .trim();
};

/**
 * Bloğun ekrandaki yazısı ("10 adım git"); yalnızca düzenlenen kuklanın blokları için bulunabilir.
 * @param {object} workspace - ScratchBlocks ana çalışma alanı
 * @returns {function} (targetId, blockId) → yazı ya da null
 */
const workspaceLabeler = workspace => (targetId, blockId) => {
    const block = workspace && workspace.getBlockById(blockId);
    if (!block) return null;
    return blockText(block) || null;
};

export {readLessonState, workspaceLabeler, blockText, TAB_NAMES};
