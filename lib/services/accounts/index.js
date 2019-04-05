'use strict';

const assert = require('bsert');
/**
 * Account handler
 */

// prefixed account key
function accountKey(address) {
    return `accounts/basic/${address}`
}

let accountManager = {
    /**
     * Should return the msg senders account
     * @param {TxContext} ctx - the application context 
     * @returns {Account} the user's account
     */
    async get(ctx) {
        let sender = ctx.msg.sender;
        assert(sender, 'Missing sender address in msg');

        let senderAcct = await ctx.get(accountKey(sender));
        assert(senderAcct, 'Sender account not found');
        return senderAcct;
    },

    /**
     * Create an account for another user.  Contract: The sender must have an account to 
     * establish an account for someone else.
     * @param {TxContext} ctx 
     */
    async create(ctx) {
        // Will throw error if sender acct doesn't exist
        await this.get(ctx);
        assert(ctx.msg.data.address, "Msg missing account address");
        assert(ctx.msg.data.pubkey, "Msg missing public key");

        let acct = {
            address: ctx.msg.data.address,
            publicKey: ctx.msg.data.pubkey,
            name: ctx.msg.data.name || '',
            balance: 10000
        }
        ctx.set(accountKey(acct.address), acct);
    }
}

/**
 * For use in initChain to preload some accounts
 */
exports.createGenesisAccount = function (db, acct) {
    assert(acct.address, "Missing account address");
    assert(acct.publicKey, "Missing account publicKey");
    let newacct = {
        address: acct.address,
        publicKey: acct.publicKey,
        name: acct.name || '',
        balance: 10000
    }
    db.set(accountKey(newacct.address), newacct);
}

/**
 * DeliverTx Handler. Expose 1 route/type: create
 */
exports.accountTxHandler = async function (ctx) {
    switch (msg.type) {
        case 'create':
            await accountManager.create(ctx);
            return {
                code: 0
            }
        default:
            throw Error("No matching route type")
    }
}

/**
 * CheckTx Handler to authenticate a msg sender
 */
exports.authenticateAccount = async function (ctx) {
    let account = await accountManager.get(ctx);
    //console.log(`got account ${JSON.stringify(account)}`);
    let isok = ctx.msg.verify(account.publicKey);
    assert(isok, "Bad signature");
    return {
        code: 0,
        log: "ok"
    }
}

/**
 * Query Handler to return an account for a given address (key)
 */
exports.accountQuery = async function (key, ctx) {
    let senderAcct = await ctx.get(accountKey(key));
    assert(senderAcct, 'Sender account not found');
    return senderAcct;
}