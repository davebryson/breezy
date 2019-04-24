'use strict';

const assert = require('bsert');
const EventEmitter = require('events');
const StateStore = require('../store');
const AccountManager = require('../services/accounts');
const {
    TxContext,
    QueryContext
} = require('../application/ctx');

/**
 * What is this?
 * 
 * It's a simple simulator to test handlers and logic w/o a
 * tendermint node.  It can be used for testing or in-browser
 * for UX demos. It's uses an in-memory version of the state store.
 * 
 * 
 * Usage:
 * let sim = new TendermintSimulator();
 * 
 * // Load with some test accounts.
 * await sim.init([accounts]);
 * 
 * // add your handlers
 * sim.onTx(...)
 * 
 * // Run txs
 * run.sendTx(msg) 
 */
class TendermintSimulator extends EventEmitter {
    constructor() {
        super();
        this.height = 0;
        this.txhandlers = {};
        this.queryHandlers = {};
    }

    /**
     * Load the store with accounts
     * @param {Array} accts 
     */
    async init(accts) {
        this.store = new StateStore();
        await this.store.open();

        this.onTx('account', AccountManager.accountTxHandler);
        this.onQuery('accountview', AccountManager.accountQuery);

        // Load accounts
        accts.forEach(acct => {
            AccountManager.createGenesisAccount(this.store, acct);
        });

        await this._commitBlock('genesis');
        this.emit('ready');
    }

    // Internal sims commiting a block
    async _commitBlock(msg) {
        let newroot = await this.store.commit();
        let newBlock = {
            block: this.height,
            txs: msg,
            stateRoot: newroot
        };
        this.height += 1;
        this.emit('block', newBlock);
    }

    // Add a Tx handler
    onTx(routeName, handler) {
        assert(routeName, 'Missing route name');
        assert(typeof handler === 'function', 'Handler must be a function');
        this.txhandlers[routeName] = handler
    }

    // Add a query handler
    onQuery(queryName, handler) {
        assert(queryName, 'Missing route name');
        assert(typeof handler === 'function', 'Handler must be a function');
        this.queryHandlers[queryName] = handler;
    }

    // Expects a signed breezy message...
    // BUT the msg is NOT encoded
    /**
     * Run a tx (like deliverTx)
     * @param {Message} msg - BUT msg must be signed and NOT 
     * encoded. 
     */
    async runTx(msg) {
        try {
            assert(this.txhandlers[msg.route], `Handler not found for ${msg.route}`);
            msg.validate();
            // Call the handler
            let ctx = new TxContext(this.store, msg);
            let result = await this.txhandlers[msg.route](ctx);
            // Commit the transaction
            await this._commitBlock(msg);
            return result
        } catch (e) {
            return {
                code: 1,
                log: e.message,
            }
        }
    }

    /**
     * Sim a query request against a query handler
     * @param {String} path 
     * @param {String | Object} key 
     */
    async query(path, key) {
        try {
            if (!this.queryHandlers[path]) {
                return {
                    code: 1,
                    log: 'Query path not found'
                }
            }
            let ctx = new QueryContext(this.store);
            let result = await this.queryHandlers[path](key, ctx);

            assert(result, 'Result not returned from query handler');

            return {
                code: 0,
                key: key,
                value: result
            }
        } catch (e) {
            return {
                code: 1,
                log: e.message
            }
        }
    }
}

module.exports = TendermintSimulator;