const RespCode = require('../services/Respcode');

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

            collection.updateOne(
                query,
                { $inc: { balance: amountChange } },
                function (err2, result) {
                    if (err2) return reject(err2);
                    resolve(result);
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
    }

};
