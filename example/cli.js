'use strict';

const assert = require('bsert');
const breezy = require('../index');
const debug = require('debug')('example:cli:*');
const tstaccounts = require('./testaccounts');

/*
  cli usage:
  cli send <num>  - send a tx with the num to add to count state
  cli query - view the current count
  cli account <name> - return the account information
  cli transfer <from name> <to name> <amount>
*/
async function main() {
    assert(process.argv.length >= 3, 'Missing required input params');
    let client = breezy.rpcclient();

    let inputParams = process.argv.slice(2);
    switch (inputParams[0]) {
        case 'send':
            assert(inputParams.length === 3, 'Send missing value and or account name');

            let val = inputParams[1];
            let acctName = inputParams[2];
            let acct = tstaccounts[acctName];
            assert(acct, `No account for ${acctName}`);

            let m = new breezy.Message('add', 's', {
                value: parseInt(val)
            });
            let result0 = await client.sendTx(m, acct.privateKey);
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
            assert(inputParams.length === 2, 'Missing account name');
            let acctName1 = inputParams[1];
            let acct1 = tstaccounts[acctName1];
            assert(acct1, `No account for ${acctName1}`);

            let acctInfo = await client.query('accountview', acct1.address);
            debug(acctInfo);
            process.exit(0);

        case 'transfer':
            // input: transfer from<name> to<name> amount
            assert(inputParams.length === 4, "Expected: transfer <from> <to> <amount>");
            let amt = parseFloat(inputParams[3]);
            let sender = tstaccounts[inputParams[1]];
            let recipAddress = tstaccounts[inputParams[2]].address;

            let transfermsg = new breezy.Message('account', 'transfer', {
                amount: amt,
                recipient: recipAddress
            });
            let result2 = await client.sendTx(transfermsg, sender.privateKey);
            debug(result2);
            process.exit(0);

        case 'querystring':
            debug(await client.query('randomtest', 'hellothere'));
            process.exit(0);

        case 'queryobj':
            let robj = {
                name: 'dave',
                data: 'hello'
            }
            debug(await client.query('randomtest', robj));
            process.exit(0);

        default:
            throw Error('cli usage - bad command');
    }
}

main();