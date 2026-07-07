const RespCode = require('../services/Respcode');
const ChecksumService = require('../services/ChecksumService');

async function resolvePocketId(level, target, transBody) {
    if (level === 'wallet') {
        const pocket = await Pocket.findOne({ user: target });
        return pocket ? pocket.id : null;
    }
    return transBody[target] || null;
}

function updateBalanceNative(pocketId, amountChange) {
    return new Promise((resolve, reject) => {
        Pocket.native(function (err, collection) {
            if (err) return reject(err);

            let query;
            try {
                const mongodb = require('mongodb');
                const ObjectId = mongodb.ObjectID || mongodb.ObjectId;
                query = { _id: new ObjectId(pocketId) };
            } catch (e) {
                query = { _id: pocketId };
            }

            collection.findOneAndUpdate(
                query,
                { $inc: { balance: amountChange } },
                { returnOriginal: false, returnDocument: 'after' },
                function (err2, result) {
                    if (err2) return reject(err2);
                    
                    const doc = result.value || result;
                    if (!doc) return reject(new Error('Pocket not found'));

                    const newBalance = doc.balance;
                    const newChecksum = ChecksumService.compute(newBalance, doc.user);

                    collection.updateOne(
                        query,
                        { $set: { checksum: newChecksum } },
                        function (err3) {
                            if (err3) return reject(err3);
                            resolve(doc);
                        }
                    );
                }
            );
        });
    });
}

module.exports = {

    cashIn: async function (req, res) {
        const { receiverPhone, amount } = req.body;
        let transRefId = null;
        let bankPocketSailsId = null;

        try {

            if (!receiverPhone || !amount) {
                return res.error(RespCode.INVALID_PARAMS);
            }
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                return res.error(RespCode.INVALID_AMOUNT);
            }

            const service = await Service.findOne({ code: 'CASH_IN', status: 'active' });
            if (!service) {
                return res.error(RespCode.SERVICE_UNAVAILABLE);
            }
            // BƯỚC 1 — REQUEST
            let transBody = {};

            for (const builder of (service.fieldBuilder || [])) {
                const { name, rule, source } = builder;

                if (rule === 'fixed') {
                    const maybePocket = await Pocket.findOne({ user: source });
                    transBody[name] = maybePocket ? maybePocket.id : source;

                } else if (rule === 'mapping') {
                    const key = source.split('.').pop();
                    transBody[name] = req.body[key];

                } else if (rule === 'query' && source === 'queryPocketByPhone') {
                    const customer = await Customer.findOne({ phone: receiverPhone });
                    if (!customer) {
                        return res.error(RespCode.USER_NOT_FOUND);
                    }
                    transBody[name] = customer.pocket;
                }
            }
            const transFields = await TransField.find({ service: service.id });
            for (const tf of transFields) {
                const val = transBody[tf.fieldName];
                if (tf.isRequired && (val === undefined || val === null || val === '')) {
                    return res.error(RespCode.MISS_INFO);
                }
                if (tf.regex && val) {
                    if (!new RegExp(tf.regex).test(val.toString())) {
                        return res.error(RespCode.INVALID_FIELD_FORMAT);
                    }
                }
            }

            let fee = 0;
            if (service.fee) {
                if (service.fee.type === 'fixed') {
                    fee = service.fee.value;
                } else if (service.fee.type === 'percent') {
                    fee = parsedAmount * (service.fee.value / 100);
                    if (service.fee.max && fee > service.fee.max) fee = service.fee.max;
                }
            }
            const bankPocket = await Pocket.findOne({ id: transBody['SENDERID'] });
            if (!bankPocket) {
                return res.error(RespCode.POCKET_NOT_FOUND);
            }

            // [CHECKSUM ENFORCEMENT] Kiểm tra toàn vẹn ví ngân hàng
            if (!ChecksumService.verify(bankPocket)) {
                return res.error(RespCode.DATA_INTEGRITY_ERROR);
            }

            if (bankPocket.balance < parsedAmount + fee) {
                return res.error(RespCode.INSUFFICIENT_BALANCE);
            }
            bankPocketSailsId = bankPocket.id;

            transRefId = 'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9000);
            await TransactionTrail.create({
                transRefId: transRefId,
                inputMessage: {
                    serviceCode: 'CASH_IN',
                    parameters: { receiverPhone, amount: parsedAmount },
                    transBody: transBody,
                    fee: fee
                },
                status: 'pending'
            });

            // BƯỚC 2 — CONFIRM → BỎ QUA (auth = NONE)

            // BƯỚC 3 — VERIFY
            await Pocket.update({ id: bankPocketSailsId }, { status: 'inProgress' });
            await TransactionTrail.update({ transRefId }, { status: 'inProgress' });

            // 3b. Tải glSteps
            const definition = await TransDefinition.findOne({ service: service.id });
            if (!definition || !definition.glSteps || !definition.glSteps.length) {
                throw new Error('Không tìm thấy TransDefinition cho CASH_IN.');
            }

            // 3c. Chạy từng glStep
            let finalAmount = 0;

            for (const step of definition.glSteps) {
                // Tính số tiền của step
                let stepAmount = 0;
                if (step.amount === 'FEE') {
                    stepAmount = fee;
                } else {
                    stepAmount = parseFloat(transBody[step.amount]) || 0;
                }
                if (!stepAmount || stepAmount <= 0) continue; // bỏ step amount = 0
                if (step.amount === 'AMOUNT') finalAmount += stepAmount;

                const debitLvl = step.debit ? step.debit.level : step.debitLevel;
                const debitTgt = step.debit ? step.debit.target : step.debitTarget;
                const creditLvl = step.credit ? step.credit.level : step.creditLevel;
                const creditTgt = step.credit ? step.credit.target : step.creditTarget;

                const debitPocketId = await resolvePocketId(debitLvl, debitTgt, transBody);
                const creditPocketId = await resolvePocketId(creditLvl, creditTgt, transBody);

                if (debitPocketId) {
                    await updateBalanceNative(debitPocketId, -Math.abs(stepAmount));
                }
                if (creditPocketId) {
                    await updateBalanceNative(creditPocketId, Math.abs(stepAmount));
                }

                // Ghi PocketEntry (bút toán)
                await PocketEntry.create({
                    transRefId: transRefId,
                    stepOrder: step.order,
                    debit: debitPocketId,
                    credit: creditPocketId,
                    amount: stepAmount,
                    status: 'settled'
                });
            }

            // 3d. Tạo Transaction (biên lai bất biến)
            const transRecord = await Transaction.create({
                code: transRefId.replace('TXN', 'GD'),
                transRefId: transRefId,
                service: service.id,
                sender: transBody['SENDERID'],
                receiver: transBody['RECEIVERID'],
                amount: parsedAmount,
                fee: fee,
                totalAmount: finalAmount + fee,
                status: 'done'
            });

            // 3e. Cập nhật Trail → done & mở khoá Ví Bank
            await TransactionTrail.update({ transRefId }, { status: 'done' });
            await Pocket.update({ id: bankPocketSailsId }, { status: 'active' });
            return res.ok({
                transactionCode: transRecord.code,
                transRefId: transRefId,
                receiver: receiverPhone,
                receiverPocket: transBody['RECEIVERID'],
                amount: parsedAmount,
                fee: fee,
                totalAmount: parsedAmount + fee
            }, RespCode.CASH_IN_SUCCESS.message);

        } catch (error) {
            console.error('Cash-in Error:', error);
            // Rollback Trail
            if (transRefId) {
                try { await TransactionTrail.update({ transRefId }, { status: 'failed' }); } catch (_) { }
            }
            // Mở khoá Ví Bank
            if (bankPocketSailsId) {
                try { await Pocket.update({ id: bankPocketSailsId }, { status: 'active' }); } catch (_) { }
            }
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    listTransactions: async function (req, res) {
        try {
            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const skip = (page - 1) * limit;
            
            let query = {};
            if (req.body.status) query.status = req.body.status;

            const transactions = await Transaction.find(query).sort('createdAt DESC').skip(skip).limit(limit);
            const total = await Transaction.count(query);

            return res.ok({
                page, limit, total,
                records: transactions
            }, 'Lấy danh sách giao dịch thành công');
        } catch (error) {
            console.error('listTransactions Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    listTrails: async function (req, res) {
        try {
            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const skip = (page - 1) * limit;

            let query = {};
            if (req.body.status) query.status = req.body.status;
            if (req.body.transRefId) query.transRefId = req.body.transRefId;

            const trails = await TransactionTrail.find(query).sort('createdAt DESC').skip(skip).limit(limit);
            const total = await TransactionTrail.count(query);

            return res.ok({
                page, limit, total,
                records: trails
            }, 'Lấy danh sách TransactionTrail thành công');
        } catch (error) {
            console.error('listTrails Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    listCustomers: async function (req, res) {
        try {
            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const skip = (page - 1) * limit;

            let query = {};
            if (req.body.phone) query.phone = { contains: req.body.phone };

            const customers = await Customer.find(query).sort('createdAt DESC').skip(skip).limit(limit);
            const total = await Customer.count(query);

            const pocketIds = customers.map(c => c.pocket).filter(id => id);
            const pockets = await Pocket.find({ id: pocketIds });
            const pocketMap = {};
            pockets.forEach(p => pocketMap[p.id] = p.balance);

            const records = customers.map(c => {
                return {
                    id: c.id,
                    phone: c.phone,
                    pocketId: c.pocket,
                    balance: pocketMap[c.pocket] !== undefined ? pocketMap[c.pocket] : 0,
                    createdAt: c.createdAt
                };
            });

            return res.ok({
                page, limit, total,
                records
            }, 'Lấy danh sách khách hàng thành công');
        } catch (error) {
            console.error('listCustomers Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    forceUnlockPocket: async function (req, res) {
        try {
            const { pocketId } = req.body;
            if (!pocketId) return res.error(RespCode.INVALID_PARAMS);

            const pocket = await Pocket.findOne({ id: pocketId });
            if (!pocket) return res.error(RespCode.POCKET_NOT_FOUND);

            await Pocket.update({ id: pocketId }, { status: 'active' });

            return res.ok({ pocketId }, 'Mở khoá ví thành công');
        } catch (error) {
            console.error('forceUnlockPocket Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    // GET /admin/pocket-entries — Tra cứu dấu vết từng bút toán (double-entry ledger)
    // Có thể lọc theo transRefId: ?transRefId=TXN1234
    listPocketEntries: async function (req, res) {
        try {
            const page  = parseInt(req.body.page)  || 1;
            const limit = parseInt(req.body.limit) || 20;
            const skip  = (page - 1) * limit;

            let query = {};
            if (req.body.transRefId) query.transRefId = req.body.transRefId;
            if (req.body.debit)      query.debit      = req.body.debit;
            if (req.body.credit)     query.credit     = req.body.credit;

            const entries = await PocketEntry.find(query)
                .sort('createdAt DESC')
                .skip(skip)
                .limit(limit);

            const total = await PocketEntry.count(query);

            return res.ok({
                page, limit, total,
                records: entries
            }, 'Lấy danh sách bút toán thành công');

        } catch (error) {
            console.error('listPocketEntries Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    }

};
