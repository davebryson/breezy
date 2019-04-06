'use strict';

const Breezy = require('./breezy');

exports = module.exports = createMock;
/**
 * Creates a Breezy mock with an in-memory tree
 * For use in tests without tendermint.
 */
function createMock() {
    return new Breezy('', true);
}