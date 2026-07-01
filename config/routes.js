module.exports.routes = {
  // Transaction engine (3 bước)
  'POST /transaction/request': 'TransactionController.request',
  'POST /transaction/confirm': 'TransactionController.confirm',
  'POST /transaction/verify': 'TransactionController.verify',

  // Auth
  'POST /auth/customer/register': 'AuthController.registerCustomer',
  'POST /auth/customer/login': 'AuthController.loginCustomer',
  'POST /auth/admin/login': 'AuthController.loginAdmin',

  // Customer
  'POST /pockets/me': 'PocketController.myPocket',
  'POST /transactions/me': 'TransactionController.myHistory',

  // Admin
  'POST /admin/cash-in': 'AdminController.cashIn',
  'GET /admin/transactions': 'AdminController.listTransactions',
  'GET /admin/trails': 'AdminController.listTrails',
  'GET /admin/customers': 'AdminController.listCustomers',
  'POST /admin/pocket/unlock': 'AdminController.forceUnlockPocket',

  // Mock Biller (giả lập hệ thống đối tác bên ngoài)
  'GET /mock/evn/inquiry': 'MockBillerController.inquiry',
  'POST /mock/evn/payment': 'MockBillerController.payment',
};