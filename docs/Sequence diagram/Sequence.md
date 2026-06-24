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

# 2. Chuyển tiền P2P

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
    E->>E: Dựng TRANSBODY, tra cứu SENDERID và RECEIVERID
    E->>E: Validate định dạng và nghiệp vụ, tính phí
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
    E->>D: validateStateAndLock(SENDERPHONE) (Set state='inProgress')
    E->>E: Kiểm tra lại PIN và validate lại định dạng
    E->>E: Tính lại phí
    E->>D: TransValidation (Kiểm tra lại số dư hiện tại của SENDER)

    rect rgba(120, 120, 120, 0.15)
        Note over E,D: session.withTransaction() bắt đầu
        E->>D: START DB TRANSACTION
        loop Qua từng step trong glSteps (Bỏ qua nếu amount = 0)
            E->>D: Trừ ví nguồn và cộng ví đích (native $inc: { balance })
            E->>E: Tính lại Hash Checksum cho cả 2 ví
            E->>D: Lưu Checksum mới vào 2 ví
            E->>D: Tạo PocketEntry (transRefId, stepOrder, debit, credit, amount)
        end
        E->>D: Tạo Transaction (Biên lai tổng kết)
        E->>D: Update TransactionTrail (status = 'done')
        E->>D: COMMIT DB TRANSACTION
    end

    Note over E,D: Mở khoá ví ở mọi lối ra
    E->>D: releaseAccount(SENDERPHONE) (Set state='active')
    E-->>A: Trả về Envelope chứa thông tin Transaction
    A-->>C: Hiển thị giao dịch thành công
```

# 3. Cash-in

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
    E->>D: validateStateAndLock(BANK_POCKET) (Set state='inProgress')
    E->>E: Bỏ qua kiểm tra PIN (auth = NONE)

    rect rgba(120, 120, 120, 0.15)
        Note over E,D: session.withTransaction() bắt đầu
        E->>D: START DB TRANSACTION
        E->>D: Chạy glStep: Trừ Ví Bank, cộng Ví Khách (native $inc: { balance })
        E->>E: Tính lại Hash Checksum cho cả 2 ví
        E->>D: Cập nhật Checksum
        E->>D: Ghi PocketEntry và Transaction
        E->>D: Update Trail status = done
        E->>D: COMMIT DB TRANSACTION
    end

    E->>D: releaseAccount(BANK_POCKET) (Set state='active')
    E-->>A: Transaction data
    A-->>O: Nạp tiền thành công
```

---

# 4. Bill Payment

Đặc thù: Số tiền không do người dùng nhập mà tra cứu từ hệ thống ngoài. Phải gọi sang đối tác để xác nhận thanh toán trước khi ghi sổ.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant A as API Layer
    participant E as Core Engine
    participant D as Database
    participant B as Mock Biller

    %% BƯỚC 1: REQUEST & INQUIRY
    C->>A: POST /engine/request (service: BILL, billerId, billCode)
    A->>E: processRequestStep()
    E->>B: GET /inquiry (billCode)
    B-->>E: Trả về số tiền hoá đơn (amount)
    E->>E: Ghi đè AMOUNT, tính phí
    E->>D: Khởi tạo TransactionTrail (status: pending)
    E-->>A: Preview (transRefId, amount từ Biller, phí)
    A-->>C: Hiển thị số tiền nợ & yêu cầu tiếp tục

    %% BƯỚC 2: CONFIRM
    C->>A: POST /engine/confirm (transRefId)
    A->>E: processConfirmStep()
    E-->>A: authMethod: "PIN"
    A-->>C: Yêu cầu nhập PIN

    %% BƯỚC 3: VERIFY
    C->>A: POST /engine/verify (transRefId, pin)
    A->>E: processVerifyStep()
    E->>D: validateStateAndLock(SENDERPHONE)
    E->>E: Verify mã PIN hợp lệ

    rect rgba(120, 120, 120, 0.15)
        Note over E,D: session.withTransaction() bắt đầu
        E->>D: START DB TRANSACTION
        loop Qua từng step trong glSteps
            E->>D: Trừ ví Khách, cộng ví Biller và System ($inc balance)
            E->>E: Cập nhật Hash Checksum
            E->>D: Ghi PocketEntry
        end
        E->>D: Tạo Transaction
        E->>D: COMMIT DB TRANSACTION (Tiền đã được thu)
    end

    %% GỌI PAYMENT SAU KHI ĐÃ THU TIỀN
    E->>B: POST /payment (transRefId, billCode, amount)
    Note over E,B: Truyền transRefId để Biller nhận diện (Idempotency)

    alt Biller trả về Thành công
        E->>D: Update Trail status = done
        E->>D: releaseAccount(SENDERPHONE)
        E-->>A: Trả về kết quả giao dịch
        A-->>C: Thanh toán hoá đơn thành công
    else Biller trả về Thất bại / Timeout
        E->>D: Update Trail status = refund_pending
        Note over E,D: Cần hoàn tiền (Reversal) thủ công do Biller lỗi
        E->>D: releaseAccount(SENDERPHONE)
        E-->>A: Trả lỗi "Gạch nợ thất bại, hệ thống sẽ hoàn tiền"
        A-->>C: Thông báo lỗi
    end
```
