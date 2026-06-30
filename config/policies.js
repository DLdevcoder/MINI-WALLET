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

  PocketController: {
    '*': 'isAuthorized'
  },

  AdminController: {
    '*': 'isOfficer'
  },
};