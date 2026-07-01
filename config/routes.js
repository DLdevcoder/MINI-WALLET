module.exports.routes = {
  'POST /transaction/request': 'TransactionController.request',
  'POST /transaction/confirm': 'TransactionController.confirm',
  'POST /transaction/verify': 'TransactionController.verify',
  'POST /auth/customer/register': 'AuthController.registerCustomer',
  'POST /auth/customer/login': 'AuthController.loginCustomer',
  'POST /pockets/me': 'PocketController.myPocket',
  'POST /transactions/me': 'TransactionController.myHistory',
  'POST /auth/admin/login': 'AuthController.loginAdmin',
  'POST /admin/cash-in': 'AdminController.cashIn',
};