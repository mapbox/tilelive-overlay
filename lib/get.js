var xtend = require('xtend'),
    url = require('url'),
    http = require('http'),
    https = require('https'),
    concat = require('concat-stream'),
    agent = new (require('agentkeepalive'))({
        maxSockets: 128,
        maxKeepAliveRequests: 0,
        maxKeepAliveTime: 30000
    }),
    urlcache = require('lru-cache')({ max: 100, maxAge: 600000 });

module.exports = get;

/**
 * @param {string} uri
 * @param {function} callback
 */
function get(uri, callback) {
    var key = this.key;

    if (urlcache.get(key)) {
        return callback(null, urlcache.get(key));
    }

    // This might load the same file multiple times, but the overhead should
    // be very little.
    var isSSL = uri.indexOf('https') === 0,
        client = isSSL ? https : http;

    var request = client.get(xtend(url.parse(uri), {
        headers: { 'accept-encoding': 'binary' },
        agent: isSSL ? null : agent // Don't use keepalive agent for https.
    }), onload);
    request.setTimeout(5000);
    request.on('error', onerror);
    request.end();

    function onerror(err) {
        return callback(new ErrorHTTP('Unable to load marker from URL.', 400));
    }

    function onload(res) {
        res.pipe(concat(function(data) {
            // Use err.status of 400 as it's not an unexpected application error,
            // but likely due to a bad request. Catches ECONNREFUSED,
            // getaddrinfo ENOENT, etc.
            if (!data) {
                return callback(new ErrorHTTP('Unable to load marker from URL.', 400));
            }
            // request 2.2.x *always* returns the response body as a string.
            // @TODO remove this once request is upgraded.
            if (!(data instanceof Buffer)) {
                data = new Buffer(data, 'binary');
            }
            // Restrict data length.
            if (data.length > 32768) return callback(new ErrorHTTP(400));
            var headers = res.headers;
            urlcache.set(key, data);
            callback(null, data);
        }));
    }
}
