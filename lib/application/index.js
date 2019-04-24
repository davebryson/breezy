'use strict';

const Breezy = require('./breezy');

/*
Example use:

const breezy = require('breezy-abci);

app = breezy('./homedir')
app.onTx('hello', async (ctx) => {
    return {
        code: 0
    }
});
app.onInitChain((db) => {
    // add something on genesis
});

app.onVerifyTx(async (ctx) => {
    // checkTx
    return {
        code: 0
    }
});
app.onQuery('name', async (key ctx) => {
    let v = await ctx.get(keyname);
    return v.attribute;
})

app.runWithNode();
*/

exports = module.exports = createApplication;

function createApplication(home) {
    return new Breezy(home);
}