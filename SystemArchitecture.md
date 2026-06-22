## Thiết kế kiến trúc hệ thống

### 1. System Context

Hệ thống bao gồm 1 khối trung tâm và 3 khối thực thể giao tiếp xung quanh:

- **Customer (Người dùng):** Giao tiếp qua ứng dụng để thực hiện chuyển tiền, thanh toán hóa đơn.
- **Officer (Vận hành):** Giao tiếp qua trang quản trị để tạo cấu hình nghiệp vụ, kích hoạt nạp tiền.
- **Mock Biller:** Hệ thống đối tác giả lập để cung cấp thông tin nợ và nhận xác nhận thanh toán.
- **Core Engine:** Bộ máy trung tâm tiếp nhận yêu cầu, đọc cấu hình có sẵn và điều phối dòng tiền.

### 2. Tech Stack

Để xây dựng khối Core Engine và đảm bảo tính toàn vẹn của dữ liệu tài chính, hệ thống sử dụng:

- **Node.js & Sails.js:** Nền tảng xây dựng luồng API RESTful xử lý các yêu cầu từ Customer và Officer.
- **MongoDB (Replica Set):** Cơ sở dữ liệu lưu trữ, bắt buộc chạy ở chế độ Replica Set để hỗ trợ tính năng giao dịch đa tài liệu (Multi-document Transaction).

### 3. Layered Architecture

Bên trong khối Core Engine, một request sẽ đi qua 4 tầng từ ngoài vào trong:

- **API Layer:** Điểm hứng request đầu vào. Tách biệt rõ ràng luồng API của Customer và luồng API của Officer.
- **Security/Policy Layer:** Xác thực định danh (thông qua JWT) và kiểm tra quyền hạn trước khi cho phép đi tiếp. Áp dụng nguyên tắc từ chối mặc định.
- **Business Layer:** Nơi chứa `CoreEngineService`. Thành phần này thực thi luồng 3 bước (Request, Confirm, Verify) dựa trên việc đọc dữ liệu cấu hình, đồng thời chịu trách nhiệm gọi HTTP ra các hệ thống ngoài (Mock Biller).
- **Data Layer:** ORM ánh xạ thao tác từ code xuống MongoDB. Chia làm 2 nhóm rõ rệt: thao tác đọc linh hoạt cho nhóm Cấu hình và thao tác ghi cẩn trọng cho nhóm Sổ sách.

### 4. Cơ chế bảo vệ cốt lõi ở tầng đáy (Low-level Data Protection)

Ở mức sâu nhất (Database), hệ thống áp dụng 3 cơ chế kỹ thuật để ngăn chặn mất mát hoặc sai lệch tiền:

- **ACID Transaction:** Bọc toàn bộ các lệnh ghi sổ, đổi số dư ở bước Verify trong một Database Transaction. Lỗi tại bất kỳ dòng lệnh nào sẽ kích hoạt hoàn tác (rollback) toàn bộ.
- **Atomic Update:** Bắt buộc dùng toán tử `$inc` của MongoDB để trừ/cộng trực tiếp số dư trong database, loại bỏ rủi ro Race Condition khi tính toán trên RAM.
- **Checksum:** Mã hóa trạng thái ví (`checksum = hash(ownerId + balance + secretKey)`) sau mỗi lần cập nhật để phát hiện các can thiệp chỉnh sửa dữ liệu thủ công.
