'use strict';

const assert = require('bsert');
const wallet = require('./wallet');
const msgpack = require('msgpack5')();

/**
 * Msg used for client <-> app communication.
 * Uses msgpack codec for simplicity.
 */

class Message {
    /**
     * Create a messages
     * @constructor
     * @param {String} route the handler route name
     * @param {String} type the route type. used for more fine-grained logic handling
     * @param {Object} data  the payload
     */
    constructor(route, type, data) {
        this.route = route;
        this.type = type;
        this.data = data;
        this.sender = '';
        this.sig = '';
        this.nonce = '';
    }

    /**
     * Generates a hash for signing
     */
    hash() {
        // Sort for determinism...
        let sorted = Object.keys(this.data).sort();
        // Add the nonce
        let squished = `${this.nonce}${JSON.stringify(sorted)}`;
        return wallet.ripemd160(squished);
    }

    /**
     * Sign the message
     * @param {String} privKey signing key 
     */
    sign(privKey) {
        // Random nonce for uniqueness
        this.nonce = wallet.generateNonce();
        let hashMsg = this.hash();
        this.sig = wallet.sign(hashMsg, privKey).toString('hex');
        let pub = wallet.privToPubKey(privKey);
        // Set the sender based on publickey
        this.sender = wallet.pubKeyToAddress(pub).toString('hex');
    }

    /**
     * Verify the message against a publickey
     * @param {String} pubKey 
     */
    verify(pubKey) {
        let hashMsg = this.hash();
        return wallet.verify(hashMsg, this.sig, pubKey)
    }

    /**
     * Validate the message - called in the ABCI checkTx. At a minimum
     * a message must include the fields below
     */
    validate() {
        assert(this.route, 'Missing message route');
        assert(this.type, 'Missing message type');
        assert(this.sender, 'Missing message sender');
        assert(this.sig, 'Missing message signature');
    }

    /**
     * Encode for transport
     */
    encode() {
        let msg = {
            data: this.data,
            route: this.route,
            type: this.type,
            sender: this.sender,
            sig: this.sig,
            nonce: this.nonce
        }
        return msgpack.encode(msg);
    }

    /**
     * Decode the message
     * @param {Buffer} bits 
     */
    static decode(bits) {
        let msg = msgpack.decode(bits)
        let obj = new Message(msg.route, msg.type, msg.data);
        obj.sender = msg.sender;
        obj.sig = msg.sig;
        obj.nonce = msg.nonce;
        return obj;
    }
}

module.exports = Message;