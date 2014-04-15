var http = require('http');

var ErrorHTTP = module.exports = function(message, status) {
    if (typeof message === 'number') {
        status = message;
        message = null;
    }
    if (!message) {
        message = http.STATUS_CODES[status] || 'Unknown';
    }

    Error.call(this, message);
    Error.captureStackTrace(this, arguments.callee);
    this.message = message;
    this.status = status;
};

/* jshint proto: true */
ErrorHTTP.prototype.__proto__ = Error.prototype;
