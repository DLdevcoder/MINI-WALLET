# ERD & Data Dictionary

## 1. Data Domains

Hệ thống được chia thành 3 khu vực lưu trữ tách biệt hoàn toàn về bản chất logic:

- Miền Configuration: Lưu trữ cấu hình sinh ra từ Officer. Dữ liệu này đóng vai trò như "bản vẽ kỹ thuật", chủ yếu được đọc (Read) bởi engine tại thời điểm chạy (runtime).

- Miền Ledger & Engine: Quản lý trạng thái luồng 3 bước (Trail) và các biến động tài chính (Pocket, Entry, Transaction). Khu vực này cốt lõi yêu cầu sự chính xác tuyệt đối và bị ràng buộc bởi ACID.

- Miền Entity: Quản lý định danh của các chủ thể sở hữu ví hoặc thao tác với hệ thống (Customer, Officer, Biller).

## 2. Entity Relationship

Config:

- Mô hình Service đóng vai trò trung tâm.

- Service liên kết 1-N với TransField (kiểm tra định dạng) và TransValidation (luật nghiệp vụ) qua khoá ngoại lưu dưới dạng String(service.\_id).

- Service liên kết 1-1 với TransDefinition (kịch bản ghi sổ glSteps).

Ledger:

- Mỗi Customer hoặc Biller liên kết 1-1 với một Pocket. Hệ thống cũng khởi tạo các Pocket độc lập (System, Bank).

- Một TransactionTrail (chứa input, output, trạng thái 3 bước) nhận diện qua khóa ngẫu nhiên transRefId.

- Khi Verify thành công, một TransactionTrail sẽ liên kết 1-1 với một Transaction và 1-N với PocketEntry. Tất cả tham chiếu chéo qua transRefId.

## 3. Data Dictionary

### 3.1. Miền Configuration

#### Model: Service

Mô tả danh tính nghiệp vụ, luật dựng biến ban đầu, phí và cơ chế xác thực.

| Thuộc tính    | Kiểu dữ liệu | Mô tả & Ràng buộc                                                                            |
| ------------- | ------------ | -------------------------------------------------------------------------------------------- |
| \_id          | ObjectId     | Khóa chính                                                                                   |
| code          | String       | Mã nghiệp vụ duy nhất (VD: P2P_TRANSFER, CASH_IN)                                            |
| name          | String       | Tên hiển thị                                                                                 |
| fieldBuilder  | Array        | Mảng object dựng biến: `{ order, name, rule, source, variable, query, datatype, errorCode }` |
| amountFormula | String       | Công thức tính gốc                                                                           |
| action        | String       | `none` (P2P, Cash-in) hoặc `billerTrans` (Bill Payment)                                      |
| actionParams  | Object       | Tham số phụ, VD: `{ billerId: "EVN" }`                                                       |
| fee           | Object       | `{ type: 'fixed'/'percent', value: Number, max: Number }`                                    |
| auth          | Object       | `{ method: 'PIN'/'NONE' }`                                                                   |
| status        | String       | `active` / `inactive`                                                                        |

> **Rule hỗ trợ:** `fixed`, `mapping`, `query`

---

#### Model: TransField

Định dạng dữ liệu cho từng biến trong `TRANSBODY`.

| Thuộc tính            | Kiểu dữ liệu | Mô tả & Ràng buộc                            |
| --------------------- | ------------ | -------------------------------------------- |
| \_id                  | ObjectId     | Khóa chính                                   |
| service               | String       | FK → Service (`String(service._id)`)         |
| fieldName             | String       | Tên biến (bắt buộc có `SERVICEID`)           |
| fieldFormat           | String       | Kiểu dữ liệu (`string`, `number`, `boolean`) |
| minLength / maxLength | Number       | Độ dài cho phép                              |
| regex                 | String       | Mẫu kiểm tra                                 |
| isRequired            | Boolean      | Bắt buộc                                     |
| needSecured           | Boolean      | Che log                                      |
| order                 | Number       | Thứ tự kiểm tra                              |
| errorCode             | String       | Mã lỗi                                       |
| status                | String       | `active` / `inactive`                        |

---

#### Model: TransValidation

Luật nghiệp vụ chạy trước khi thay đổi tiền.

| Thuộc tính     | Kiểu dữ liệu | Mô tả & Ràng buộc                                     |
| -------------- | ------------ | ----------------------------------------------------- |
| \_id           | ObjectId     | Khóa chính                                            |
| service        | String       | FK → Service                                          |
| validateFunc   | String       | Tên hàm validator                                     |
| validateFields | String       | Các field truyền vào (VD: `SENDERID:AMOUNT:DEBITFEE`) |
| order          | Number       | Thứ tự chạy                                           |
| errorCode      | String       | Mã lỗi                                                |
| status         | String       | `active` / `inactive`                                 |

---

#### Model: TransDefinition

Kịch bản ghi sổ kép.

| Thuộc tính | Kiểu dữ liệu | Mô tả & Ràng buộc                                                    |
| ---------- | ------------ | -------------------------------------------------------------------- |
| \_id       | ObjectId     | Khóa chính                                                           |
| code       | String       | FK → Service                                                         |
| glSteps    | Array        | `{ order, amount, debit: {level, target}, credit: {level, target} }` |

> **level:** `productLevel` (tra động) hoặc `wallet` (cố định)

---

### 3.2. Miền Ledger & Engine

#### Model: Pocket

Sổ ghi nhận số dư (chỉ cập nhật bằng `$inc`).

| Thuộc tính | Kiểu dữ liệu    | Mô tả & Ràng buộc                      |
| ---------- | --------------- | -------------------------------------- |
| \_id       | ObjectId        | Khóa chính                             |
| user       | String/ObjectId | Chủ sở hữu                             |
| client     | String          | `customer`, `biller`, `system`, `bank` |
| currency   | String          | VD: VND                                |
| balance    | Number          | Số dư                                  |
| checksum   | String          | Chống sửa                              |
| status     | String          | `active` / `locked`                    |

---

#### Model: TransactionTrail

Hồ sơ toàn vẹn giao dịch 3 bước.

| Thuộc tính    | Kiểu dữ liệu | Mô tả                          |
| ------------- | ------------ | ------------------------------ |
| id            | String       | `transRefId`                   |
| inputMessage  | Object       | Dữ liệu thô                    |
| outputMessage | Object       | Chuẩn hóa (có `TRANSREFID`)    |
| transStepLog  | Array        | Log từng bước                  |
| status        | String       | `init → pending → done/failed` |

---

#### Model: PocketEntry

Nhật ký bút toán (immutable).

| Thuộc tính | Kiểu dữ liệu | Mô tả                 |
| ---------- | ------------ | --------------------- |
| \_id       | ObjectId     | Khóa chính            |
| transRefId | String       | FK → TransactionTrail |
| stepOrder  | Number       | Mapping glSteps       |
| debit      | String       | Pocket bị trừ         |
| credit     | String       | Pocket nhận           |
| amount     | Number       | Giá trị               |
| status     | String       | `settled`             |

---

#### Model: Transaction

Biên lai cuối.

| Thuộc tính  | Kiểu dữ liệu | Mô tả             |
| ----------- | ------------ | ----------------- |
| \_id        | ObjectId     | Khóa chính        |
| code        | String       | Mã giao dịch      |
| transRefId  | String       | FK                |
| service     | String       | FK → Service      |
| sender      | String       | Người gửi         |
| receiver    | String       | Người nhận        |
| amount      | Number       | Tiền gốc          |
| fee         | Number       | Phí               |
| totalAmount | Number       | Tổng trừ          |
| status      | String       | `done` / `failed` |

---

### 3.3. Miền Entity (Định danh & Đối tác)

#### Model: Customer

| Thuộc tính | Kiểu dữ liệu | Mô tả               |
| ---------- | ------------ | ------------------- |
| \_id       | ObjectId     | Khóa chính          |
| phone      | String       | Unique              |
| pinHash    | String       | Mã hóa              |
| pocket     | String       | PocketId            |
| status     | String       | `active` / `locked` |

---

#### Model: Officer

| Thuộc tính   | Kiểu dữ liệu | Mô tả                 |
| ------------ | ------------ | --------------------- |
| \_id         | ObjectId     | Khóa chính            |
| username     | String       | Unique                |
| passwordHash | String       | Mã hóa                |
| status       | String       | `active` / `inactive` |

---

#### Model: Biller

| Thuộc tính | Kiểu dữ liệu | Mô tả                 |
| ---------- | ------------ | --------------------- |
| \_id       | ObjectId     | Khóa chính            |
| billerCode | String       | VD: EVN               |
| name       | String       | Tên đối tác           |
| inquiryUrl | String       | API tra cứu           |
| paymentUrl | String       | API thanh toán        |
| pocket     | String       | PocketId              |
| status     | String       | `active` / `inactive` |
