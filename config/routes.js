module.exports.routes = {
  // Transaction engine (3 bước)
  'POST /transaction/request': 'TransactionController.request',
  'POST /transaction/confirm': 'TransactionController.confirm',
  'POST /transaction/verify': 'TransactionController.verify',
  'POST /transaction/batch-payout': 'BatchController.payout',

  // Auth
  'POST /auth/customer/register': 'AuthController.registerCustomer',
  'POST /auth/customer/login': 'AuthController.loginCustomer',
  'POST /auth/admin/login': 'AuthController.loginAdmin',

  // Customer
  'POST /pockets/me': 'PocketController.myPocket',
  'POST /transactions/me': 'TransactionController.myHistory',
  'POST /transactions/me/detail': 'TransactionController.myTransactionDetail',

  // Admin
  'POST /admin/cash-in': 'AdminController.cashIn',
  'POST /admin/transactions': 'AdminController.listTransactions',
  'POST /admin/trails': 'AdminController.listTrails',
  'POST /admin/customers': 'AdminController.listCustomers',
  'POST /admin/pocket-entries': 'AdminController.listPocketEntries',
  'POST /admin/pocket/unlock': 'AdminController.forceUnlockPocket',

  // Mock Biller (giả lập hệ thống đối tác bên ngoài)
  'POST /mock/evn/inquiry': 'MockBillerController.inquiry',
  'POST /mock/evn/payment': 'MockBillerController.payment',
};