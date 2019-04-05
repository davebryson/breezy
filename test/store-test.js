'use strict';

const assert = require('bsert');
const StateStore = require('../lib/store/index');

async function testit() {
    let store = new StateStore();
    await store.open();

    let emptyRoot = '56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421';
    assert.equal(emptyRoot, store.rootHash())

    store.set('one143f', {
        one: 1
    });

    // From cache
    let resulta = await store.get('one143f');
    assert.equal(1, resulta.one);

    let root1 = await store.commit();
    assert.notEqual(emptyRoot, root1);

    // From store
    let result = await store.get('one143f');
    assert.equal(1, result.one);

    store.delete('one143f');
    await store.commit();

    let r1 = await store.get('one143f');
    assert.equal(null, r1);

    store.set('one', '1');
    store.set('two', '2');
    store.set('three', '3');

    let root2 = await store.commit();
    assert.notEqual(root1, root2);
}

describe('store', () => {
    it('should set/delete/get/commit', async () => {
        await testit();
    });
});