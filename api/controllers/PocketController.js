const RespCode = require('../services/Respcode');
const crypto = require('crypto');

module.exports = {
    myPocket: async function (req, res) {
        try {
            const pocketId = req.user.id;

            const pocket = await Pocket.findOne({ id: pocketId });
            if (!pocket) {
                return res.error(RespCode.USER_NOT_FOUND);
            }

            if (pocket.status !== 'active') {
                return res.error(RespCode.ACCOUNT_LOCKED);
            }

            if (!ChecksumService.verify(pocket)) {
                return res.error(RespCode.DATA_INTEGRITY_ERROR);
            }

            return res.ok({
                balance: pocket.balance,
                currency: pocket.currency
            }, RespCode.GET_POCKET_SUCCESS.message);

        } catch (error) {
            console.error('Get My Pocket Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    adminList: async function(req, res) {
        try {
            const page = parseInt(req.body.page) || 1;
            const limit = parseInt(req.body.limit) || 20;
            const skip = (page - 1) * limit;

            const query = {};
            if (req.body.clientType) {
                query.client = req.body.clientType;
            }
            if (req.body.pocketId) {
                query.user = { contains: req.body.pocketId };
            }

            const pockets = await Pocket.find(query).skip(skip).limit(limit).sort('createdAt DESC');
            const total = await Pocket.count(query);

            const pocketsWithIntegrity = pockets.map(p => {
                const isValid = ChecksumService.verify(p);
                return { ...p, isIntegrityValid: isValid };
            });

            return res.ok({
                data: pocketsWithIntegrity,
                total,
                page,
                limit
            });
        } catch (error) {
            console.error('adminList pocket err', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    adminCreate: async function(req, res) {
        try {
            const { pocketId, clientType, currency } = req.body;
            if (!pocketId || !clientType || !['system', 'bank'].includes(clientType)) {
                return res.status(200).json({ err: 400, message: 'Vui lòng cung cấp mã ví và loại (system/bank)' });
            }

            const existing = await Pocket.findOne({ user: pocketId });
            if (existing) {
                return res.status(200).json({ err: 400, message: 'Mã ví đã tồn tại' });
            }

            const initialBalance = 0;
            const checksum = ChecksumService.compute(initialBalance, pocketId);

            const pocket = await Pocket.create({
                user: pocketId,
                client: clientType,
                currency: currency || 'VND',
                balance: initialBalance,
                checksum: checksum,
                status: 'active'
            });

            return res.ok(pocket);
        } catch (error) {
            console.error('adminCreate pocket err', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    },

    adminTopup: async function(req, res) {
        try {
            // pocketId is actually the 'user' field in Pocket model, not MongoDB id.
            const { pocketId, amount } = req.body;
            if (!pocketId || !amount || amount <= 0) {
                return res.status(200).json({ err: 400, message: 'Ví hoặc số tiền không hợp lệ' });
            }

            const pocket = await Pocket.findOne({ user: pocketId });
            if (!pocket) {
                return res.status(200).json({ err: 404, message: 'Không tìm thấy ví' });
            }

            if (!['system', 'bank'].includes(pocket.client)) {
                return res.status(200).json({ err: 400, message: 'Chỉ nạp trực tiếp cho ví system hoặc bank' });
            }

            const newBalance = pocket.balance + amount;
            const newChecksum = ChecksumService.compute(newBalance, pocket.user);

            const updated = await Pocket.update({ id: pocket.id }, {
                balance: newBalance,
                checksum: newChecksum
            });

            return res.ok(updated[0]);
        } catch (error) {
            console.error('adminTopup pocket err', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    }
};