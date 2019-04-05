## Breezy

A simple framework for building Tendermint applications.  Primarily intended for rapid prototypes/demos :boom:

What's it look like?:
```
const breezy = require('breezy);

app = breezy.app('./homedir');

// load something at genesis
app.onInitChain((db) => {
    // ...
});

// Verify transactions
app.onVerifyTx(async (ctx) => {
    // checkTx
    return {
        code: 0
    }
});

// Do a state transistion
app.onTx('hello', async (ctx) => {
    return {
        code: 0
    }
});


// Do queries against state
app.onQuery('name', async (key ctx) => {
    let v = await ctx.get(keyname);
    return v.attribute;
})

// Start the ABCI server
app.run();
```