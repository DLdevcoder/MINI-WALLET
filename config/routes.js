module.exports.routes = {
  'POST /api/v1/transaction/request': 'TransactionController.request',
  'POST /api/v1/transaction/confirm': 'TransactionController.confirm',
  'POST /api/v1/transaction/verify': 'TransactionController.verify',
  'POST /auth/customer/register': 'AuthController.registerCustomer',
  'POST /auth/customer/login': 'AuthController.loginCustomer',
};