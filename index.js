'use strict';

/**
 * Tendermint apps with Breezy...
 */

// Expose the app engine...
/*exports.app = require('./lib/application');

// the rpc client...
exports.rpcclient = require('./lib/client');

// the message object...
exports.Message = require('./lib/common/txmsg');

// the crypto stuff...
exports.wallet = require('./lib/common/wallet');

// and the basic account service...
exports.accounts = require('./lib/services/accounts');

// and the store (mostly used for testing);
exports.store = require('./lib/store');

exports.node = require('./lib/node');

// and a breezy mock...
exports.mock = new require('./lib/application/mock');
*/

module.exports = {
    app: require('./lib/application'),
    rpcclient: require('./lib/client'),
    Message: require('./lib/common/txmsg'),
    wallet: require('./lib/common/wallet'),
    accounts: require('./lib/services/accounts'),
    store: require('./lib/store'),
    node: require('./lib/node'),
    mock: new require('./lib/application/mock'),
    simulator: require('./lib/sim')
}