# API Specification

## 1. Nhóm Xác thực (Authentication)

| HTTP Method | Endpoint                | Đầu vào (Body)     | Đầu ra (Data)   | Mục đích                                                    |
| ----------- | ----------------------- | ------------------ | --------------- | ----------------------------------------------------------- |
| POST        | /auth/customer/register | phone, pin         | token, customer | Đăng ký khách hàng, hệ thống tự động tạo Pocket với số dư 0 |
| POST        | /auth/customer/login    | phone, pin         | token           | Đăng nhập luồng Customer                                    |
| POST        | /auth/admin/login       | username, password | token           | Đăng nhập luồng Admin (Officer)                             |

---

## 2. Nhóm Ví & Lịch sử (Customer View)

| HTTP Method | Endpoint         | Đầu vào (Query/Header) | Đầu ra (Data)     | Mục đích                                                                      |
| ----------- | ---------------- | ---------------------- | ----------------- | ----------------------------------------------------------------------------- |
| GET         | /pockets/me      | Token (Header)         | balance, currency | Tra cứu số dư (phải tính toán lại và kiểm tra checksum trước khi trả dữ liệu) |
| GET         | /transactions/me | page, limit            | [Transaction]     | Tra cứu danh sách lịch sử các biên lai giao dịch thành công                   |

---

## 3. Nhóm Engine 3 Bước (Transaction)

| HTTP Method | Endpoint        | Đầu vào (Body)                    | Đầu ra (Data)                        | Mục đích                                                                                                                     |
| ----------- | --------------- | --------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| POST        | /engine/request | serviceCode, parameters           | transRefId, amount, fee, totalAmount | Dựng biến, kiểm tra định dạng, (gọi enquiry nếu là Bill), tính phí, chốt tổng. Đổi trạng thái Trail thành pending            |
| POST        | /engine/confirm | transRefId, authMethod (PIN/NONE) | flag xác thực                        | Nạp lại Trail từ database, kiểm tra cấu hình xác thực và trả cờ hiệu cho Frontend                                            |
| POST        | /engine/verify  | transRefId, pin (tuỳ chọn)        | Transaction                          | Khoá ví người gửi, kiểm tra PIN, (gọi payment url nếu là Bill), chạy ghi sổ kép bằng database transaction (ACID), mở khoá ví |

---

## 4. Nhóm Quản trị (Admin / Officer)

### 4.1. Cấu hình & Đối tác (CRUD Config & Biller)

Nhóm API phục vụ màn hình Transaction Design và Quản lý Biller.

| HTTP Method               | Endpoint                 | Mục đích                                                     |
| ------------------------- | ------------------------ | ------------------------------------------------------------ |
| GET / POST / PUT / DELETE | /admin/services          | Quản lý danh sách nghiệp vụ                                  |
| GET / POST / PUT / DELETE | /admin/trans-fields      | Cấu hình định dạng dữ liệu đầu vào                           |
| GET / POST / PUT / DELETE | /admin/trans-validations | Cấu hình hàm luật nghiệp vụ                                  |
| GET / POST / PUT / DELETE | /admin/trans-definitions | Cấu hình các bút toán ghi sổ kép (glSteps)                   |
| GET / POST / PUT / DELETE | /admin/billers           | Quản lý đối tác (tự động sinh ví biller khi gọi method POST) |

---

### 4.2. Vận hành (Operations)

| HTTP Method | Endpoint         | Đầu vào (Body/Query)  | Đầu ra (Data)      | Mục đích                                                                                                           |
| ----------- | ---------------- | --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| POST        | /admin/cash-in   | receiverPhone, amount | Transaction        | Nạp tiền cho khách. Server tự động gọi ngầm luồng request -> verify (bỏ qua confirm), nguồn tiền chuyển từ Ví Bank |
| GET         | /admin/trails    | page, limit, status   | [TransactionTrail] | Xem danh sách toàn bộ hồ sơ giao dịch, hỗ trợ gỡ lỗi thông qua mảng transStepLog                                   |
| GET         | /admin/pockets   | type                  | [Pocket]           | Xem danh sách ví (đặc biệt là Ví System và Ví Bank)                                                                |
| GET         | /admin/customers | phone                 | [Customer]         | Tra cứu khách hàng                                                                                                 |
