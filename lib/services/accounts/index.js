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
     * Get an account for a given address
     * 
     * @param {Hex} address 
     * @param {TxContext} ctx 
     * @returns {Account} an account
     */
    async getAccount(address, ctx) {
        let senderAcct = await ctx.get(accountKey(address));
        assert(senderAcct, 'Account: not found');
        return senderAcct;
    },

    /**
     * Should return the msg senders account
     * Expects a msg of: 
     * {
     *   sender: address
     * }
     * 
     * @param {TxContext} ctx - the application context 
     * @returns {Account} the user's account
     */
    async get(ctx) {
        // this is automatically checked in checkTx
        //assert(ctx.msg.sender, 'Account: missing msg.sender');
        return await this.getAccount(ctx.msg.sender, ctx);
    },

    /**
     * Transfer funds between accounts
     * @param {Hex} payer address 
     * @param {Hex} payee address 
     * @param {Number} amount to transfer 
     * @param {TxContext} ctx 
     */
    async transfer(payer, payee, amount, ctx) {
        let payerAccount = await this.getAccount(payer, ctx);
        let payeeAccount = await this.getAccount(payee, ctx);

        let amt = parseFloat(amount);
        assert(payerAccount.balance >= amt, 'Account: insufficient funds');

        // Debit / Credit
        payerAccount.balance -= amt;
        payeeAccount.balance += amt;

        // * State changes
        ctx.set(accountKey(payer), payerAccount);
        ctx.set(accountKey(payee), payeeAccount);
    },

    /**
     * Transfer 'funds' from msg sender to recipient.
     * msg.data should be in the format:
     * {
     *   sender: address
     *   data: {
     *      recipient: address,
     *      amount: amount
     *   }
     * }
     * @param {TxContext} ctx 
     */
    async txTransfer(ctx) {
        let sender = ctx.msg.sender;
        let recipient = ctx.msg.data.recipient;
        let amount = ctx.msg.data.amount;

        //assert(sender, 'Account: missing msg.sender');
        assert(recipient, 'Account: missing msg.data.recipient');
        assert(amount, 'Account: missing msg.data.amount');

        await this.transfer(sender, recipient, amount, ctx);
    },

    /**
     * Create an account for another user.  Contract: The sender must have an account to 
     * establish an account for someone else.
     * Expects a msg of:
     * {
     *    sender: address
     *    data: {
     *      address: address of new account
     *      pubkey: publickey of new account
     *    }
     * }
     * @param {TxContext} ctx 
     */
    async create(ctx) {
        // check the sender account exists
        await this.get(ctx);

        assert(ctx.msg.data.address, "Account: missing msg.data.address");
        assert(ctx.msg.data.pubkey, "Account: missing msg.data.pubkey");

        let acct = {
            address: ctx.msg.data.address,
            publicKey: ctx.msg.data.pubkey,
            name: ctx.msg.data.name || '',
            balance: 10000
        }
        ctx.set(accountKey(acct.address), acct);
    }
};

/**
 * Transfer funds between parties
 */
exports.transferFunds = async function (payer, payee, amount, ctx) {
    accountManager.transfer(payer, payee, amount, ctx);
}

/**
 * For use with initChain to preload accounts
 * Expects the initChain db and and account.  Usually used in a loop
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
            await accountManager.txTransfer(ctx);
            return {
                code: 0,
                log: 'transfer success'
            }
        default:
            throw Error("No matching route type")
    }
}

/**
 * CheckTx Handler to authenticate a msg sender.
 * Expects msg to include:
 * {
 *    sender: address
 * }
 */
exports.authenticateAccount = async function (ctx) {
    let account = await accountManager.get(ctx);
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
    let senderAcct = await accountManager.getAccount(key, ctx)
    // was await ctx.get(accountKey(key));
    assert(senderAcct, 'Sender account not found');
    return senderAcct;
}