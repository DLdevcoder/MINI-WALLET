module.exports.models = {
  datastore: 'default',
  migrate: 'drop',
  attributes: {
    createdAt: { type: 'number', autoCreatedAt: true, },
    updatedAt: { type: 'number', autoUpdatedAt: true, },
    id: { type: 'string', columnName: '_id' },
  },
  dataEncryptionKeys: {
    default: 'rQ/K8qF1ZYvjczwCVNbP4ZOcw5HVT2Ap9/4dh3j17XY='
  }
};