module.exports = {
  tableName: 'officer',
  attributes: {
    username: { type: 'string', required: true, unique: true },
    passwordHash: { type: 'string', required: true },
    status: { type: 'string', enum: ['active', 'inactive'], defaultsTo: 'active' }
  }
};