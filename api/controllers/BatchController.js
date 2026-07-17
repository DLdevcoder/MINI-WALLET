const RespCode = require('../services/Respcode');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ChecksumService = require('../services/ChecksumService');

const PocketService = require('../services/PocketService');

module.exports = {

    payout: async function (req, res) {
        let merchantPocketId = null;
        let transRefId = 'BATCH' + Date.now() + Math.floor(1000 + Math.random() * 9000);

        try {
            const { pin, transactions, serviceCode } = req.body;
            const codeToRun = serviceCode || 'BATCH_PAYOUT';

            if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
                return res.error(RespCode.INVALID_PARAMS);
            }

            if (transactions.length > 2000) {
                return res.error(RespCode.BATCH_LIMIT_EXCEEDED);
            }

            // 1. Xác thực người gửi (Merchant)
            const customer = await Customer.findOne({ phone: req.user.phone });
            if (!customer) return res.error(RespCode.USER_NOT_FOUND);

            if (customer.status !== 'active') {
                return res.error(RespCode.ACCOUNT_LOCKED);
            }

            merchantPocketId = customer.pocket;

            if (!pin) return res.error(RespCode.MISSING_PIN);
            
            const isMatch = bcrypt.compareSync(pin.toString(), customer.pinHash);
            if (!isMatch) {
                let attempts = (customer.failedPinAttempts || 0) + 1;
                let newStatus = customer.status;

                if (attempts >= 5) {
                    newStatus = 'locked';
                }
                
                await Customer.update({ id: customer.id }, { failedPinAttempts: attempts, status: newStatus });
                
                if (newStatus === 'locked') {
                    return res.error(RespCode.ACCOUNT_LOCKED);
                }
                return res.error(RespCode.INVALID_OTP);
            }

            // Xác thực PIN thành công -> Reset số lần sai PIN
            if (customer.failedPinAttempts > 0) {
                await Customer.update({ id: customer.id }, { failedPinAttempts: 0 });
            }

            // 1. Lấy thông tin service
            const batchService = await Service.findOne({ code: codeToRun });
            if (!batchService || batchService.status !== 'active') {
                return res.error(RespCode.SERVICE_UNAVAILABLE);
            }
            if (batchService.baseTemplate !== 'BATCH') {
                return res.error(RespCode.INVALID_PARAMS, 'Dịch vụ này không hỗ trợ chuyển lô (Batch Payout)');
            }
            const serviceId = batchService.id;

            // 2. Validate dữ liệu & Tra cứu ví nhận
            let totalAmount = 0;
            let totalFee = 0;
            const validTransactions = [];

            for (const t of transactions) {
                if (!t.receiverPhone || !t.amount || isNaN(parseFloat(t.amount)) || parseFloat(t.amount) <= 0) {
                    continue; // Bỏ qua dòng lỗi
                }
                const amt = parseFloat(t.amount);

                // Tra cứu receiver
                const receiver = await Customer.findOne({ phone: String(t.receiverPhone) });
                if (receiver && String(receiver.pocket) !== String(merchantPocketId)) {
                    
                    // Tính phí cho giao dịch này dựa trên cấu hình service
                    let fee = 0;
                    if (batchService.fee) {
                        if (batchService.fee.type === 'fixed') {
                            fee = batchService.fee.value || 0;
                        } else if (batchService.fee.type === 'percent') {
                            fee = amt * (batchService.fee.value / 100);
                            if (batchService.fee.max && fee > batchService.fee.max) fee = batchService.fee.max;
                        }
                    }

                    validTransactions.push({
                        receiverPhone: t.receiverPhone,
                        receiverPocket: receiver.pocket,
                        amount: amt,
                        fee: fee
                    });
                    totalAmount += (amt + fee);
                    totalFee += fee;
                }
            }

            if (validTransactions.length === 0) {
                return res.error(RespCode.INVALID_PARAMS);
            }

            // 3. Khoá ví Merchant (chỉ 1 lần duy nhất)
            const merchantPocket = await Pocket.findOne({ id: merchantPocketId });
            if (!merchantPocket) {
                return res.error(RespCode.POCKET_NOT_FOUND);
            }

            // [CHECKSUM ENFORCEMENT] Kiểm tra toàn vẹn ví merchant
            if (!ChecksumService.verify(merchantPocket)) {
                return res.error(RespCode.DATA_INTEGRITY_ERROR);
            }

            const locked = await PocketService.lockPocket(merchantPocketId);
            if (!locked) {
                return res.error(RespCode.INVALID_TRANS_STATE);
            }

            // 4. Kiểm tra số dư tổng
            if ((merchantPocket.balance || 0) < totalAmount) {
                await PocketService.unlockPocket(merchantPocketId);
                return res.error(RespCode.INSUFFICIENT_BALANCE);
            }

            // 5. Trừ tổng tiền Merchant + ghi PocketEntry tổng (debit phía Merchant)
            await PocketService.updatePocketBalance(merchantPocketId, -totalAmount);

            await PocketEntry.create({
                transRefId: transRefId,
                stepOrder: 0,
                debit: merchantPocketId,
                credit: null,
                amount: totalAmount,
                status: 'settled'
            });

            // Ghi nhận phí hệ thống (nếu có)
            if (totalFee > 0) {
                let sysFeePocket = await Pocket.findOne({ ownerLevel: 'SYSTEM_FEE' });
                if (sysFeePocket) {
                    await PocketService.updatePocketBalance(sysFeePocket.id, totalFee);
                    await PocketEntry.create({
                        transRefId: transRefId,
                        stepOrder: 0,
                        debit: null,
                        credit: sysFeePocket.id,
                        amount: totalFee,
                        status: 'settled',
                        note: 'Thu phí hệ thống'
                    });
                }
            }

            // 6. Cộng tiền hàng loạt cho Receiver
            const successRecords = [];
            for (let i = 0; i < validTransactions.length; i++) {
                const t = validTransactions[i];
                try {
                    const code = 'GD' + Date.now() + Math.floor(100 + Math.random() * 900);
                    const transRecord = await Transaction.create({
                        code: code,
                        transRefId: transRefId,
                        service: serviceId,
                        sender: merchantPocketId,
                        receiver: t.receiverPocket,
                        amount: t.amount,
                        fee: t.fee,
                        totalAmount: t.amount + t.fee,
                        status: 'done'
                    });

                    // Cộng tiền cho Receiver (gốc)
                    await PocketService.updatePocketBalance(t.receiverPocket, t.amount);

                    // Bút toán credit: merchant → receiver (từng dòng rõ ràng)
                    await PocketEntry.create({
                        transRefId: transRefId,
                        stepOrder: i + 1,
                        debit: merchantPocketId,
                        credit: t.receiverPocket,
                        amount: t.amount,
                        status: 'settled'
                    });

                    successRecords.push({
                        receiverPhone: t.receiverPhone,
                        amount: t.amount,
                        transactionCode: transRecord.code
                    });
                } catch (e) {
                    console.error('Lỗi cộng tiền cho', t.receiverPhone, e);
                }
            }

            // Tạo Trail tổng
            await TransactionTrail.create({
                transRefId: transRefId,
                inputMessage: {
                    serviceCode: codeToRun,
                    type: codeToRun,
                    totalCount: validTransactions.length,
                    successCount: successRecords.length,
                    totalAmount: totalAmount,
                    fee: totalFee
                },
                status: 'done'
            });

            // 7. Mở khoá ví
            await PocketService.unlockPocket(merchantPocketId);

            return res.ok({
                batchRefId: transRefId,
                totalAmount: totalAmount,
                successCount: successRecords.length,
                records: successRecords
            }, RespCode.BATCH_SUCCESS.message);

        } catch (error) {
            console.error('Batch Payout Error:', error);
            if (merchantPocketId) {
                await PocketService.unlockPocket(merchantPocketId);
            }
            return res.error(RespCode.SYSTEM_ERROR);
        }
    }

};
