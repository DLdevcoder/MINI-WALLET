module.exports = {
    tableName: 'trans_field',
    attributes: {
        service: { model: 'service', required: true },
        fieldName: { type: 'string', required: true },
        fieldFormat: { type: 'string', enum: ['string', 'float', 'boolean', 'number'], required: true },
        minLength: { type: 'integer' },
        maxLength: { type: 'integer' },
        regex: { type: 'string' },
        isRequired: { type: 'boolean', defaultsTo: false },
        needSecured: { type: 'boolean', defaultsTo: false },
        order: { type: 'integer', required: true },
        errorCode: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'], defaultsTo: 'active' }
    }
};