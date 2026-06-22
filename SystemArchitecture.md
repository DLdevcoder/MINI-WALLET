# 1. Techstack

- Backend: Sails.js (Node.js).

- Database: MongoDB (Bắt buộc chạy Replica Set để hỗ trợ Transaction).

- Bảo mật: JWT (Session stateless), bcrypt (Mã hóa PIN/Password).

# 2. Layers

Hệ thống xử lý theo 4 lớp tách biệt:

- API Layer (Controller): \* Customer API: Đăng ký, đăng nhập, giao dịch (P2P, Bill).
  - Admin API: CRUD cấu hình (Service, Biller), kích hoạt Cash-in.

- Security Layer (Policy): Áp dụng nguyên tắc Deny-by-default.
  - isLoggedIn: Validate JWT, nạp req.info.user.

  - isOfficer: Chặn truy cập không phải Admin

- Business Layer (Service):
  - CoreEngineService: Nhận input và config, chạy tuần tự 3 bước (Request → Confirm → Verify).

  - LedgerService: Xử lý cộng/trừ tiền, sinh bút toán.

- Data Layer (Model): Giao tiếp MongoDB qua Waterline ORM. Phân tách rõ ràng 3 cụm: Config (WHAT), Ledger (Sổ sách) và Entity (Người dùng).

# 3. Tích hợp hệ thống ngoài

- Mock Biller: Hệ thống giả lập. Cung cấp URL để engine gọi HTTP:

- Inquiry (@Request): Tra cứu nợ.

- Payment (@Verify): Ghi nhận thanh toán. Yêu cầu có Idempotency (truyền kèm transRefId để tránh thu trùng).

- Mock Bank: Là một Ví (Pocket) nội bộ được cấp sẵn số dư ảo lớn để làm nguồn tiền cho nghiệp vụ Cash-in.

# 4. Cơ chế bảo vệ dữ liệu

- ACID Transaction: Mọi lệnh thay đổi Pocket, PocketEntry, Transaction ở bước Verify phải nằm trong một session.startTransaction(). Rollback toàn bộ nếu có lỗi.

- Atomic Update: Cập nhật số dư bằng toán tử $inc của MongoDB, tuyệt đối không tính toán balance trên RAM server để tránh race condition.

- Checksum: Băm chữ ký điện tử sau mỗi lần đổi số dư để chống sửa data trực tiếp trên database. Công thức: checksum = hash(ownerId + balance + secretKey).
