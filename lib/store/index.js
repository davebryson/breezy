'use strict';

const level = require('level');
const assert = require('bsert');
const msgpack = require('msgpack5')()
const Trie = require('merkle-patricia-tree/secure');

const KEY = "__breezy_state_root__";
const ENC_FORMAT = {
    keyEncoding: 'binary',
    valueEncoding: 'binary'
};

/**
 * StateStore backed by a patricia merkle tree
 */
class StateStore {
    /**
     * Create the store
     * @param {String} dbpath 
     * @constructor
     */
    constructor(dbpath) {
        this.dbpath = dbpath;
        this.cache = {}
        this.opened = false;
        this.chainstate = {
            height: 0,
            apphash: ''
        };
    }

    /**
     * Open the store and create the trie. Must be called after the constuctor
     * @returns {Promise}
     */
    async open() {
        this.opened = true;

        if (this.dbpath) {
            this.db = level(this.dbpath);
            this.trie = new Trie(this.db);
            try {
                let cs = await this.db.get(KEY, ENC_FORMAT);
                this.chainstate = msgpack.decode(cs);
                this.trie.root = Buffer.from(this.chainstate.apphash, 'hex');
            } catch (e) {
                // Key not found - first time
                await this.db.put(KEY, msgpack.encode(this.chainstate), ENC_FORMAT)
            }
        } else {
            // in-memory tree
            this.trie = new Trie();
        }
    }

    /**
     * @returns {String} the root hash of the trie
     */
    rootHash() {
        return this.trie.root.toString('hex')
    }

    /**
     * Set a key/value on the trie
     * @param {String | Buffer} key 
     * @param {String | Buffer} val 
     */
    set(key, val) {
        assert(this.opened, "StateStore not opened");
        this.cache[key] = {
            type: 'put',
            key: key,
            value: msgpack.encode(val)
        }
    }

    /**
     * Delete a key/value
     * @param {String | BUffer} key 
     */
    delete(key) {
        assert(this.opened, "StateStore not opened");
        this.cache[key] = {
            type: 'del',
            key: key,
            value: ''
        }
    }

    /**
     * @private 
     */
    _treeFetch(key) {
        return new Promise((resolve, reject) => {
            this.trie.get(key, function (err, data) {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    /**
     * Get a value by key. Try the cache first, then storage.
     * 
     * @param {String | Buffer} key 
     * @returns {Promise}
     */
    async get(key) {
        assert(this.opened, "StateStore not opened");
        if (this.cache[key] && this.cache[key].type === 'put') {
            return msgpack.decode(this.cache[key].value);
        } else {
            let v = await this._treeFetch(key);
            if (!v) return null
            return msgpack.decode(v);
        }
    }

    /**
     * @private
     */
    _docommit() {
        return new Promise((resolve, reject) => {
            this.trie.batch(Object.values(this.cache));
            this.trie.checkpoint();
            try {
                this.trie.commit(() => {
                    resolve(this.trie.root.toString('hex'));
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Commit the trie and update chainstate information
     * @returns {Promise}
     */
    async commit() {
        let newroot = await this._docommit()
        this.chainstate.apphash = newroot;
        this.chainstate.height += 1;

        if (this.dbpath) {
            let bits = msgpack.encode(this.chainstate);
            await this.db.put(KEY, bits, ENC_FORMAT);
            this.cache = {};
        }
        return newroot;
    }
}

module.exports = StateStore;