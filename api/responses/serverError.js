module.exports = function serverError(data, message = 'Lỗi hệ thống') {
    const res = this.res;
    if (data !== undefined) {
        sails.log.error('Sending 500 ("Server Error") response: \n', data);
    }
    return res.status(200).json({
        err: 500,
        message: message,
        data: data ? (data.message || data.toString()) : null
    });
};
