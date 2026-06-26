# 7. Backlog

## Sprint 1: Core Engine & P2P Demo (Mục tiêu: Tuần 1)

Tập trung 100% vào Backend (Sails.js). Bỏ qua hoàn toàn giao diện. Dùng Postman làm Client.

| ID  | Module   | Tên công việc (Task)                                                                        | Ước lượng |
| --- | -------- | ------------------------------------------------------------------------------------------- | --------- |
| 1.1 | Setup    | Khởi tạo Sails.js app, kết nối MongoDB (Bắt buộc dùng Replica Set để hỗ trợ Transaction).   | 3h        |
| 1.2 | Database | Khai báo Waterline Models (Service, Pocket, TransactionTrail, PocketEntry).                 | 4h        |
| 1.3 | Seed     | Viết logic trong config/bootstrap.js để nạp dữ liệu Seed JSON ở Phần 6 vào DB.              | 3h        |
| 1.4 | Engine   | API /engine/request: Đọc fieldBuilder để lấy biến AMOUNT, lưu xuống TransactionTrail.       | 5h        |
| 1.5 | Engine   | API /engine/verify: Dùng session.withTransaction(), viết vòng lặp xử lý glSteps ($inc).     | 6h        |
| 1.6 | Demo     | Tạo Postman Collection gọi luồng P2P_TRANSFER. Kiểm tra DB thấy ví trừ/cộng tiền chuẩn xác. | 3h        |
| 1.7 | Test     | Test, đảm bảo các phần được xử lý đúng                                                      | 10h       |

## Sprint 2: UI Admin & Cash-in (Mục tiêu: Tuần 2)

Bắt đầu dựng giao diện vận hành và xử lý nghiệp vụ bỏ qua mã PIN.

| ID  | Module   | Tên công việc (Task)                                                                                     | Ước lượng |
| --- | -------- | -------------------------------------------------------------------------------------------------------- | --------- |
| 2.1 | API      | Viết các API Read-only (GET) để lấy danh sách Service, Pocket, TransactionTrail.                         | 4h        |
| 2.2 | Frontend | Dựng bộ khung Admin UI (React/Vue) sử dụng UI Kit có sẵn (Header, Sidebar).                              | 8h        |
| 2.3 | Frontend | Ghép API hiển thị dữ liệu lên 3 màn hình: Quản lý Service, Ví nội bộ, Lịch sử GD.                        | 6h        |
| 2.4 | Engine   | API /admin/cash-in: Viết luồng nối trực tiếp hàm processRequest sang processVerify (Bỏ qua Confirm/PIN). | 4h        |
| 2.5 | Test     | Test, đảm bảo các phần được xử lý đúng                                                                   | 12h       |

## Sprint 3: Bill Payment & hoàn thiện (Mục tiêu: Tuần 3)

Xử lý luồng nghiệp vụ khó nhất có tích hợp ngoại và các trường hợp lỗi.

| ID  | Module   | Tên công việc (Task)                                                                                               | Ước lượng |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| 3.1 | Mock     | Tạo 2 Controller độc lập trong Sails đóng vai Biller: GET /mock/evn/inquiry, POST /mock/evn/payment.               | 6h        |
| 3.2 | Engine   | Bổ sung logic vào API /engine/request: Nếu action === 'billerTrans', gọi HTTP GET sang Mock Inquiry để gán AMOUNT. | 4h        |
| 3.3 | Engine   | Bổ sung logic vào API /engine/verify: Sau dòng lệnh session.commitTransaction(), gọi HTTP POST sang Mock Payment.  | 4h        |
| 3.4 | Engine   | Xử lý lỗi: Nếu Biller trả lỗi hoặc Timeout, cập nhật trạng thái Trail thành refund_pending.                        | 3h        |
| 3.5 | Security | (Tùy chọn) Viết middleware/policy kiểm tra JWT token cho các endpoints.                                            | 4h        |
| 3.6 | Test     | Test, đảm bảo các phần được xử lý đúng                                                                             | 15h       |
