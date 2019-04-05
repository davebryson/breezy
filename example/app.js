const assert = require('bsert');
const breezy = require('../index');
const tendermint = require('tendermint-node');
const Accounts = require('../lib/services/accounts');

// Don't forget to export TM_BINARY
const HOME = './testdb'

let bob = {
    name: 'Bob',
    privateKey: 'a12133c8e2422999ceca9113eb26bf62b197ac1a9052b395655c6db4b6c1b005',
    publicKey: '21e1d1b0929ce31558bba7a0be4a8890be740cfa495ec507c5f3264ec868d920',
    address: '4c2138057887adca5fb554d7fd0e1c938b686e91'
};

function main() {
    tendermint.initSync(HOME);

    let app = breezy.app(HOME);

    app.onInitChain(async (db) => {
        Accounts.createGenesisAccount(db, bob);
        db.set('current', {
            value: 0
        });
    });

    app.onVerifyTx(Accounts.authenticateAccount);

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
    app.onQuery('account', Accounts.accountQuery);

    app.run();

    tendermint.node(HOME);
}

main();