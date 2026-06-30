module.exports.policies = {
  '*': true, // Mặc định mở

  TransactionController: {
    '*': 'isAuthorized' // Chỉ khóa chặt Core Engine
  },

  AuthController: {
    '*': true // Cho phép ai cũng gọi được Đăng ký/Đăng nhập
  }
};