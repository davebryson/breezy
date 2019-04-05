const assert = require('bsert');
const breezy = require('../index');
const tendermint = require('tendermint-node');
const Accounts = require('../lib/services/accounts');

const tstaccounts = require('./testaccounts');

// Don't forget to export TM_BINARY
const HOME = './testdb'

function main() {
    tendermint.initSync(HOME);

    let app = breezy.app(HOME);

    app.onInitChain(async (db) => {
        db.set('current', {
            value: 0
        });
        Object.values(tstaccounts).forEach(acct => {
            Accounts.createGenesisAccount(db, acct);
        });
    });

    app.onVerifyTx(Accounts.authenticateAccount);

    app.onTx('account', Accounts.accountTxHandler);
    app.onTx('add', async (ctx) => {
        let v = ctx.msg.data.value;
        let current = await ctx.get('current');
        assert(current, 'State not found');

        // For testing the client 
        assert(v !== 5, 'Bad input for testing')

        current.value += v;
        ctx.set('current', current);

        return {
            code: 0,
            log: 'added number'
        }
    });

    app.onQuery('getcount', async (key, ctx) => {
        return await ctx.get(key);
    });
    app.onQuery('accountview', Accounts.accountQuery);

    app.run();

    tendermint.node(HOME);
}

main();