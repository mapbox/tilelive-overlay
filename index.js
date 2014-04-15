var util = require('util'),
    mapnik = require('mapnik'),
    sph = require('./lib/sphericalmercator.js'),
    geojsonhint = require('geojsonhint'),
    generateXML = require('./lib/generatexml.js'),
    Marker = require('./lib/marker.js'),
    url = require('url'),
    fs = require('fs'),
    queue = require('queue-async'),
    ErrorHTTP = require('./lib/errorhttp'),
    os = require('os'),
    fs = require('fs'),
    path = require('path');

var TMP = os.tmpdir() + 'tl-overlay';

try {
    fs.mkdirSync(TMP);
} catch(e) { }

if (mapnik.register_default_input_plugins) {
    mapnik.register_default_input_plugins();
}

module.exports = Source;

require('util').inherits(Source, require('events').EventEmitter);

/**
 * Create a new source that returns tiles from a simplestyle-supporting
 * GeoJSON object.
 *
 * @param {string} uri
 * @param {function} callback
 * @returns {undefined}
 */
function Source(id, callback) {
    var uri = normalizeURI(id);
    if (!uri || (uri.protocol && uri.protocol !== 'simple:')) {
        throw new Error('Only the simple protocol is supported');
    }

    var filename = path.resolve(uri.pathname);
    fs.readFile(filename, 'utf8', function(err, data) {
        if (err) return callback(err);
        if (geojsonhint.hint(data).length) {
            return callback('invalid geojson');
        }

        var done = function(err) {
            if (err) return callback(err);
            this.map.fromStringSync(generated.xml, {});
            return callback(null, this);
        }.bind(this);

        try {
            this.map = new mapnik.Map(256, 256);
            var generated = generateXML(JSON.parse(data), TMP);
            if (generated.resources.length) {
                var q = queue(10);
                generated.resources.forEach(function(res) {
                    q.defer(loadMarker, res);
                });
                q.awaitAll(done);
            } else {
                done();
            }
        } catch (e) {
            return callback(e);
        }
    }.bind(this));
}

function loadMarker(id, callback) {
    var matchURL = /^(url)(?:-([^\(]+))()\((-?\d+(?:.\d+)?),(-?\d+(?:.\d+)?)/;
    var matchFile = /^(pin-s|pin-m|pin-l)(?:-([a-z0-9-]+))?(?:\+([0-9a-fA-F]{3}|[0-9a-fA-F]{6}))?/;

    var isurl = id.indexOf('url-') === 0;
    var marker = id.match(isurl ? matchURL : matchFile);
    if (!marker) return callback(new ErrorHTTP('Marker "' + marker + '" is invalid.', 400));
    new Marker({
        name: marker[1],
        label: marker[2],
        tint: marker[3],
        lon: parseFloat(marker[4]),
        lat: parseFloat(marker[5]),
        retina: true // req.params.retina === '@2x'
    }, function(err, data) {
        fs.writeFile(TMP + '/' + id, data, callback);
    });
}

/**
 * Gets a tile from this source.
 *
 * @param {number} z
 * @param {number} x
 * @param {number} y
 * @param {function} callback
 */
Source.prototype.getTile = function(z, x, y, callback) {
    var im = new mapnik.Image(256, 256);
    this.map.extent = sph.xyz_to_envelope(z, x, y);
    this.map.render(im, function(err, im) {
        if (err) return callback(err);
        callback(err, im.encodeSync('png'));
    });
};

/**
 * Gets a grid from this source: this will always fail, because
 * this source does not provide grids.
 *
 * @param {number} z
 * @param {number} x
 * @param {number} y
 * @param {function} callback
 */
Source.prototype.getGrid = function(z, x, y, callback) {
    callback('This source does not provide grids');
};

/**
 * Gets info from this source: this will always fail, because
 * this source does not provide info.
 *
 * @param {function} callback
 */
Source.prototype.getInfo = function(callback) {
    callback('This source does not provide info');
};

/**
 * @param {object} tilelive
 */
Source.registerProtocols = function(tilelive) {
    tilelive.protocols['simple:'] = Source;
};

/**
 * @param {string} uri
 * @returns {string}
 */
function normalizeURI(uri) {
    if (typeof uri === 'string') uri = url.parse(uri, true);
    if (uri.hostname === '.' || uri.hostname == '..') {
        uri.pathname = uri.hostname + uri.pathname;
        delete uri.hostname;
        delete uri.host;
    }
    if (typeof uri.pathname !== 'undefined') {
        uri.pathname = path.resolve(uri.pathname);
    }
    return uri;
}
