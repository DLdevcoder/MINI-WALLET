module.exports = function sendOK(data, message = 'Thành công') {
    const res = this.res;
    return res.status(200).json({
        err: 200,
        message: message,
        data: data || null
    });
};