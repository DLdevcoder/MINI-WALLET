module.exports = {
    tableName: 'trans_validation',
    attributes: {
        service: { model: 'service', required: true },
        valType: { type: 'string', required: true },
        valCondition: { type: 'string' },
        order: { type: 'integer', required: true },
        errorCode: { type: 'string' },
        status: { type: 'string', defaultsTo: 'active' }
    }
};