module.exports = {
    tableName: 'transaction',
    attributes: {
        code: { type: 'string', required: true, unique: true },
        transRefId: { type: 'string', required: true },
        service: { model: 'service', required: true },
        sender: { type: 'string', required: true },
        receiver: { type: 'string', required: true },
        amount: { type: 'number', required: true },
        fee: { type: 'number', required: true },
        totalAmount: { type: 'number', required: true },
        status: { type: 'string', isIn: ['done', 'failed'], defaultsTo: 'done' }
    }
};