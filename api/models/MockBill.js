module.exports = {
    tableName: 'mock_bill',
    attributes: {
        billCode: { type: 'string', required: true, unique: true },
        billerCode: { type: 'string', required: true },
        customerName: { type: 'string' },
        amount: { type: 'float', required: true },
        isPaid: { type: 'boolean', defaultsTo: false },
        billerRefId: { type: 'string' }
    }
};
