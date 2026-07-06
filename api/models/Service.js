module.exports = {
    tableName: 'service',
    attributes: {
        code: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        fieldBuilder: { type: 'json' },
        amountFormula: { type: 'string' },
        action: { type: 'string', enum: ['none', 'billerTrans'], defaultsTo: 'none' },
        actionParams: { type: 'json' },
        fee: { type: 'json' },
        auth: { type: 'json' },
        status: { type: 'string', enum: ['active', 'inactive'], defaultsTo: 'inactive' }
    }
};