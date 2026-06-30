module.exports = {
    tableName: 'transaction_trail',
    attributes: {
        transRefId: { type: 'string', required: true, unique: true },
        inputMessage: { type: 'json' },
        outputMessage: { type: 'json' },
        transStepLog: { type: 'json' },
        status: {
            type: 'string',
            enum: ['init', 'pending', 'inProgress', 'done', 'failed', 'refund_pending'],
            defaultsTo: 'init'
        }
    }
};