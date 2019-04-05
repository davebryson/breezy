const assert = require('bsert');
const msgpack = require('msgpack5')();
const {
    Message
} = require('../common');
const {
    RpcClient
} = require('tendermint');

/**
 * Simple tendermint rpc client customized for use with breezy.
 * It offers 2 additional method for working with breezy messages.
 * Note: all other rpc calls are available via from the underlying
 * tendermint rpc client module.
 * 
 * Example use:
 * const rpclient = require('breezy-client');
 * let client = rpcclient();
 * 
 * let msg = new Message('coins', 'create', { amount: 10})
 * let result = await client.sendTx(msg, bob.privateKey);
 * ...
 * let resp = await client.query('coins', bob.address);
 */


/**
 * Send a commit transaction.
 * 
 * Note:  The returned result from a tx broadcast can be a little confusing. 
 * IF the operation was successful, the returned checkTx/deliverTx {} will NOT
 * include a 'code' tag.  The code tag is ONLY included if it's a non-zero (fail) value.
 * 
 * @param {Message} msg - the breezy message
 * @param {Hex} privateKey - the senders privateKey needed to sign the message
 * @returns {Object} the response
 */
RpcClient.prototype.sendTx = async function (msg, privateKey) {
    assert(msg instanceof Message, 'Expected an instance of Message');
    assert(privateKey, 'Require privateKey');

    msg.sign(privateKey);
    let encodedTx = msg.encode().toString('base64');
    return await this.broadcastTxCommit({
        tx: encodedTx
    });
}

/**
 * Query the app.  Will return:
 * {ok: true, result: some value} where 'some value' is from the app
 * OR
 * {ok: false, log: reason}
 * 
 * @param {String} queryRoute - the registered queryroute in the application (path)
 * @param {String} key - the key to query (data)
 * @returns {Object} the response
 */
RpcClient.prototype.query = async function (queryRoute, key) {
    let queryObj = {
        path: queryRoute,
        data: msgpack.encode(key).toString('hex')
    };
    let queryResult = await this.abciQuery(queryObj);
    if (queryResult.response.value) {
        let decoded = msgpack.decode(Buffer.from(queryResult.response.value, 'base64'));
        return {
            ok: true,
            result: decoded
        }
    }
    return {
        ok: false,
        log: queryResult.response.log
    }
}

exports = module.exports = createClient;

function createClient(uriString = 'ws://127.0.0.1/26657') {
    return RpcClient(uriString);
}