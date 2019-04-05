const assert = require('bsert');
const {
    Message
} = require('../lib/common');
const Breezy = require('../lib/application/breezy');
const Accounts = require('../lib/services/accounts');

const msgpack = require('msgpack5')();

let testAccounts = [{
        name: 'Bob',
        privateKey: 'a12133c8e2422999ceca9113eb26bf62b197ac1a9052b395655c6db4b6c1b005',
        publicKey: '21e1d1b0929ce31558bba7a0be4a8890be740cfa495ec507c5f3264ec868d920',
        address: '4c2138057887adca5fb554d7fd0e1c938b686e91'
    },
    {
        name: 'Alice',
        privateKey: '9cef276d41fcf0b1c6d9fdea32a1e83733dc221356a8eef1bcc359b234ba2c92',
        publicKey: 'b6642587ecc1bd73fefa367c1c0ce5c8d70dd92745d3abf306dbd87ea68d4313',
        address: '358801a4352845b1edd407367912a974a400c549'
    }
];

describe('abci', () => {
    it('should handle tx and queries', async () => {
        let app = new Breezy('', true);
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
        let app = new Breezy('', true);
        app.onInitChain(async (db) => {
            // Load some accounts
            for (let i = 0; i < testAccounts.length; i++) {
                Accounts.createGenesisAccount(db, testAccounts[i]);
            }
        });

        app.onVerifyTx(Accounts.authenticateAccount);
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
        assert.equal(r1.log, 'Sender account not found');

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