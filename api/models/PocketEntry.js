module.exports = {
    tableName: 'pocket_entry',
    attributes: {
        transRefId: { type: 'string', required: true },
        stepOrder:  { type: 'integer', required: true },
        debit:      { type: 'string', required: true },
        credit:     { type: 'string' },          // optional — batch debit summary có thể null
        amount:     { type: 'float', required: true },
        status:     { type: 'string', defaultsTo: 'settled' }
    }
};