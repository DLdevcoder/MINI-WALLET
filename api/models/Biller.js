module.exports = {
    tableName: 'biller',
    attributes: {
        billerCode: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        inquiryUrl: { type: 'string' },
        paymentUrl: { type: 'string' },
        pocket: { model: 'pocket' },
        status: { type: 'string', defaultsTo: 'active' }
    }
};