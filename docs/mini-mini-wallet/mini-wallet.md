# 1. Overview

Hệ thống được chia thành 3 cụm mô hình dữ liệu chính:

## Cụm Configuration

- **Service**: Gốc cấu hình, chứa thông tin định danh nghiệp vụ, cơ chế xác thực (PIN/NONE), biểu phí và `fieldBuilder` (cách dựng biến từ request).
- **TransField**: Hợp đồng định dạng dữ liệu (kiểu, độ dài, bắt buộc) cho từng biến trong `TRANSBODY`.
- **TransValidation**: Các quy tắc kiểm tra logic nghiệp vụ (ví dụ: kiểm tra đủ số dư).
- **TransDefinition**: Kịch bản ghi sổ kép (`glSteps`), định nghĩa dòng tiền đi từ ví nào sang ví nào.

## Cụm Ledger & Runtime

- **Pocket**: Lưu trữ số dư (`balance`) và chuỗi mã hoá bảo vệ (`checksum`).
- **TransactionTrail**: Hồ sơ theo dõi toàn bộ vòng đời 1 giao dịch qua 3 bước (Request, Confirm, Verify) thông qua `transRefId`.
- **PocketEntry**: Nhật ký bút toán không thể sửa đổi (Immutable), ghi lại từng bước biến động số dư.
- **Transaction**: Biên lai cố định được sinh ra sau khi tiền đã chạy xong.

## Cụm Entity

- **Customer, Officer, Biller**: Các đối tượng tham gia hệ thống và sở hữu Pocket.

---

# 2. Sơ đồ tuần tự: Chuyển tiền P2P

Đây là luồng chuẩn 3 bước đi từ khách hàng. Nguồn tiền là ví Customer, đích là ví Customer.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant A as API Layer
    participant E as Core Engine
    participant D as Database

    %% BƯỚC 1: REQUEST
    C->>A: POST /engine/request (service: P2P, phone, amount)
    A->>E: processRequestStep()
    E->>D: Đọc Service, TransField, TransValidation
    E->>E: Dựng TRANSBODY, tra cứu SENDERID & RECEIVERID
    E->>E: Validate định dạng & nghiệp vụ, tính phí
    E->>D: Khởi tạo TransactionTrail (status: pending)
    E-->>A: Preview (transRefId, số tiền, phí, tổng cộng)
    A-->>C: Hiển thị Preview giao dịch

    %% BƯỚC 2: CONFIRM
    C->>A: POST /engine/confirm (transRefId)
    A->>E: processConfirmStep()
    E->>D: Nạp lại TransactionTrail
    E->>E: Đọc cấu hình auth trên Service
    E-->>A: authMethod: "PIN"
    A-->>C: Yêu cầu nhập PIN

    %% BƯỚC 3: VERIFY
    C->>A: POST /engine/verify (transRefId, pin)
    A->>E: processVerifyStep()
    E->>D: Khoá Pocket người gửi (inProgress)
    E->>E: Verify mã PIN hợp lệ
    E->>D: Bắt đầu DB Transaction (ACID)
    E->>D: Tính lại phí & chạy glSteps ($inc balance)
    E->>D: Tính lại Checksum ví gửi & nhận
    E->>D: Ghi PocketEntry & Transaction
    E->>D: Update Trail status = done
    E->>D: Commit DB Transaction & Mở khoá Pocket
    E-->>A: Transaction data (Biên lai)
    A-->>C: Hiển thị giao dịch thành công
```

---

# 3. Sơ đồ tuần tự: Cash-in (Medium)

Nghiệp vụ do Officer thực hiện. Server tự động chạy nối tiếp Request và Verify, bỏ qua Confirm vì Officer không cần xác thực PIN (`auth: NONE`). Nguồn tiền cố định từ ví bank.

```mermaid
sequenceDiagram
    autonumber
    actor O as Officer
    participant A as API Layer
    participant E as Core Engine
    participant D as Database

    O->>A: POST /admin/cash-in (receiverPhone, amount)

    %% REQUEST
    A->>E: processRequestStep()
    E->>D: Đọc cấu hình Cash-in (nguồn: Ví Bank)
    E->>E: Dựng TRANSBODY, tra ID ví khách hàng
    E->>D: Khởi tạo TransactionTrail (status: pending)

    %% VERIFY (BỎ QUA CONFIRM)
    A->>E: processVerifyStep(transRefId)
    E->>D: Khoá Ví Bank (inProgress)
    E->>E: Bỏ qua kiểm tra PIN (auth = NONE)
    E->>D: Bắt đầu DB Transaction (ACID)
    E->>D: Chạy glStep: Trừ Ví Bank, Cộng Ví Khách
    E->>D: Tính lại Checksum hai ví
    E->>D: Ghi PocketEntry & Transaction
    E->>D: Update Trail status = done
    E->>D: Commit DB Transaction & Mở khoá Ví Bank
    E-->>A: Transaction data
    A-->>O: Nạp tiền thành công
```

---

# 4. Sơ đồ tuần tự: Thanh toán hoá đơn / Bill Payment (High)

Đặc thù: Số tiền không do người dùng nhập mà tra cứu từ hệ thống ngoài . Phải gọi sang đối tác để xác nhận thanh toán trước khi ghi sổ.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant A as API Layer
    participant E as Core Engine
    participant B as Mock Biller
    participant D as Database

    %% REQUEST + INQUIRY
    C->>A: POST /engine/request (service: BILL, billerId, billCode)
    A->>E: processRequestStep()
    E->>B: GET /inquiry (billCode)
    B-->>E: Trả về số tiền hoá đơn (amount)
    E->>E: Ghi đè AMOUNT, tính phí
    E->>D: Khởi tạo TransactionTrail (status: pending)
    E-->>A: Preview (transRefId, amount từ Biller, phí)
    A-->>C: Hiển thị số tiền nợ

    %% CONFIRM
    C->>A: POST /engine/confirm (transRefId)
    A->>E: processConfirmStep()
    E-->>A: authMethod: "PIN"
    A-->>C: Yêu cầu nhập PIN

    %% VERIFY + PAYMENT
    C->>A: POST /engine/verify (transRefId, pin)
    A->>E: processVerifyStep()
    E->>D: Khoá Pocket người gửi
    E->>E: Verify mã PIN hợp lệ

    %% CALL BILLER
    E->>B: POST /payment (transRefId, billCode, amount)
    Note over E,B: Truyền transRefId để đảm bảo idempotency
    B-->>E: Payment Success

    %% LEDGER
    E->>D: Bắt đầu DB Transaction (ACID)
    E->>D: Chạy glSteps: Trừ ví Khách, Cộng ví Biller & System
    E->>D: Tính Checksum, ghi PocketEntry, Transaction
    E->>D: Commit DB Transaction & Mở khoá Pocket
    E-->>A: Transaction data
    A-->>C: Thanh toán hoá đơn thành công
```
