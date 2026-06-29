module.exports = {
    tableName: 'trans_validation',
    attributes: {
        service: { model: 'service', required: true },
        validateFunc: { type: 'string', required: true },
        validateFields: { type: 'string', required: true },
        order: { type: 'number', required: true },
        errorCode: { type: 'string' },
        status: { type: 'string', isIn: ['active', 'inactive'], defaultsTo: 'active' }
    }
};