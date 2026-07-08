module.exports = function badRequest(data, message = 'Yêu cầu không hợp lệ') {
    const res = this.res;
    return res.status(200).json({
        err: 400,
        message: (data && data.message) ? data.message : message,
        data: data || null
    });
};
