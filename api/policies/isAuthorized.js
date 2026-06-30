const RespCode = require('../services/Respcode');

module.exports = function (req, res, next) {
    let token;

    if (req.headers && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');

        if (parts.length === 2) {
            const scheme = parts[0];
            const credentials = parts[1];

            if (/^Bearer$/i.test(scheme)) {
                token = credentials;
            }
        } else {
            return res.status(200).json({
                err: RespCode.MISS_BEARER.code,
                message: "Sai định dạng Bearer token",
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
        req.user = decoded;
        return next();
    });
};