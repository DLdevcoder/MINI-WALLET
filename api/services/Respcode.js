module.exports = {
  SUCCESS: { code: 200, message: "Thành công" },
  CONFIRM_SUCCESS: { code: 200, message: "Xác nhận thông tin thành công" },

  // Nhóm lỗi chung (hệ thống, dữ liệu)
  INVALID_PARAMS: { code: 400, message: "Thiếu hoặc sai dữ liệu " },
  MISSING_SERVICE_PARAMETERS: { code: 400, message: "Thiếu serviceCode và parameters" },
  MISSING_TRANS_REF_ID: { code: 400, message: "Thiếu transRefId" },
  UNAUTHORIZED: { code: 401, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" },
  MISS_BEARER: { code: 403, message: "Thiếu token xác thực (Bearer)" },
  NOT_FOUND: { code: 404, message: "Không tìm thấy dữ liệu yêu cầu" },
  TRANSACTION_NOT_FOUND: { code: 404, message: "Không tìm thấy giao dịch" },
  SYSTEM_ERROR: { code: 500, message: "Lỗi hệ thống nội bộ" },

  // Nhóm lỗi người dùng / tài khoản
  PHONE_EXISTED: { code: 101, message: "Số điện thoại đã được đăng ký" },
  USER_NOT_FOUND: { code: 102, message: "Không tìm thấy người dùng" },
  WRONG_PASSWORD: { code: 103, message: "Mật khẩu không chính xác" },
  ACCOUNT_LOCKED: { code: 104, message: "Tài khoản đang bị tạm khóa" },

  // Nhóm lỗi giao dịch / ví
  INSUFFICIENT_BALANCE: { code: 201, message: "Số dư ví không đủ để thực hiện giao dịch" },
  INVALID_AMOUNT: { code: 202, message: "Số tiền giao dịch không hợp lệ (vượt hạn mức hoặc nhỏ hơn quy định)" },
  POCKET_NOT_FOUND: { code: 203, message: "Không tìm thấy ví thanh toán" },
  TRANSFER_SELF: { code: 204, message: "Không thể chuyển tiền cho chính ví của mình" },
  MISS_INFO: { code: 205, message: "Yêu cầu giao dịch thiếu thông tin bắt buộc" },
  SERVICE_UNAVAILABLE: { code: 206, message: "Dịch vụ không tồn tại hoặc đang bảo trì" },
  INVALID_TRANS_STATE: { code: 207, message: "Trạng thái giao dịch không hợp lệ (đã xử lý hoặc hết hạn)" },
  INVALID_OTP: { code: 208, message: "Mã xác thực (OTP/PIN) không chính xác" }
};