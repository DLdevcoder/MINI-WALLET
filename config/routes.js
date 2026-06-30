module.exports.routes = {
  'POST /api/v1/transaction/request': 'TransactionController.request',
  'POST /api/v1/transaction/confirm': 'TransactionController.confirm',
  'POST /api/v1/transaction/verify': 'TransactionController.verify'
};