const jwt = require('jsonwebtoken');

const SECRET_KEY = 'd42d0909b8a25654893b8c6f6d98a497c6b29aa0e6a9c29e542a0624a921288e';

module.exports = {
    issue: function (payload) {
        return jwt.sign(payload, SECRET_KEY, { expiresIn: '1d' });
    },
    verify: function (token, callback) {
        return jwt.verify(token, SECRET_KEY, callback);
    }
};