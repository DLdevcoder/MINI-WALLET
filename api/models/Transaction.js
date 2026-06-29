module.exports = {
    tableName: 'transaction',
    attributes: {
        code: { type: 'string', required: true, unique: true },
        transRefId: { type: 'string', required: true },
        service: { model: 'service', required: true },
        sender: { type: 'string', required: true },
        receiver: { type: 'string', required: true },
        amount: { type: 'float', required: true },
        fee: { type: 'float', required: true },
        totalAmount: { type: 'float', required: true },
        status: { type: 'string', enum: ['done', 'failed'], defaultsTo: 'done' }
    }
};