module.exports = function sendError(errCodeObj, customMessage) {
    const res = this.res;
    return res.status(200).json({
        err: errCodeObj.code,
        message: customMessage || errCodeObj.message,
        data: null
    });
};