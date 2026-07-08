module.exports = function forbidden(data, message = 'Không có quyền truy cập') {
    const res = this.res;
    return res.status(200).json({
        err: 403,
        message: (data && data.message) ? data.message : message,
        data: data || null
    });
};
