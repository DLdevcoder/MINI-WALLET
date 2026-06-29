module.exports = {
    tableName: 'trans_definition',
    attributes: {
        service: { model: 'service', required: true, unique: true },
        glSteps: { type: 'json', required: true }
    }
};