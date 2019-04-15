const assert = require('bsert');
const breezy = require('../index');
const Accounts = require('../lib/services/accounts');

const tstaccounts = require('./testaccounts');

/**
 * NOTE: This example assumes you have Tendermint installed.
 * AND you've exported the environment variable TM_BINARY that points to
 * the Tendermint executable.
 */
const HOME = './testdb'

function main() {
    // Create the app
    let app = breezy.app(HOME);

    // initialize genesis state
    app.onInitChain(async (db) => {
        db.set('current', {
            value: 0
        });
        Object.values(tstaccounts).forEach(acct => {
            Accounts.createGenesisAccount(db, acct);
        });
    });

    // Handle account related txs
    app.onTx('account', Accounts.accountTxHandler);

    // Handle 'add' txs
    app.onTx('add', async (ctx) => {
        // * Conditions
        let v = ctx.msg.data.value;
        let current = await ctx.get('current');
        assert(current, 'State not found');

        // For testing the client - to make it fail
        assert(v !== 5, '5 is bad input for testing')

        // * Interaction
        current.value += v;

        // * State change
        ctx.set('current', current);

        return {
            code: 0,
            log: 'added number'
        }
    });

    // View an account
    app.onQuery('accountview', Accounts.accountQuery);

    // View the current count state
    app.onQuery('getcount', async (key, ctx) => {
        return await ctx.get(key);
    });

    // Test processing keys on queries
    app.onQuery('randomtest', async (key, ctx) => {
        return key;
    });

    // Start the application
    app.runWithNode();
}

main();