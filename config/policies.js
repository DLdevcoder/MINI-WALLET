module.exports.policies = {
  '*': false,

  AuthController: {
    'registerCustomer': true,
    'loginCustomer': true
  },

  TransactionController: {
    '*': 'isAuthorized'
  },

  PocketController: {
    '*': 'isAuthorized'
  }
};