/**
 * MockBillerController
 * Đóng vai hệ thống Biller bên ngoài (EVN điện lực giả lập).
 * Hai endpoint:
 *   GET  /mock/evn/inquiry  — tra cứu hoá đơn theo billCode
 *   POST /mock/evn/payment  — xác nhận thanh toán (idempotent theo transRefId)
 */
module.exports = {

    /**
     * GET /mock/evn/inquiry?billCode=EVN001
     * Trả về số tiền hoá đơn nếu tìm thấy và chưa thanh toán.
     * Response thành công:  { success: true,  amount, customerName, billCode }
     * Response thất bại:    { success: false, error: 'BILL_NOT_FOUND' | 'BILL_ALREADY_PAID' }
     */
    inquiry: async function (req, res) {
        try {
            const billCode = req.body.billCode;

            if (!billCode) {
                return res.error(RespCode.INVALID_PARAMS, 'MISSING_BILL_CODE');
            }

            const bill = await MockBill.findOne({ billCode: String(billCode) });

            if (!bill) {
                return res.error(RespCode.BILL_NOT_FOUND);
            }

            if (bill.isPaid) {
                return res.error(RespCode.BILL_ALREADY_PAID);
            }

            return res.ok({
                billCode: bill.billCode,
                billerCode: bill.billerCode,
                customerName: bill.customerName,
                amount: bill.amount
            });

        } catch (error) {
            console.error('[MockBiller] Inquiry Error:', error);
            return res.error(RespCode.SYSTEM_ERROR, 'BILLER_INTERNAL_ERROR');
        }
    },

    /**
     * POST /mock/evn/payment
     * Body: { transRefId, billCode, amount }
     * Đánh dấu hoá đơn đã thanh toán + trả billerRefId.
     * Idempotent: nếu transRefId đã dùng → trả lại kết quả cũ (không thu thêm).
     * Response thành công:  { success: true,  billerRefId }
     * Response thất bại:    { success: false, error: '...' }
     */
    payment: async function (req, res) {
        try {
            const { transRefId, billCode, amount } = req.body;

            if (!transRefId || !billCode || !amount) {
                return res.error(RespCode.INVALID_PARAMS, 'MISSING_PARAMS');
            }

            const bill = await MockBill.findOne({ billCode: String(billCode) });

            if (!bill) {
                return res.error(RespCode.BILL_NOT_FOUND);
            }

            // Idempotency: cùng transRefId → trả lại kết quả cũ
            if (bill.isPaid && bill.billerRefId === transRefId) {
                return res.ok({
                    billerRefId: bill.billerRefId,
                    note: 'ALREADY_PROCESSED'
                });
            }

            if (bill.isPaid) {
                return res.error(RespCode.BILL_ALREADY_PAID);
            }

            // Kiểm tra số tiền khớp (biller có thể từ chối nếu amount sai)
            if (parseFloat(amount) !== bill.amount) {
                return res.error(RespCode.INVALID_AMOUNT, 'AMOUNT_MISMATCH');
            }

            // Đánh dấu đã thanh toán + lưu billerRefId = transRefId (để idempotency)
            await MockBill.update({ billCode: String(billCode) }, {
                isPaid: true,
                billerRefId: transRefId
            });

            console.log(`[MockBiller] Thanh toán thành công: billCode=${billCode}, transRefId=${transRefId}`);

            return res.ok({
                billerRefId: transRefId
            });

        } catch (error) {
            console.error('[MockBiller] Payment Error:', error);
            return res.error(RespCode.SYSTEM_ERROR, 'BILLER_INTERNAL_ERROR');
        }
    }
};
