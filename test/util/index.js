'use strict';

const assert = require('bsert');
const msgpack = require('msgpack5')();

class TxMockContext {
    constructor(store, msg) {
        assert(store instanceof Object, 'MockContext expects an obj for the store');
        this.store = store;
        this.msg = msg;
    }

    set(key, value) {
        this.store[key] = msgpack.encode(value);
    }

    del(key) {
        delete this.store(key)
    }

    async get(key) {
        if (this.store[key]) return msgpack.decode(this.store[key]);
        return null;
    }
}

exports = module.exports = TxMockContext;