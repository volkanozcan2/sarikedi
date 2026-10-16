import fs from 'fs';
import path from 'path';
import trOverrides from '../../../src/lib/tr-overrides';
import {localesInitialState} from '../../../src/reducers/locales';

// editor-msgs testlerde sahte modülle değiştirildiği için gerçek dosya metni okunur
const realMessages = fs.readFileSync(
    path.join(__dirname, '../../../node_modules/scratch-l10n/locales/editor-msgs.js'), 'utf8'
);

// scratch-l10n'de hiç bulunmayan ama kodda kullanılan kimlikler
const CODE_ONLY = ['gui.connection.auto-scanning.pressbutton'];

describe('Türkçe çeviri düzeltmeleri', () => {
    test('her anahtar gerçek bir mesaj kimliğidir (yazım hatası yok)', () => {
        Object.keys(trOverrides).forEach(key => {
            const known = CODE_ONLY.indexOf(key) >= 0 || realMessages.includes(`"${key}":`);
            expect(known).toBe(true);
        });
    });

    test('başlangıç Türkçe mesajları silme onayını Türkçe verir', () => {
        const messages = localesInitialState.messages;
        expect(messages['gui.gui.shouldDeleteSprite']).toBe('Bu kuklayı silmek istediğine emin misin?');
        expect(messages['gui.gui.confirm']).toBe('evet');
        expect(messages['gui.gui.cancel']).toBe('hayır');
    });

    test('değişken yer tutucuları korunur', () => {
        expect(trOverrides['gui.connection.updatePeripheral.progress']).toContain('{progressPercentage}');
        expect(trOverrides['gui.connection.updatePeripheral.microBitConnect']).toContain('{extensionName}');
    });
});
