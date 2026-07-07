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

  // ================= ADMIN & CONFIG ROUTES =================
  'POST /admin/services/list': 'ServiceConfigController.listServices',
  'POST /admin/services/create': 'ServiceConfigController.createService',
  'POST /admin/services/update': 'ServiceConfigController.updateService',
  'POST /admin/services/toggle': 'ServiceConfigController.toggleServiceStatus',
  'POST /admin/services/config/get': 'ServiceConfigController.getServiceConfig',
  'POST /admin/services/config/save': 'ServiceConfigController.saveServiceConfig',

  // Admin
  'POST /admin/cash-in': 'AdminController.cashIn',
  'POST /admin/transactions': 'AdminController.listTransactions',
  'POST /admin/trails': 'AdminController.listTrails',
  'POST /admin/customers': 'AdminController.listCustomers',
  'POST /admin/customers/status': 'AdminController.toggleCustomerStatus',
  'POST /admin/pocket-entries': 'AdminController.listPocketEntries',
  'POST /admin/pocket/unlock': 'AdminController.forceUnlockPocket',
  
  // Admin Pockets Management
  'POST /admin/pockets/list': 'PocketController.adminList',
  'POST /admin/pockets/create': 'PocketController.adminCreate',
  'POST /admin/pockets/topup': 'PocketController.adminTopup',

  // Mock Biller (giả lập hệ thống đối tác bên ngoài)
  'POST /mock/evn/inquiry': 'MockBillerController.inquiry',
  'POST /mock/evn/payment': 'MockBillerController.payment',
};