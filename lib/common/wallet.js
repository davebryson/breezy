'use strict';

const crypto = require('crypto');
const EdDSA = require('elliptic').eddsa;
const createHash = require('create-hash');

/**
 * To be fair this is not really a wallet, but rather a bunch 
 * of function to keys and hashes
 */

const wallet = exports;

/**
 * Generate a random nonce
 * @param {Number} size - optional (defaults to 6 bytes)
 * @returns {Hex} random hex value
 */
wallet.generateNonce = function (size = 6) {
    return crypto.randomBytes(size).toString('hex')
}

/**
 * Generate a private key via crypto.randomBytes
 * @returns {Buffer}
 */
wallet.createPrivateKey = function () {
    return crypto.randomBytes(32)
}

/**
 * Generate an ed25519 public key
 * @param {Buffer} privateKey
 * @returns {Buffer} the public key
 */
wallet.privToPubKey = function (privateKey) {
    let key = new EdDSA('ed25519').keyFromSecret(privateKey);
    return Buffer.from(key.getPublic())
}

/**
 * Convert a public key to a 20 byte address via ripemd160
 * @returns {Buffer} the address
 */
wallet.pubKeyToAddress = function (pk) {
    let buf = Buffer.from(pk);
    return exports.ripemd160(buf)
}

/**
 * Sign the hash of a message
 * @param {Buffer} msgHash
 * @param {Hex} privToPubKey
 * @returns {Hex} signature 
 */
wallet.sign = function (msgHash, privateKey) {
    let key = new EdDSA('ed25519').keyFromSecret(privateKey);
    return key.sign(msgHash).toHex()
}

/**
 * Verify a signed message
 * @param {Buffer} msgHash - the hashed message
 * @param {Buffer} sig - the signature
 * @param {Hex} publicKey - the public key
 */
wallet.verify = function (msgHash, sig, publicKey) {
    let key = new EdDSA('ed25519').keyFromPublic(publicKey, 'hex');
    return key.verify(msgHash, sig);
}

/**
 * Generate a keypair/wallet
 * @returns {Object} 
 */
wallet.createKeyPair = function () {
    let sk = exports.createPrivateKey();
    let pub = exports.privToPubKey(sk);
    let addy = exports.pubKeyToAddress(pub);
    return {
        privateKey: sk.toString('hex'),
        publicKey: pub.toString('hex'),
        address: addy.toString('hex')
    }
}

/**
 * Utility to generate a bunch of 'wallets'.  Mainly used for testing
 * @param {Number} num - the number to create
 */
wallet.generateManyKeyPairs = function (num) {
    let result = []
    for (let i = 0; i < num; i++) {
        let kp = exports.createKeyPair();
        result.push(kp)
    }
    return result;
}

/**
 * Generate a 20 byte ripemd160 hash of the data
 * @param {String|Buffer} data
 */
wallet.ripemd160 = function (data) {
    return createHash('ripemd160').update(data).digest()
}

/**
 * Generate a sha256 hash of the data
 * @param {String|Buffer} data
 */
wallet.sha256 = function (data) {
    return createHash('sha256').update(data).digest()
}