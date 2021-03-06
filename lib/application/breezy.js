'use strict';

const path = require('path');
const assert = require('bsert');
const {
    Message
} = require('../common');
const msgpack = require('msgpack5')();
const createABCIServer = require('abci');
const StateStore = require('../store');
const AccountManager = require('../services/accounts');
const tendermint = require('../node');

const {
    TxContext,
    QueryContext
} = require('./ctx');

const debug = require('debug')('breezy');

const PORT = 26658;

class Breezy {
    /**
     * Create a breezy app
     * @param {String} home - the homedir. Usually create by tendermint --init 
     * @param {*} mock - set to true to use an in-memory store
     */
    constructor(home, mock = false) {
        // Assumes you already ran tendermint --init
        //this.homedir = home;
        //this.store = null;

        if (mock) {
            // in-memory
            this.storedir = '';
        } else {
            tendermint.initSync(home);
            this.homedir = home;
            this.storedir = path.join(this.homedir, 'breezydb');
        }

        this.txhandlers = {};

        // Sets the accountmanager as the default checkTx handler
        this.checkTxHandler = AccountManager.authenticateAccount;
        this.initChainHandler = null;
        this.queryHandlers = {};
    }

    /**
     * init store. checked on initChain and info automatically
     * @private
     */
    async _initStore() {
        if (!this.store) {
            debug('loading state store...');
            // create the store
            this.store = new StateStore(this.storedir);
            await this.store.open();
        }
    }

    /**
     * optional call to explicitly load the store
     * @returns {Promise}
     */
    async init() {
        await this._initStore();
    }

    /**
     * ABCI Callback
     * @private
     * @param {RequestInitChain} request 
     */
    async initChain(request) {
        await this._initStore();
        if (this.initChainHandler) {
            let r = this.initChainHandler(this.store);
            if (r instanceof Promise) {
                await r;
            }
        }
        return {}
    }

    /**
     * ABCI Callback
     * @private
     * @param {RequestInfo} request 
     */
    async info(request) {
        await this._initStore();
        return {
            lastBlockHeight: this.store.chainstate.height,
            lastBlockAppHash: this.store.chainstate.apphash,
            version: '1.0',
            data: 'breezy'
        }
    }

    /**
     * Set a handler for initChain
     * @param {Function} handler - the handler should accept 1 param (the state store)
     */
    onInitChain(handler) {
        assert(typeof handler === 'function', 'Handler must be a function');
        this.initChainHandler = handler;
    }

    /**
     * Set a handler for checkTx 
     * @param {Function} handler - the handler should accept 1 param: a TxContext
     */
    onVerifyTx(handler) {
        assert(typeof handler === 'function', 'Handler must be a function');
        this.checkTxHandler = handler;
    }

    /**
     * Add a route and transaction handler to the application
     * @param {String} routeName maps a name to a handler and should match the 'route' sent in a message 
     * @param {Function} handler is a function the should accept 1 param: a TxContext
     */
    onTx(routeName, handler) {
        assert(routeName, 'Missing route name');
        assert(typeof handler === 'function', 'Handler must be a function');

        this.txhandlers[routeName] = handler
    }

    /**
     * Add a handler to respond to client queries
     * @param {String} queryName 
     * @param {Function} handler - the handler should except 2 params: key, QueryContext
     */
    onQuery(queryName, handler) {
        assert(queryName, 'Missing route name');
        assert(typeof handler === 'function', 'Handler must be a function');
        this.queryHandlers[queryName] = handler;
    }

    /**
     * ABCI Callback
     * @private
     * @param {RequestCheckTx} request 
     */
    async checkTx(request) {
        try {
            let msg = Message.decode(request.tx);
            // Will throw error if invalid
            msg.validate();

            if (!this.checkTxHandler) {
                return {
                    code: 0,
                    log: 'no checktx handler'
                }
            }

            let ctx = new TxContext(this.store, msg);
            return await this.checkTxHandler(ctx);

        } catch (e) {
            return {
                code: 1,
                log: e.message,
            }
        }
    }

    /**
     * ABCI Callback
     * @private
     * @param {RequestDeliverTx} request 
     */
    async deliverTx(request) {
        try {
            let msg = Message.decode(request.tx);
            assert(this.txhandlers[msg.route], `Handler not found for ${msg.route}`);

            let ctx = new TxContext(this.store, msg);
            return await this.txhandlers[msg.route](ctx);
        } catch (e) {
            return {
                code: 1,
                log: e.message,
            }
        }
    }

    /**
     * ABCI Callback
     * @private
     */
    async commit() {
        let newroot = await this.store.commit();
        debug(`commit root: ${newroot}`);
        return {
            data: newroot
        }
    }

    /**
     * ABCI Callback
     * @private
     * @param {RequestQuery} request 
     */
    async query(request) {
        try {
            // request.data is a buffer
            let key = msgpack.decode(request.data);

            if (!this.queryHandlers[request.path]) {
                return {
                    code: 1,
                    log: 'Not found'
                }
            }

            let ctx = new QueryContext(this.store);
            let result = await this.queryHandlers[request.path](key, ctx);

            if (result) return {
                code: 0,
                key: key,
                value: msgpack.encode(result)
            }

            return {
                code: 1,
                log: 'Not found'
            }
        } catch (e) {
            return {
                code: 1,
                log: e.message
            }
        }
    }

    /**
     * Start the ABCI server and application.
     */
    run() {
        createABCIServer(this).listen(PORT, () => {
            debug(`** breezy blockchain app listening on port ${PORT} **`);
        });
    }

    runWithNode() {
        //tendermint.initSync(this.homedir);

        createABCIServer(this).listen(PORT, () => {
            debug(`** breezy blockchain app listening on port ${PORT} **`);
        });

        // Start tendermint
        tendermint.node(this.homedir);
    }
}

module.exports = Breezy;