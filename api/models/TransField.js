module.exports = {
    tableName: 'trans_field',
    attributes: {
        service: { model: 'service', required: true },
        fieldName: { type: 'string', required: true },
        fieldFormat: { type: 'string', isIn: ['string', 'number', 'boolean'], required: true },
        minLength: { type: 'number' },
        maxLength: { type: 'number' },
        regex: { type: 'string' },
        isRequired: { type: 'boolean', defaultsTo: false },
        needSecured: { type: 'boolean', defaultsTo: false },
        order: { type: 'number', required: true },
        errorCode: { type: 'string' },
        status: { type: 'string', isIn: ['active', 'inactive'], defaultsTo: 'active' }
    }
};