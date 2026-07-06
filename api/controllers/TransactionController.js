const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const RespCode = require('../services/Respcode');
const ChecksumService = require('../services/ChecksumService');

// Dùng native MongoDB để $inc balance + cập nhật checksum cùng lúc
function updatePocketBalance(pocketId, amountChange) {
    return new Promise((resolve, reject) => {
        Pocket.native(function (err, collection) {
            if (err) return reject(err);

            let objectId;
            try {
                const mongodb = require('mongodb');
                const ObjectId = mongodb.ObjectID || mongodb.ObjectId;
                objectId = new ObjectId(pocketId);
            } catch (e) {
                objectId = pocketId; // fallback nếu là string thuần
            }

            collection.findOneAndUpdate(
                { _id: objectId },
                { $inc: { balance: amountChange } },
                // Bổ sung returnDocument: 'after' để hỗ trợ các phiên bản MongoDB driver mới
                { returnOriginal: false, returnDocument: 'after' },
                function (err, result) {
                    if (err) return reject(err);

                    // Tương thích chuẩn trả về của driver v3, v4 và v5
                    const doc = result.value || result;
                    if (!doc || doc.balance === undefined) {
                        return reject(new Error('Pocket not found or missing balance: ' + pocketId));
                    }

                    const newBalance = doc.balance;
                    const newChecksum = ChecksumService.compute(newBalance, pocketId);

                    collection.updateOne(
                        { _id: objectId },
                        { $set: { checksum: newChecksum } },
                        function (err2) {
                            if (err2) return reject(err2);
                            resolve({ newBalance, newChecksum });
                        }
                    );
                }
            );
        });
    });
}

/**
 * Giải quyết Pocket ID từ level + target
 */
async function resolvePocketId(level, target, transBody) {
    if (level === 'wallet') {
        // Nếu target nằm trong transBody (như 'RECEIVERID'), lấy ID thật (như 'BILLER_EVN')
        // Nếu không có, hiểu target chính là ID cứng (như 'SYSTEM_FEE')
        const realTarget = transBody[target] !== undefined ? transBody[target] : target;

        // Truy vấn ví hệ thống qua trường 'user'
        const pocket = await Pocket.findOne({ user: realTarget });
        return pocket ? pocket.id : null;
    }

    // level === 'productLevel': target LUÔN là một biến trong transBody (VD: 'SENDERID', 'RECEIVERID')
    return transBody[target] || null;
}

/**
 * Khoá ví người gửi bằng Native DB để tránh ORM ghi đè
 */
function lockPocket(pocketId) {
    return new Promise((resolve, reject) => {
        Pocket.native(function (err, collection) {
            if (err) return reject(err);

            let objectId;
            try {
                const mongodb = require('mongodb');
                const ObjectId = mongodb.ObjectID || mongodb.ObjectId;
                objectId = new ObjectId(pocketId);
            } catch (e) {
                objectId = pocketId;
            }

            collection.findOneAndUpdate(
                { _id: objectId, status: 'active' },
                { $set: { status: 'inProgress' } },
                function (err, result) {
                    if (err) return reject(err);
                    const doc = result.value || result;
                    resolve(!!doc);
                }
            );
        });
    });
}

/**
 * Mở khoá ví bằng Native DB
 */
function unlockPocket(pocketId) {
    return new Promise((resolve) => {
        Pocket.native(function (err, collection) {
            if (err) return resolve(); // Bỏ qua lỗi để tiếp tục luồng trả response

            let objectId;
            try {
                const mongodb = require('mongodb');
                const ObjectId = mongodb.ObjectID || mongodb.ObjectId;
                objectId = new ObjectId(pocketId);
            } catch (e) {
                objectId = pocketId;
            }

            collection.updateOne(
                { _id: objectId },
                { $set: { status: 'active' } },
                function () {
                    resolve();
                }
            );
        });
    });
}

module.exports = {

    // BƯỚC 1 — REQUEST
    request: async function (req, res) {
        try {
            const { serviceCode, parameters } = req.body;

            if (!serviceCode || !parameters) {
                return res.error(RespCode.MISSING_SERVICE_PARAMETERS);
            }

            const service = await Service.findOne({ code: serviceCode, status: 'active' });
            if (!service) {
                return res.error(RespCode.SERVICE_UNAVAILABLE);
            }

            // Dựng TRANSBODY từ fieldBuilder
            let transBody = {};
            const fieldBuilders = (service.fieldBuilder || []).sort((a, b) => (a.order || 0) - (b.order || 0));

            for (const builder of fieldBuilders) {
                const { name, rule, source, variable } = builder;

                if (rule === 'mapping') {
                    const key = source.split('.').pop();
                    if (source.startsWith('ctx.')) {
                        // Lấy từ context JWT
                        if (key === 'senderId') transBody[name] = req.user ? req.user.id : null;
                    } else {
                        // Lấy từ parameters (body request)
                        transBody[name] = (parameters[key] !== undefined) ? parameters[key] : null;
                    }

                } else if (rule === 'fixed') {
                    transBody[name] = (variable !== undefined && variable !== null) ? variable : source;

                } else if (rule === 'query') {
                    if (source === 'queryPocketByPhone') {
                        // Tra Customer theo RECEIVERPHONE, lấy pocket ID thật
                        const phone = transBody['RECEIVERPHONE'];
                        if (phone) {
                            const receiver = await Customer.findOne({ phone: String(phone) });
                            transBody[name] = receiver ? receiver.pocket : null;
                        } else {
                            transBody[name] = null;
                        }
                    } else if (source === 'queryBillerPocket') {
                        // Tra Biller theo billerCode trong parameters, lấy pocket ID
                        const billerCode = parameters['billerCode'] || 'EVN';
                        const biller = await Biller.findOne({ billerCode: String(billerCode) });
                        transBody[name] = biller ? biller.pocket : null;
                        transBody['BILLER_CODE'] = billerCode; // lưu billerCode để dùng sau
                    } else {
                        transBody[name] = null;
                    }
                }
            }

            // Đảm bảo SENDERID luôn được gán từ JWT
            if (!transBody['SENDERID'] && req.user) {
                transBody['SENDERID'] = req.user.id;
            }

            // Validate định dạng (TransField)
            const transFields = await TransField.find({ service: service.id });

            // Gọi Inquiry nếu là billerTrans (TRƯỚC khi validate AMOUNT)
            if (service.action === 'billerTrans') {
                const billCode = transBody['BILLCODE'];
                const receiverId = transBody['RECEIVERID'];

                if (!billCode) {
                    return res.error(RespCode.MISS_INFO);
                }

                // Tra Biller để lấy inquiryUrl
                const biller = await Biller.findOne({ pocket: receiverId });
                if (!biller) {
                    // Thử tra theo billerCode từ RECEIVERID (fallback)
                    return res.error(RespCode.BILLER_NOT_FOUND);
                }

                // Gọi Mock Biller Inquiry (HTTP GET nội bộ)
                let inquiryResult;
                try {
                    const http = require('http');
                    const inquiryUrl = new URL(biller.inquiryUrl + '?billCode=' + encodeURIComponent(billCode));
                    inquiryResult = await new Promise((resolve, reject) => {
                        http.get({
                            hostname: inquiryUrl.hostname,
                            port: inquiryUrl.port || 80,
                            path: inquiryUrl.pathname + inquiryUrl.search,
                            timeout: 5000
                        }, (resp) => {
                            let data = '';
                            resp.on('data', chunk => { data += chunk; });
                            resp.on('end', () => {
                                try { resolve(JSON.parse(data)); }
                                catch (e) { reject(new Error('Invalid biller response')); }
                            });
                        }).on('error', reject).on('timeout', () => reject(new Error('Inquiry timeout')));
                    });
                } catch (e) {
                    console.error('[BillPayment] Inquiry failed:', e.message);
                    return res.error(RespCode.BILLER_INQUIRY_FAILED);
                }

                if (!inquiryResult.success) {
                    if (inquiryResult.error === 'BILL_NOT_FOUND') return res.error(RespCode.BILL_NOT_FOUND);
                    if (inquiryResult.error === 'BILL_ALREADY_PAID') return res.error(RespCode.BILL_ALREADY_PAID);
                    return res.error(RespCode.BILLER_INQUIRY_FAILED);
                }

                // Ghi đè AMOUNT từ kết quả inquiry (khách không tự nhập)
                transBody['AMOUNT'] = inquiryResult.amount;
                transBody['BILLER_ID'] = biller.id; // lưu để dùng ở Verify
                console.log(`[BillPayment] Inquiry OK: billCode=${billCode}, amount=${inquiryResult.amount}`);
            }

            for (const tf of transFields) {
                const val = transBody[tf.fieldName];

                if (tf.isRequired && (val === undefined || val === null || val === '')) {
                    return res.error(RespCode.MISS_INFO);
                }

                if (tf.regex && val !== null && val !== undefined) {
                    const regex = new RegExp(tf.regex);
                    if (!regex.test(val.toString())) {
                        return res.error(RespCode.INVALID_FIELD_FORMAT);
                    }
                }
            }

            // Kiểm tra người nhận tồn tại sau khi query
            if (transBody['RECEIVERPHONE'] && !transBody['RECEIVERID']) {
                return res.error(RespCode.USER_NOT_FOUND);
            }

            // Không được chuyển tiền cho chính mình
            if (transBody['SENDERID'] && transBody['RECEIVERID'] &&
                String(transBody['SENDERID']) === String(transBody['RECEIVERID'])) {
                return res.error(RespCode.TRANSFER_SELF);
            }

            // Tính phí
            let amount = parseFloat(transBody['AMOUNT']) || 0;
            let fee = 0;

            if (service.fee) {
                if (service.fee.type === 'fixed') {
                    fee = service.fee.value || 0;
                } else if (service.fee.type === 'percent') {
                    fee = amount * (service.fee.value / 100);
                    if (service.fee.max && fee > service.fee.max) fee = service.fee.max;
                }
            }

            const totalAmount = amount + fee;

            // Kiểm tra số dư sơ bộ
            if (transBody['SENDERID']) {
                const senderPocket = await Pocket.findOne({ id: transBody['SENDERID'] });
                if (!senderPocket) {
                    return res.error(RespCode.POCKET_NOT_FOUND);
                }
                
                // [CHECKSUM ENFORCEMENT] Kiểm tra toàn vẹn dữ liệu
                if (!ChecksumService.verify(senderPocket)) {
                    return res.error(RespCode.DATA_INTEGRITY_ERROR);
                }

                if ((senderPocket.balance || 0) < totalAmount) {
                    return res.error(RespCode.INSUFFICIENT_BALANCE);
                }
            }

            // Tạo Trail pending
            const transRefId = 'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9000);

            const trail = await TransactionTrail.create({
                transRefId: transRefId,
                inputMessage: {
                    serviceCode: serviceCode,
                    parameters: parameters,
                    transBody: transBody,
                    fee: fee
                },
                status: 'pending'
            });

            return res.ok({
                transRefId: trail.transRefId,
                amount: amount,
                fee: fee,
                totalAmount: totalAmount,
                status: trail.status
            }, RespCode.REQUEST_SUCCESS.message);

        } catch (error) {
            console.error('Transaction Request Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    // BƯỚC 2 — CONFIRM
    confirm: async function (req, res) {
        try {
            const { transRefId } = req.body;

            if (!transRefId) {
                return res.error(RespCode.MISSING_TRANS_REF_ID);
            }

            const trail = await TransactionTrail.findOne({ transRefId: transRefId });
            if (!trail) {
                return res.error(RespCode.TRANSACTION_NOT_FOUND);
            }

            if (trail.status !== 'pending') {
                return res.error(RespCode.INVALID_TRANS_STATE);
            }

            const service = await Service.findOne({ code: trail.inputMessage.serviceCode });
            if (!service) {
                return res.error(RespCode.SERVICE_UNAVAILABLE);
            }

            return res.ok({
                transRefId: trail.transRefId,
                authMethod: (service.auth && service.auth.method) ? service.auth.method : 'NONE',
                amount: trail.inputMessage.transBody.AMOUNT,
                fee: trail.inputMessage.fee || 0
            }, RespCode.CONFIRM_SUCCESS.message);

        } catch (error) {
            console.error('Transaction Confirm Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    // BƯỚC 3 — VERIFY
    verify: async function (req, res) {
        const { transRefId, pin } = req.body;
        let senderPocketId = null;

        try {
            if (!transRefId) {
                return res.error(RespCode.MISSING_TRANS_REF_ID);
            }

            // Kiểm tra trạng thái Trail
            const trail = await TransactionTrail.findOne({ transRefId: transRefId });
            if (!trail) {
                return res.error(RespCode.TRANSACTION_NOT_FOUND);
            }

            const transBody = Object.assign({}, trail.inputMessage.transBody);

            // ==========================================
            // IDEMPOTENCY CATCH: Xử lý client retry
            // ==========================================
            if (trail.status === 'done') {
                const existingTrans = await Transaction.findOne({ transRefId: transRefId });
                if (existingTrans) {
                    console.log(`[Idempotency] Client retry transRefId=${transRefId}. Trả lại response cũ.`);
                    return res.ok({
                        transactionCode: existingTrans.code,
                        billCode: transBody['BILLCODE'] || undefined,
                        amount: existingTrans.amount,
                        fee: existingTrans.fee,
                        totalAmount: existingTrans.totalAmount,
                        note: 'IDEMPOTENT_RESPONSE'
                    }, RespCode.TRANSACTION_SUCCESS.message);
                }
            }

            if (trail.status !== 'pending') {
                return res.error(RespCode.INVALID_TRANS_STATE);
            }

            const serviceCode = trail.inputMessage.serviceCode;
            const fee = parseFloat(trail.inputMessage.fee) || 0;
            const amount = parseFloat(transBody['AMOUNT']) || 0;

            const service = await Service.findOne({ code: serviceCode });
            if (!service) {
                return res.error(RespCode.SERVICE_UNAVAILABLE);
            }

            // Xác thực PIN
            if (service.auth && service.auth.method === 'PIN') {
                if (!pin) {
                    return res.error(RespCode.MISSING_PIN);
                }
                if (!/^\d{6}$/.test(pin.toString())) {
                    return res.error(RespCode.INVALID_PIN_FORMAT);
                }

                const customer = await Customer.findOne({ phone: req.user.phone });
                if (!customer) {
                    return res.error(RespCode.USER_NOT_FOUND);
                }

                const isPinValid = bcrypt.compareSync(pin.toString(), customer.pinHash);
                if (!isPinValid) {
                    return res.error(RespCode.INVALID_OTP);
                }
            }

            // Lấy glSteps
            const definition = await TransDefinition.findOne({ service: service.id });
            if (!definition || !definition.glSteps || !definition.glSteps.length) {
                throw new Error('Không tìm thấy glSteps cho service: ' + serviceCode);
            }

            // Khoá ví người gửi (chống double-spend)
            senderPocketId = transBody['SENDERID'] || null;
            if (!senderPocketId) {
                return res.error(RespCode.POCKET_NOT_FOUND);
            }

            const locked = await lockPocket(senderPocketId);
            if (!locked) {
                // Ví đang bị lock → giao dịch khác đang chạy
                return res.error(RespCode.INVALID_TRANS_STATE);
            }
            await TransactionTrail.update({ transRefId }, { status: 'inProgress' });

            // Re-validate số dư lần 2
            const senderPocket = await Pocket.findOne({ id: senderPocketId });
            if (!senderPocket) {
                await unlockPocket(senderPocketId);
                await TransactionTrail.update({ transRefId }, { status: 'pending' });
                return res.error(RespCode.POCKET_NOT_FOUND);
            }

            const requiredTotal = amount + fee;
            if ((senderPocket.balance || 0) < requiredTotal) {
                await unlockPocket(senderPocketId);
                await TransactionTrail.update({ transRefId }, { status: 'pending' });
                return res.error(RespCode.INSUFFICIENT_BALANCE);
            }

            // Ghi sổ kép theo glSteps
            let finalTotalAmount = 0;
            let finalFee = 0;

            for (const step of definition.glSteps) {
                // Xác định stepAmount
                let stepAmount = 0;
                if (step.amount === 'FEE') {
                    stepAmount = fee;
                } else if (step.amount === 'AMOUNT') {
                    stepAmount = amount;
                } else {
                    stepAmount = parseFloat(transBody[step.amount]) || 0;
                }

                if (!stepAmount || stepAmount <= 0) continue;

                // Xác định pocket nguồn/đích (hỗ trợ cả wallet level)
                const debitLvl = step.debitLevel || (step.debit && step.debit.level);
                const debitTgt = step.debitTarget || (step.debit && step.debit.target);
                const creditLvl = step.creditLevel || (step.credit && step.credit.level);
                const creditTgt = step.creditTarget || (step.credit && step.credit.target);

                const debitPocketId = await resolvePocketId(debitLvl, debitTgt, transBody);
                const creditPocketId = await resolvePocketId(creditLvl, creditTgt, transBody);

                // Trừ ví nguồn
                if (debitPocketId) {
                    await updatePocketBalance(debitPocketId, -Math.abs(stepAmount));
                }
                // Cộng ví đích
                if (creditPocketId) {
                    await updatePocketBalance(creditPocketId, Math.abs(stepAmount));
                }

                // Ghi PocketEntry (dấu vết bút toán bất biến)
                await PocketEntry.create({
                    transRefId: transRefId,
                    stepOrder: step.order,
                    debit: debitPocketId,
                    credit: creditPocketId,
                    amount: stepAmount,
                    status: 'settled'
                });

                // Cộng dồn tổng
                finalTotalAmount += stepAmount;
                if (step.amount === 'FEE') finalFee += stepAmount;
            }

            // Tạo Transaction biên lai
            const transRecord = await Transaction.create({
                code: transRefId.replace('TXN', 'GD'),
                transRefId: transRefId,
                service: service.id,
                sender: transBody['SENDERID'],
                receiver: transBody['RECEIVERID'] || transBody['RECEIVERPHONE'],
                amount: amount,
                fee: finalFee,
                totalAmount: finalTotalAmount,
                status: 'done'
            });

            // Cập nhật Trail done + mở khoá ví
            await TransactionTrail.update({ transRefId }, { status: 'done' });
            await unlockPocket(senderPocketId);

            // Nếu là billerTrans → gọi payment SAU KHI đã ghi sổ (thu tiền trước)
            if (service.action === 'billerTrans') {
                const billCode = transBody['BILLCODE'];
                const biller = await Biller.findOne({ pocket: transBody['RECEIVERID'] });

                let paymentSuccess = false;
                if (biller && billCode) {
                    try {
                        const http = require('http');
                        const paymentUrl = new URL(biller.paymentUrl);
                        const postBody = JSON.stringify({
                            transRefId: transRefId,
                            billCode: billCode,
                            amount: amount
                        });
                        paymentSuccess = await new Promise((resolve) => {
                            const reqOpt = {
                                hostname: paymentUrl.hostname,
                                port: paymentUrl.port || 80,
                                path: paymentUrl.pathname,
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Content-Length': Buffer.byteLength(postBody)
                                },
                                timeout: 5000
                            };
                            const httpReq = http.request(reqOpt, (resp) => {
                                let data = '';
                                resp.on('data', chunk => { data += chunk; });
                                resp.on('end', () => {
                                    try {
                                        const result = JSON.parse(data);
                                        resolve(result.success === true);
                                    } catch (e) { resolve(false); }
                                });
                            });
                            httpReq.on('error', () => resolve(false));
                            httpReq.on('timeout', () => { httpReq.destroy(); resolve(false); });
                            httpReq.write(postBody);
                            httpReq.end();
                        });
                    } catch (e) {
                        console.error('[BillPayment] Payment call failed:', e.message);
                        paymentSuccess = false;
                    }
                }

                if (!paymentSuccess) {
                    // Biller thất bại sau khi đã thu tiền → đánh dấu refund_pending
                    await TransactionTrail.update({ transRefId }, { status: 'refund_pending' });
                    console.warn(`[BillPayment] Biller từ chối/timeout. Trail=${transRefId} → refund_pending`);
                    return res.error(RespCode.BILLER_PAYMENT_FAILED);
                }

                console.log(`[BillPayment] Payment OK: transRefId=${transRefId}`);
                return res.ok({
                    transactionCode: transRecord.code,
                    billCode: billCode,
                    amount: transRecord.amount,
                    fee: transRecord.fee,
                    totalAmount: transRecord.totalAmount
                }, RespCode.BILL_PAYMENT_SUCCESS.message);
            }

            return res.ok({
                transactionCode: transRecord.code,
                amount: transRecord.amount,
                fee: transRecord.fee,
                totalAmount: transRecord.totalAmount
            }, RespCode.TRANSACTION_SUCCESS.message);

        } catch (error) {
            console.error('Transaction Verify Error:', error);

            // Mở khoá ví ở mọi lối ra lỗi
            if (senderPocketId) await unlockPocket(senderPocketId);

            // Đánh dấu Trail failed
            try {
                await TransactionTrail.update({ transRefId: transRefId }, { status: 'failed' });
            } catch (_) { }

            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    // Lịch sử giao dịch của customer đang đăng nhập
    myHistory: async function (req, res) {
        try {
            const pocketId = req.user.id;
            const phone = req.user.phone;

            const page = parseInt((req.query && req.query.page) || (req.body && req.body.page)) || 1;
            const limit = parseInt((req.query && req.query.limit) || (req.body && req.body.limit)) || 10;
            const skip = (page - 1) * limit;

            let query = {
                or: [
                    { sender: pocketId },
                    { sender: phone },
                    { receiver: pocketId },
                    { receiver: phone }
                ],
                status: 'done'
            };

            // Lọc theo service (VD: P2P_TRANSFER, BILL_PAYMENT)
            if (req.query.service) {
                query.service = req.query.service;
            }

            // Lọc theo thời gian
            if (req.query.fromDate || req.query.toDate) {
                query.createdAt = {};
                if (req.query.fromDate) query.createdAt['>='] = new Date(req.query.fromDate);
                if (req.query.toDate) query.createdAt['<='] = new Date(req.query.toDate);
            }

            const transactions = await Transaction.find(query)
                .sort('createdAt DESC')
                .skip(skip)
                .limit(limit);

            const total = await Transaction.count(query);

            // Bổ sung cờ đánh dấu đây là giao dịch TIỀN VÀO hay TIỀN RA
            const formattedRecords = transactions.map(t => {
                let type = 'OUT';
                if (t.receiver === pocketId || t.receiver === phone) {
                    type = 'IN';
                }
                return {
                    ...t,
                    type: type // 'IN' (nhận tiền) hoặc 'OUT' (chuyển tiền/thanh toán)
                };
            });

            return res.ok({
                page: page,
                limit: limit,
                total: total,
                records: formattedRecords
            }, RespCode.GET_HISTORY_SUCCESS.message);

        } catch (error) {
            console.error('Get My History Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    // Xem chi tiết 1 giao dịch của chính mình
    myTransactionDetail: async function (req, res) {
        try {
            const pocketId = req.user.id;
            const phone = req.user.phone;
            const transId = req.params.id;

            if (!transId) {
                return res.error(RespCode.INVALID_PARAMS);
            }

            const transaction = await Transaction.findOne({ id: transId });
            
            if (!transaction) {
                return res.error(RespCode.TRANSACTION_NOT_FOUND);
            }

            // Bảo mật: Đảm bảo giao dịch này thuộc về người dùng đang đăng nhập
            if (transaction.sender !== pocketId && transaction.sender !== phone &&
                transaction.receiver !== pocketId && transaction.receiver !== phone) {
                return res.error(RespCode.TRANSACTION_NOT_FOUND); // Trả về NOT_FOUND để che giấu
            }

            let type = (transaction.receiver === pocketId || transaction.receiver === phone) ? 'IN' : 'OUT';

            // Có thể lấy thêm Trail để xem chi tiết
            const trail = await TransactionTrail.findOne({ transRefId: transaction.transRefId });

            return res.ok({
                transaction: {
                    ...transaction,
                    type: type
                },
                details: trail ? trail.inputMessage : null
            }, "Lấy chi tiết giao dịch thành công");

        } catch (error) {
            console.error('Get Transaction Detail Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    }
};