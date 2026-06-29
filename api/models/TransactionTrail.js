module.exports = {
    tableName: 'transaction_trail',
    attributes: {
        transRefId: { type: 'string', required: true, unique: true },
        inputMessage: { type: 'json' },
        outputMessage: { type: 'json' },
        transStepLog: { type: 'json', columnType: 'array' },
        status: { type: 'string', isIn: ['init', 'pending', 'done', 'failed', 'refund_pending'], defaultsTo: 'init' }
    }
};