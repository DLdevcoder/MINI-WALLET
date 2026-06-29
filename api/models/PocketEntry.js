module.exports = {
    tableName: 'pocket_entry',
    attributes: {
        transRefId: { type: 'string', required: true },
        stepOrder: { type: 'number', required: true },
        debit: { type: 'string', required: true },
        credit: { type: 'string', required: true },
        amount: { type: 'number', required: true },
        status: { type: 'string', defaultsTo: 'settled' }
    }
};