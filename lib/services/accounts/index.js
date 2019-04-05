'use strict';

const assert = require('bsert');
/**
 * Account services for creating/viewing accounts and transfer funds.
 */

// prefixed account key for the state store
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
     * Transfer 'funds' from msg sender to recipient.
     * msg.data should be in the format:
     * {
     *   recipient: <address>,
     *   amount: <amount>
     * }
     * @param {TxContext} ctx 
     */
    async transfer(ctx) {
        // * Conditions
        let recipient = ctx.msg.data.recipient;
        let amount = ctx.msg.data.amount;
        assert(recipient, 'Msg is missing a transfer recipient');
        assert(amount, 'Msg is missing a transfer amount');

        let senderAccount = await this.get(ctx);
        let recipAccount = await ctx.get(accountKey(recipient));
        assert(recipAccount, 'Recipient account not found');

        assert(senderAccount.balance > amount, 'Sender: insufficient funds');

        // * Interactions
        // Debit / Credit
        senderAccount.balance -= amount;
        recipAccount.balance += amount;

        // * State changes
        ctx.set(accountKey(senderAccount.address), senderAccount);
        ctx.set(accountKey(recipAccount.address), recipAccount);
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
 * For use with initChain to preload some accounts
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
 * DeliverTx Handler. Exposes route/type: 
 * - create
 * - transfer
 */
exports.accountTxHandler = async function (ctx) {
    switch (ctx.msg.type) {
        case 'create':
            await accountManager.create(ctx);
            return {
                code: 0
            }
        case 'transfer':
            await accountManager.transfer(ctx);
            return {
                code: 0,
                log: 'transfer success'
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