module.exports.policies = {
  '*': true,
  TransactionController: {
    '*': 'isAuthorized'
  }
};