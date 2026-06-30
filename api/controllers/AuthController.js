const bcrypt = require('bcryptjs');
const RespCode = require('../services/Respcode');

module.exports = {
    registerCustomer: async function (req, res) {
        try {
            const { phone, pin } = req.body;

            if (!phone || !pin) {
                return res.error(RespCode.MISSING_PHONE_OR_PIN);
            }

            const existingCustomer = await Customer.findOne({ phone: phone });
            if (existingCustomer) {
                return res.error(RespCode.PHONE_EXISTED);
            }

            const salt = bcrypt.genSaltSync(10);
            const pinHash = bcrypt.hashSync(pin.toString(), salt);

            const pocketId = 'POCKET_' + phone;
            const newPocket = await Pocket.create({
                id: pocketId,
                client: 'customer',
                currency: 'VND',
                balance: 100000,
                checksum: 'init_hash',
                status: 'active'
            });

            const newCustomer = await Customer.create({
                phone: phone,
                pinHash: pinHash,
                pocket: newPocket.id,
                status: 'active'
            });

            const tokenPayload = { id: newCustomer.pocket, phone: newCustomer.phone };
            const token = JwtService.issue(tokenPayload);

            return res.ok({
                token: token,
                customer: {
                    phone: newCustomer.phone,
                    pocket: newCustomer.pocket
                }
            }, RespCode.REGISTER_SUCCESS.message);

        } catch (error) {
            console.error('Register Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    loginCustomer: async function (req, res) {
        try {
            const { phone, pin } = req.body;

            if (!phone || !pin) {
                return res.error(RespCode.MISSING_PHONE_OR_PIN);
            }

            const customer = await Customer.findOne({ phone: phone });
            if (!customer) {
                return res.error(RespCode.USER_NOT_FOUND);
            }

            if (customer.status !== 'active') {
                return res.error(RespCode.ACCOUNT_LOCKED);
            }

            const isMatch = bcrypt.compareSync(pin.toString(), customer.pinHash);
            if (!isMatch) {
                return res.error(RespCode.WRONG_PIN);
            }

            const tokenPayload = { id: customer.pocket, phone: customer.phone };
            const token = JwtService.issue(tokenPayload);

            return res.ok({ token: token }, RespCode.LOGIN_SUCCESS.message);

        } catch (error) {
            console.error('Login Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    }
};