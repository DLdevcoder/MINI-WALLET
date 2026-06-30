const RespCode = require('../services/Respcode');

module.exports = {
    request: async function (req, res) {
        try {
            const { serviceCode, parameters } = req.body;

            if (!serviceCode || !parameters) {
                const err = RespCode.MISSING_SERVICE_PARAMETERS;
                return res.status(200).json({
                    err: err.code,
                    message: err.message,
                    data: null
                });
            }

            // 1. Lấy thông tin Service
            const service = await Service.findOne({ code: serviceCode, status: 'active' });
            if (!service) {
                const err = RespCode.SERVICE_UNAVAILABLE;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            // 2. Dựng TRANSBODY dựa trên Service.fieldBuilder
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
                transBody['SENDERID'] = req.user ? req.user.id : parameters.senderId;
            }

            // 3. Đọc TransField và Validate định dạng TRANSBODY
            const transFields = await TransField.find({ service: service.id });

            for (const tf of transFields) {
                const val = transBody[tf.fieldName];

                if (tf.isRequired && (val === undefined || val === null || val === '')) {
                    const err = RespCode.MISS_INFO;
                    return res.status(200).json({
                        err: err.code,
                        message: err.message + `${tf.fieldName}`,
                        data: null
                    });
                }

                if (tf.regex && val) {
                    const regex = new RegExp(tf.regex);
                    if (!regex.test(val.toString())) {
                        const err = RespCode.INVALID_PARAMS;
                        return res.status(200).json({
                            err: err.code,
                            message: `${tf.fieldName}`,
                            data: null
                        });
                    }
                }
            }

            // 4. Tính toán Fee và TotalAmount
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

            // 5. Khởi tạo TransactionTrail
            const transRefId = 'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9000);
            const inputMessage = {
                serviceCode: serviceCode,
                parameters: parameters,
                transBody: transBody
            };

            const trail = await TransactionTrail.create({
                transRefId: transRefId,
                inputMessage: inputMessage,
                status: 'pending'
            });

            // 6. Trả về kết quả
            return res.status(200).json({
                err: RespCode.SUCCESS,
                message: 'Thành công',
                data: {
                    transRefId: trail.transRefId,
                    amount: amount,
                    fee: fee,
                    totalAmount: totalAmount,
                    status: trail.status
                }
            });

        } catch (error) {
            console.error('Transaction Request Error:', error);
            const err = RespCode.SYSTEM_ERROR;
            return res.status(200).json({ err: err.code, message: err.message, data: null });
        }
    },

    confirm: async function (req, res) {
        try {
            const { transRefId, parameters } = req.body;

            if (!transRefId) {
                const err = RespCode.MISSING_TRANS_REF_ID;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            // 1. Nạp lại TransactionTrail
            const trail = await TransactionTrail.findOne({ transRefId: transRefId });
            if (!trail) {
                const err = RespCode.TRANSACTION_NOT_FOUND;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            if (trail.status !== 'pending') {
                const err = RespCode.INVALID_TRANS_STATE;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            // 2. Lấy thông tin Service để kiểm tra Auth Method
            const service = await Service.findOne({ code: trail.inputMessage.serviceCode });
            if (!service) {
                const err = RespCode.SERVICE_UNAVAILABLE;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            return res.status(200).json({
                err: RespCode.CONFIRM_SUCCESS.code,
                message: RespCode.CONFIRM_SUCCESS.message,
                data: {
                    transRefId: trail.transRefId,
                    authMethod: service.auth.method,
                    amount: trail.inputMessage.transBody.AMOUNT,
                    fee: trail.inputMessage.fee || 0
                }
            });

        } catch (error) {
            console.error('Transaction Confirm Error:', error);
            const err = RespCode.SYSTEM_ERROR;
            return res.status(200).json({ err: err.code, message: err.message, data: null });
        }
    }
};