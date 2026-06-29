module.exports = {
    tableName: 'customer',
    attributes: {
        phone: { type: 'string', required: true, unique: true },
        pinHash: { type: 'string', required: true },
        pocket: { model: 'pocket' },
        status: { type: 'string', enum: ['active', 'locked'], defaultsTo: 'active' }
    }
};