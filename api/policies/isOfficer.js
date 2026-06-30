const RespCode = require('../services/Respcode');

/**
 * isOfficer policy
 * Kiểm tra JWT token hợp lệ và có role === 'officer'.
 * Chỉ cho phép Officer (Admin) truy cập, từ chối Customer.
 */
module.exports = function (req, res, next) {
    let token;

    if (req.headers && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');

        if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
            token = parts[1];
        } else {
            return res.status(200).json({
                err: RespCode.MISS_BEARER.code,
                message: 'Sai định dạng Bearer token',
                data: null
            });
        }
    } else {
        return res.status(200).json({
            err: RespCode.MISS_BEARER.code,
            message: RespCode.MISS_BEARER.message,
            data: null
        });
    }

    JwtService.verify(token, function (err, decoded) {
        if (err) {
            return res.status(200).json({
                err: RespCode.UNAUTHORIZED.code,
                message: RespCode.UNAUTHORIZED.message,
                data: null
            });
        }

        // Chỉ cho phép Officer (role === 'officer')
        if (!decoded || decoded.role !== 'officer') {
            return res.status(200).json({
                err: RespCode.UNAUTHORIZED.code,
                message: 'Chỉ Officer mới được thực hiện thao tác này',
                data: null
            });
        }

        req.user = decoded;
        return next();
    });
};
