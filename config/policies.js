module.exports.policies = {
  '*': false,

  AuthController: {
    'registerCustomer': true,
    'loginCustomer': true,
    'loginAdmin': true
  },

  TransactionController: {
    '*': 'isAuthorized'
  },

  BatchController: {
    '*': 'isAuthorized'
  },

  PocketController: {
    '*': 'isAuthorized'
  },

  AdminController: {
    '*': 'isOfficer'
  },

  ServiceConfigController: {
    '*': 'isOfficer'
  },

  // Mock Biller: public endpoint, không cần auth (giả lập biller bên ngoài)
  MockBillerController: {
    '*': true
  }
};
