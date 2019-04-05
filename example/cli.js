'use strict';

const assert = require('bsert');
const breezy = require('../index');
const debug = require('debug')('cli');

let bob = {
    name: 'Bob',
    privateKey: 'a12133c8e2422999ceca9113eb26bf62b197ac1a9052b395655c6db4b6c1b005',
    publicKey: '21e1d1b0929ce31558bba7a0be4a8890be740cfa495ec507c5f3264ec868d920',
    address: '4c2138057887adca5fb554d7fd0e1c938b686e91'
};

/*
  cli usage:
  cli send 'num'  - send a tx with the num to add 
  cli query - view the current count
*/
async function main() {
    assert(process.argv.length >= 3, 'Missing required input params');
    let client = breezy.rpcclient();

    let inputParams = process.argv.slice(2);
    switch (inputParams[0]) {
        case 'send':
            assert(inputParams.length === 2, 'Send missing value');
            let val = inputParams[1]
            let m = new breezy.Message('add', 's', {
                value: parseInt(val)
            });
            let result0 = await client.sendTx(m, bob.privateKey);
            debug(result0);
            process.exit(0);
        case 'query':
            if (inputParams.length === 2) {
                let badr = await client.query('getcount', 'badkey');
                debug(badr);
                process.exit(0);
            }
            let result1 = await client.query('getcount', 'current');
            debug(result1);
            process.exit(0);
        case 'account':
            let acctInfo = await client.query('account', bob.address);
            debug(acctInfo);
            process.exit(0);

        default:
            throw Error('cli usage - bad command');
    }
}

main();