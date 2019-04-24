/**
 * Context for check/deliverTx handlers
 */
class TxContext {
    constructor(store, msg) {
        this.store = store;
        this.msg = msg;
    }

    set(key, value) {
        this.store.set(key, value);
    }

    del(key) {
        this.store.delete(key)
    }

    async get(key) {
        return await this.store.get(key);
    }
}

/**
 * Read only query context passed to query handlers
 */
class QueryContext {
    constructor(store) {
        this.store = store;
    }
    async get(key) {
        return await this.store.get(key);
    }
}

module.exports = {
    TxContext: TxContext,
    QueryContext: QueryContext
}