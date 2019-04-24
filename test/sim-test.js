'use strict';

const assert = require('assert');
const Message = require('../index').Message;
const Blockchain = require('../index').simulator;
const demoAccounts = require('./utils/index').testAccounts;

describe("sim", () => {
    it('basic functionality', async () => {
        let blks = [];

        // Setup the sim abci
        let sim = new Blockchain();
        // Listen for blocks
        sim.on('block', (b) => {
            blks.unshift(b)
        });

        await sim.init(demoAccounts);

        sim.onTx('example', function (ctx) {
            if (ctx.msg.data.name === 'dave') {
                return {
                    code: 0,
                    log: 'yep'
                }
            }
            return {
                code: 1
            }
        });

        let bob = demoAccounts[0];

        /** Client usage **/
        let data = {
            name: 'dave'
        };
        let msg = new Message('example', 'create', data);
        msg.sign(bob.privateKey);
        /** end client */

        // Send the Tx
        let state = await sim.runTx(msg);
        assert.equal(state.code, 0);
        assert.equal(state.log, 'yep');
        let qr = await sim.query('accountview', bob.address);

        // Test the listener
        assert.equal(blks.length, 2);
        assert.equal(blks[0].block, 1);
    });
})