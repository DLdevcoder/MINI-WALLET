const bcrypt = require('bcryptjs');
const RespCode = require('../services/Respcode');

module.exports = {
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

            let transBody = {};
            const fieldBuilders = service.fieldBuilder || [];

            for (const builder of fieldBuilders) {
                const { name, rule, source, variable } = builder;

                if (rule === 'mapping') {
                    const key = source.split('.').pop();
                    transBody[name] = parameters[key];
                } else if (rule === 'fixed') {
                    transBody[name] = variable || source;
                } else if (rule === 'query') {
                    transBody[name] = null;
                }
            }

            if (!transBody['SENDERID']) {
                transBody['SENDERID'] = req.user ? req.user.id : null;
            }

            const transFields = await TransField.find({ service: service.id });

            for (const tf of transFields) {
                const val = transBody[tf.fieldName];

                if (tf.isRequired && (val === undefined || val === null || val === '')) {
                    return res.error(RespCode.MISS_INFO);
                }

                if (tf.regex && val) {
                    const regex = new RegExp(tf.regex);
                    if (!regex.test(val.toString())) {
                        return res.error(RespCode.INVALID_FIELD_FORMAT);
                    }
                }
            }

            let amount = parseFloat(transBody['AMOUNT']) || 0;
            let fee = 0;

            if (service.fee) {
                if (service.fee.type === 'fixed') {
                    fee = service.fee.value;
                } else if (service.fee.type === 'percent') {
                    fee = amount * (service.fee.value / 100);
                    if (service.fee.max && fee > service.fee.max) fee = service.fee.max;
                }
            }

            const totalAmount = amount + fee;
            const transRefId = 'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9000);

            const inputMessage = {
                serviceCode: serviceCode,
                parameters: parameters,
                transBody: transBody,
                fee: fee
            };

            const trail = await TransactionTrail.create({
                transRefId: transRefId,
                inputMessage: inputMessage,
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
                authMethod: service.auth.method,
                amount: trail.inputMessage.transBody.AMOUNT,
                fee: trail.inputMessage.fee || 0
            }, RespCode.CONFIRM_SUCCESS.message);

        } catch (error) {
            console.error('Transaction Confirm Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    verify: async function (req, res) {
        try {
            const { transRefId, pin } = req.body;

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

            await TransactionTrail.update({ transRefId }, { status: 'inProgress' });

            const serviceCode = trail.inputMessage.serviceCode;
            const transBody = trail.inputMessage.transBody;

            const service = await Service.findOne({ code: serviceCode });
            if (service.auth && service.auth.method === 'PIN') {
                if (!pin) {
                    await TransactionTrail.update({ transRefId }, { status: 'pending' });
                    return res.error(RespCode.MISSING_PIN);
                }

                if (!/^\d{6}$/.test(pin.toString())) {
                    await TransactionTrail.update({ transRefId }, { status: 'pending' });
                    return res.error(RespCode.INVALID_PIN_FORMAT);
                }

                const customer = await Customer.findOne({ phone: req.user.phone });
                if (!customer) {
                    await TransactionTrail.update({ transRefId }, { status: 'pending' });
                    return res.error(RespCode.USER_NOT_FOUND);
                }

                const isPinValid = bcrypt.compareSync(pin.toString(), customer.pinHash);
                if (!isPinValid) {
                    await TransactionTrail.update({ transRefId }, { status: 'pending' });
                    return res.error(RespCode.INVALID_OTP);
                }
            }

            const definition = await TransDefinition.findOne({ service: service.id });
            if (!definition || !definition.glSteps) {
                throw new Error("Không tìm thấy cấu hình TransDefinition cho dịch vụ này.");
            }

            if (!transBody['RECEIVERID'] && transBody['RECEIVERPHONE']) {
                transBody['RECEIVERID'] = 'POCKET_' + transBody['RECEIVERPHONE'];
            }

            if (transBody['SENDERID'] && /^[0-9]{10}$/.test(transBody['SENDERID'])) {
                transBody['SENDERID'] = 'POCKET_' + transBody['SENDERID'];
            }

            let finalTotalAmount = 0;
            let finalFee = 0;

            const updateBalanceNative = (pocketId, amountChange) => {
                return new Promise((resolve, reject) => {
                    Pocket.native(function (err, collection) {
                        if (err) return reject(err);
                        collection.updateOne(
                            { id: pocketId },
                            { $inc: { balance: amountChange } },
                            function (err, result) {
                                if (err) return reject(err);
                                resolve(result);
                            }
                        );
                    });
                });
            };

            for (const step of definition.glSteps) {
                let stepAmount = 0;
                if (step.amount === 'FEE') {
                    stepAmount = parseFloat(trail.inputMessage.fee) || 0;
                } else {
                    stepAmount = parseFloat(transBody[step.amount]) || 0;
                }

                if (!stepAmount || stepAmount <= 0) continue;

                if (step.amount === 'AMOUNT') finalTotalAmount += stepAmount;
                if (step.amount === 'FEE') {
                    finalFee += stepAmount;
                    finalTotalAmount += stepAmount;
                }

                const debitLvl = step.debit ? step.debit.level : step.debitLevel;
                const debitTgt = step.debit ? step.debit.target : step.debitTarget;
                const creditLvl = step.credit ? step.credit.level : step.creditLevel;
                const creditTgt = step.credit ? step.credit.target : step.creditTarget;

                const debitPocketId = debitLvl === 'productLevel' ? transBody[debitTgt] : debitTgt;
                const creditPocketId = creditLvl === 'productLevel' ? transBody[creditTgt] : creditTgt;

                if (debitPocketId) {
                    await updateBalanceNative(debitPocketId, -Math.abs(stepAmount));
                }

                if (creditPocketId) {
                    await updateBalanceNative(creditPocketId, Math.abs(stepAmount));
                }

                await PocketEntry.create({
                    transRefId: transRefId,
                    stepOrder: step.order,
                    debit: debitPocketId,
                    credit: creditPocketId,
                    amount: stepAmount,
                    status: 'settled'
                });
            }

            const transRecord = await Transaction.create({
                code: transRefId.replace('TXN', 'GD'),
                transRefId: transRefId,
                service: service.id,
                sender: transBody['SENDERID'],
                receiver: transBody['RECEIVERID'] || transBody['RECEIVERPHONE'],
                amount: parseFloat(transBody['AMOUNT']),
                fee: finalFee,
                totalAmount: finalTotalAmount,
                status: 'done'
            });

            await TransactionTrail.update({ transRefId }, { status: 'done' });

            return res.ok({
                transactionCode: transRecord.code,
                amount: transRecord.amount,
                fee: transRecord.fee,
                totalAmount: transRecord.totalAmount
            }, RespCode.TRANSACTION_SUCCESS.message);

        } catch (error) {
            console.error('Transaction Verify Error:', error);
            if (req.body.transRefId) {
                await TransactionTrail.update({ transRefId: req.body.transRefId }, { status: 'failed' });
            }
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    myHistory: async function (req, res) {
        try {
            const pocketId = req.user.id;
            const phone = req.user.phone;

            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 10;
            const skip = (page - 1) * limit;

            const transactions = await Transaction.find({
                or: [
                    { sender: pocketId },
                    { sender: phone },
                    { receiver: pocketId },
                    { receiver: phone }
                ],
                status: 'done'
            })
                .sort('createdAt DESC')
                .skip(skip)
                .limit(limit);

            return res.ok({
                page: page,
                limit: limit,
                records: transactions
            }, RespCode.GET_HISTORY_SUCCESS.message);

        } catch (error) {
            console.error('Get My History Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    }
};