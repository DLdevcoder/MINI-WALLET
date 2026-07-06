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
            const billCode = req.query.billCode || req.body.billCode;

            if (!billCode) {
                return res.json({ success: false, error: 'MISSING_BILL_CODE' });
            }

            const bill = await MockBill.findOne({ billCode: String(billCode) });

            if (!bill) {
                return res.json({ success: false, error: 'BILL_NOT_FOUND' });
            }

            if (bill.isPaid) {
                return res.json({ success: false, error: 'BILL_ALREADY_PAID' });
            }

            return res.json({
                success: true,
                billCode: bill.billCode,
                billerCode: bill.billerCode,
                customerName: bill.customerName,
                amount: bill.amount
            });

        } catch (error) {
            console.error('[MockBiller] Inquiry Error:', error);
            return res.json({ success: false, error: 'BILLER_INTERNAL_ERROR' });
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
                return res.json({ success: false, error: 'MISSING_PARAMS' });
            }

            const bill = await MockBill.findOne({ billCode: String(billCode) });

            if (!bill) {
                return res.json({ success: false, error: 'BILL_NOT_FOUND' });
            }

            // Idempotency: cùng transRefId → trả lại kết quả cũ
            if (bill.isPaid && bill.billerRefId === transRefId) {
                return res.json({
                    success: true,
                    billerRefId: bill.billerRefId,
                    note: 'ALREADY_PROCESSED'
                });
            }

            if (bill.isPaid) {
                return res.json({ success: false, error: 'BILL_ALREADY_PAID' });
            }

            // Kiểm tra số tiền khớp (biller có thể từ chối nếu amount sai)
            if (parseFloat(amount) !== bill.amount) {
                return res.json({ success: false, error: 'AMOUNT_MISMATCH' });
            }

            // Đánh dấu đã thanh toán + lưu billerRefId = transRefId (để idempotency)
            await MockBill.update({ billCode: String(billCode) }, {
                isPaid: true,
                billerRefId: transRefId
            });

            console.log(`[MockBiller] Thanh toán thành công: billCode=${billCode}, transRefId=${transRefId}`);

            return res.json({
                success: true,
                billerRefId: transRefId
            });

        } catch (error) {
            console.error('[MockBiller] Payment Error:', error);
            return res.json({ success: false, error: 'BILLER_INTERNAL_ERROR' });
        }
    }
};
