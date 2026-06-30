const bcrypt = require('bcryptjs');
const RespCode = require('../services/Respcode');

module.exports = {
    // 1. API Đăng ký Khách hàng (dùng PIN)
    registerCustomer: async function (req, res) {
        try {
            const { phone, pin } = req.body;

            if (!phone || !pin) {
                const err = RespCode.INVALID_PARAMS;
                return res.status(200).json({ err: err.code, message: "Thiếu số điện thoại hoặc mã PIN", data: null });
            }

            // Kiểm tra số điện thoại tồn tại
            const existingCustomer = await Customer.findOne({ phone: phone });
            if (existingCustomer) {
                const err = RespCode.PHONE_EXISTED;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            // Mã hóa mã PIN
            const salt = bcrypt.genSaltSync(10);
            const pinHash = bcrypt.hashSync(pin.toString(), salt);

            // Tạo Ví trước
            const pocketId = 'POCKET_' + phone;
            const newPocket = await Pocket.create({
                id: pocketId,
                client: 'customer',
                currency: 'VND',
                balance: 10000,
                checksum: 'init_hash',
                status: 'active'
            });

            // Tạo Customer
            const newCustomer = await Customer.create({
                phone: phone,
                pinHash: pinHash,
                pocket: newPocket.id,
                status: 'active'
            });

            // Sinh Token
            const tokenPayload = { id: newCustomer.pocket, phone: newCustomer.phone };
            const token = JwtService.issue(tokenPayload);

            return res.status(200).json({
                err: RespCode.SUCCESS.code,
                message: "Đăng ký tài khoản thành công",
                data: {
                    token: token,
                    customer: {
                        phone: newCustomer.phone,
                        pocket: newCustomer.pocket
                    }
                }
            });

        } catch (error) {
            console.error('Register Error:', error);
            const err = RespCode.SYSTEM_ERROR;
            return res.status(200).json({ err: err.code, message: err.message, data: null });
        }
    },

    // 2. API Đăng nhập Khách hàng (dùng PIN)
    loginCustomer: async function (req, res) {
        try {
            const { phone, pin } = req.body;

            if (!phone || !pin) {
                const err = RespCode.INVALID_PARAMS;
                return res.status(200).json({ err: err.code, message: "Thiếu số điện thoại hoặc mã PIN", data: null });
            }

            const customer = await Customer.findOne({ phone: phone });
            if (!customer) {
                const err = RespCode.USER_NOT_FOUND;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            if (customer.status !== 'active') {
                const err = RespCode.ACCOUNT_LOCKED;
                return res.status(200).json({ err: err.code, message: err.message, data: null });
            }

            // Đối chiếu mã PIN nhập vào với pinHash trong DB
            const isMatch = bcrypt.compareSync(pin.toString(), customer.pinHash);
            if (!isMatch) {
                const err = RespCode.WRONG_PASSWORD;
                return res.status(200).json({ err: err.code, message: "Sai mã PIN", data: null });
            }

            const tokenPayload = { id: customer.pocket, phone: customer.phone };
            const token = JwtService.issue(tokenPayload);

            return res.status(200).json({
                err: RespCode.SUCCESS.code,
                message: "Đăng nhập thành công",
                data: {
                    token: token
                }
            });

        } catch (error) {
            console.error('Login Error:', error);
            const err = RespCode.SYSTEM_ERROR;
            return res.status(200).json({ err: err.code, message: err.message, data: null });
        }
    }
};