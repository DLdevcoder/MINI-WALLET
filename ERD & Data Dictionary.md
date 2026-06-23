## ERD & Data Dictionary

### 1. Data Domains

Hệ thống được chia thành 3 khu vực lưu trữ tách biệt hoàn toàn về bản chất logic:

- Miền Configuration: Lưu trữ cấu hình sinh ra từ Officer. Dữ liệu này đóng vai trò như "bản vẽ kỹ thuật", chủ yếu được Đọc (Read) bởi engine tại thời điểm chạy (runtime).

- Miền Ledger & Engine: Quản lý trạng thái luồng 3 bước (Trail) và các biến động tài chính (Pocket, Entry, Transaction). Khu vực này cốt lõi yêu cầu sự chính xác tuyệt đối và bị ràng buộc bởi ACID.

- Miền Entity: Quản lý định danh của các chủ thể sở hữu ví hoặc thao tác với hệ thống (Customer, Officer, Biller).
