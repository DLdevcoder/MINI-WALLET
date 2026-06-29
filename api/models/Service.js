module.exports = {
    tableName: 'service',
    attributes: {
        code: { type: 'string', required: true, unique: true },
        name: { type: 'string', required: true },
        fieldBuilder: { type: 'json', columnType: 'array' },
        amountFormula: { type: 'string' },
        action: { type: 'string', isIn: ['none', 'billerTrans'], defaultsTo: 'none' },
        actionParams: { type: 'json' },
        fee: { type: 'json' },
        auth: { type: 'json' },
        status: { type: 'string', isIn: ['active', 'inactive'], defaultsTo: 'active' }
    }
};