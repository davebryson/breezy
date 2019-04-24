const assert = require('bsert');

const Message = require('../index').Message;
const breezymock = require('../index').mock;
const Accounts = require('../index').accounts;
const testAccounts = require('./utils').testAccounts;

const msgpack = require('msgpack5')();

describe('abci', () => {
    it('should handle tx and queries', async () => {
        let app = breezymock();

        app.onInitChain((db) => {
            db.set('count', {
                val: 1
            });
        });

        app.onTx('one', async (ctx) => {
            // Increment the count
            let cv = await ctx.get('count');
            cv.val += 1;
            ctx.set('count', cv);
            return {
                code: 0
            }
        });

        app.onQuery('getcount', async (key, ctx) => {
            let cv = await ctx.get(key);
            return cv.val;
        });

        // Run the app 

        await app.initChain({});

        let i = 1;
        while (i < 10) {
            let m1 = new Message('one', 'ex', {});
            await app.deliverTx({
                tx: m1.encode()
            });
            i++;
        }

        await app.commit();

        let qr = await app.query({
            data: msgpack.encode('count'),
            path: 'getcount'
        });

        assert.equal(0, qr.code);
        assert.equal(10, msgpack.decode(qr.value));
    })

    it('should handle checkTx', async () => {
        let app = breezymock();

        app.onInitChain(async (db) => {
            // Load some accounts
            for (let i = 0; i < testAccounts.length; i++) {
                Accounts.createGenesisAccount(db, testAccounts[i]);
            }
        });

        app.onQuery('getaccount', Accounts.accountQuery);


        // Run the app 

        await app.initChain({});

        // Send a Tx
        let msg1 = new Message('hello', 'any', {
            one: 1
        });
        msg1.sign(testAccounts[0].privateKey);
        let r0 = await app.checkTx({
            tx: msg1.encode()
        });
        assert.equal(0, r0.code);


        // Sign with an unregistered account
        let msg2 = new Message('hello', 'any', {
            one: 2
        });
        msg2.sign('265087745d9b2790549a04e1a6d081fb5eec9ded850dbc635aba418143ba67cd');
        let r1 = await app.checkTx({
            tx: msg2.encode()
        });

        assert.equal(r1.code, 1);

        // Query account
        let qr = await app.query({
            data: msgpack.encode(testAccounts[0].address),
            path: 'getaccount'
        });

        assert.equal(qr.code, 0);
        let a = msgpack.decode(qr.value)
        assert.equal(testAccounts[0].address, a.address);
    })
})