module.exports = {
    request: async function (req, res) {
        try {
            const { serviceCode, sender, receiver, amount, fields } = req.body;

            // 1. Kiểm tra tham số đầu vào
            if (!serviceCode || !sender || amount === undefined) {
                const err = RespCode.INVALID_PARAMS;
                return res.status(200).json({
                    err: err.code,
                    message: err.message + ' (Thiếu serviceCode, sender hoặc amount)',
                    data: null
                });
            }

            // 2. Kiểm tra Service
            const service = await Service.findOne({ code: serviceCode, status: 'active' });
            if (!service) {
                const err = RespCode.SERVICE_UNAVAILABLE;
                return res.status(200).json({
                    err: err.code,
                    message: err.message,
                    data: null
                });
            }

            // 3. Kiểm tra các trường động (TransField)
            const transFields = await TransField.find({ service: service.id, status: 'active' });
            const inputMessage = { sender, receiver, amount, fields: fields || {} };

            for (const tf of transFields) {
                if (tf.isRequired && (inputMessage.fields[tf.fieldName] === undefined || inputMessage.fields[tf.fieldName] === null)) {
                    const err = RespCode.MISS_INFO;
                    return res.status(200).json({
                        err: err.code,
                        message: err.message + ` (Thiếu trường dữ liệu bắt buộc: ${tf.fieldName})`,
                        data: null
                    });
                }
            }

            // 4. Tạo mã tham chiếu và khởi tạo TransactionTrail
            const transRefId = 'TXN' + Date.now() + Math.floor(1000 + Math.random() * 9000);

            const trail = await TransactionTrail.create({
                transRefId: transRefId,
                inputMessage: inputMessage,
                status: 'init'
            });

            // 5. Trả về thành công
            return res.status(200).json({
                err: RespCode.SUCCESS,
                message: 'Thành công',
                data: {
                    transRefId: trail.transRefId,
                    status: trail.status
                }
            });

        } catch (error) {
            console.error('Transaction Request Error:', error);
            const err = RespCode.SYSTEM_ERROR;
            return res.status(200).json({
                err: err.code,
                message: err.message,
                data: null
            });
        }
    }
};