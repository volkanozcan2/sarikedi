import {importProjectFile} from '../../../src/lib/lessons/import-project';
import {block, num, toMap, literalInput} from './helpers/blocks-fixture';

const makeWorkerClass = (log, blocks) => class FakeVm {
    constructor () {
        const target = {
            isStage: false, isOriginal: true, getName: () => 'Cool Cat', comments: {x: 1},
            blocks: {
                _blocks: blocks,
                getScripts: () => Object.keys(blocks).filter(id => blocks[id].topLevel && !blocks[id].shadow),
                deleteBlock: id => {
                    log.push(`delete:${id}`);
                    delete blocks[id];
                }
            }
        };
        this.target = target;
        this.runtime = {targets: [target]};
    }
    attachStorage (storage) {
        log.push(`storage:${storage}`);
    }
    loadProject (data) {
        log.push(`load:${data.byteLength}`);
        return Promise.resolve();
    }
    saveProjectSb3 () {
        log.push('save');
        return Promise.resolve(new Blob(['zip']));
    }
    quit () {
        log.push('quit');
    }
};

const fileOf = bytes => ({name: 'Labirent Oyunu.sb3', arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes))});

const scriptBlocks = () => toMap([
    block('hat', 'event_whenflagclicked', {topLevel: true, next: 'move'}),
    block('move', 'motion_movesteps', {parent: 'hat', inputs: {STEPS: literalInput('STEPS', 'n10')}}),
    num('n10', '10', 'move')
]);

describe('importProjectFile', () => {
    test('adımları üretir, blokları siler, başlangıç projesi blob\'u ve başlığı döndürür', () => {
        const log = [];
        const Worker = makeWorkerClass(log, scriptBlocks());
        const vm = {constructor: Worker, runtime: {storage: 'depo'}};
        return importProjectFile(vm, fileOf(8), {chunkSize: 3, autoCheck: true}).then(result => {
            expect(result.steps.length).toBeGreaterThan(1);
            expect(result.steps[0].checks[0].sprite).toBe('Cool Cat');
            expect(result.blob).toBeInstanceOf(Blob);
            expect(result.title).toBe('Labirent Oyunu');
            expect(log).toContain('storage:depo');
            expect(log).toContain('load:8');
            expect(log).toContain('delete:hat');
            expect(log.indexOf('delete:hat')).toBeLessThan(log.indexOf('save'));
            expect(log[log.length - 1]).toBe('quit');
        });
    });

    test('hata olsa da VM kapatılır', () => {
        const log = [];
        const Worker = makeWorkerClass(log, {});
        const vm = {constructor: Worker, runtime: {storage: null}};
        return importProjectFile(vm, fileOf(4), {chunkSize: 3}).then(
            () => {
                throw new Error('hata beklenirdi');
            },
            error => {
                expect(error.message).toContain('blok yok');
                expect(log[log.length - 1]).toBe('quit');
            }
        );
    });
});
