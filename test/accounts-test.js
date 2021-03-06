'use strict';

const assert = require('bsert');
const Account = require('../index').accounts;
const Message = require('../index').Message;
const tstaccounts = require('./utils').testAccounts;
const StateStore = require('../index').store;

const TxMockContext = require('../lib/application/ctx').TxContext;

async function loadAccounts(ctx) {
    Object.values(tstaccounts).forEach((a) => {
        Account.createGenesisAccount(ctx, a);
    });
    await ctx.store.commit();
}

describe('accounts', () => {
    it('should manipulate accounts', async () => {
        let store = new StateStore();
        store.open();

        await loadAccounts(new TxMockContext(store));

        let a1 = await Account.accountQuery(
            tstaccounts[0].address,
            new TxMockContext(store)
        );
        assert(a1);
        assert.equal(a1.address, tstaccounts[0].address)
        assert.equal(a1.balance, 10000);

        let m1 = new Message('a', 'b', {});
        m1.sign(tstaccounts[0].privateKey);
        let r0 = await Account.authenticateAccount(new TxMockContext(store, m1));
        assert.equal(0, r0.code);

        // Rejects missing msg.sender
        assert.rejects(async () => {
            await Account.authenticateAccount(new TxMockContext(store, new Message('a', 'b', {})));
        });

        let payer = tstaccounts[0].address;
        let payee = tstaccounts[1].address;
        await Account.transferFunds(payer, payee, 100, new TxMockContext(store));
        await store.commit();

        // Now check the accounts
        let b0 = await Account.accountQuery(
            payer,
            new TxMockContext(store)
        );
        let b1 = await Account.accountQuery(
            payee,
            new TxMockContext(store)
        );

        assert.equal(b0.balance, 9900);
        assert.equal(b1.balance, 10100);
    });
});