module.exports = {
  tableName: 'pocket',
  attributes: {
    user: {
      type: 'string',
      required: true,
      unique: true
    },
    client: { type: 'string', enum: ['customer', 'biller', 'system', 'bank'], required: true },
    currency: { type: 'string', defaultsTo: 'VND' },
    balance: { type: 'float', defaultsTo: 0 },
    checksum: { type: 'string', required: true },
    status: { type: 'string', enum: ['active', 'locked', 'inProgress'], defaultsTo: 'active' }
  }
};