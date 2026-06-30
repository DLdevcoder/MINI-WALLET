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

            const currentHash = crypto.createHash('md5').update(pocket.id + pocket.balance + 'secret').digest('hex');
            console.log(`[Checksum Verify] Expected: ${currentHash}, Actual: ${pocket.checksum}`);

            return res.ok({
                balance: pocket.balance,
                currency: pocket.currency
            }, RespCode.GET_POCKET_SUCCESS.message);

        } catch (error) {
            console.error('Get My Pocket Error:', error);
            return res.error(RespCode.SYSTEM_ERROR);
        }
    }
};