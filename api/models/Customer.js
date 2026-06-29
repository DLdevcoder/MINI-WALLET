module.exports = {
    tableName: 'customer',
    attributes: {
        phone: { type: 'string', required: true, unique: true },
        pinHash: { type: 'string', required: true },
        pocket: { model: 'pocket' },
        status: { type: 'string', isIn: ['active', 'locked'], defaultsTo: 'active' }
    }
};