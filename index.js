var util = require('util'),
    mapnik = require('mapnik'),
    sph = require('./lib/sphericalmercator.js'),
    geojsonhint = require('geojsonhint'),
    mapnikify = require('geojson-mapnikify'),
    getUrlMarker = require('./lib/urlmarker.js'),
    url = require('url'),
    fs = require('fs'),
    Pool = require('generic-pool').Pool,
    ErrorHTTP = require('./lib/errorhttp'),
    os = require('os'),
    path = require('path');

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
    var uri = url.parse(id);

    if (!uri || (uri.protocol && uri.protocol !== 'overlaydata:')) {
        return callback('Only the overlaydata protocol is supported');
    }

    var data = id.replace('overlaydata://', '');
    var retina = false;

    if (data.indexOf('2x:') === 0) {
        retina = true;
        data = data.replace(/^2x:/, '');
    }

    if (geojsonhint.hint(data).length) {
        return callback('invalid geojson');
    }

    var generated = mapnikify(JSON.parse(data), retina, function(err, xml) {
        if (err) return callback(err);
        this._xml = xml;
        this._map = Pool({
            create: function(callback) {
                var map = new mapnik.Map(256, 256);
                map.fromString(this._xml, { strict:false }, function(err) {
                    if (err) return callback(err);
                    map.bufferSize = 256;
                    return callback(err, map);
                });
            }.bind(this),
            destroy: function(map) { delete map; },
            max: require('os').cpus().length
        });
        callback(null, this);
    }.bind(this));
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
    this._map.acquire(function(err, map) {
        if (err) return callback(err);
        var im = new mapnik.Image(256, 256);
        map.extent = sph.xyz_to_envelope(x, y, z);
        map.render(im, {}, function(err, im) {
            if (err) return callback(err);
            im.encode('png', function(err, res) {
                callback(err, res);
            });
        });
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
    tilelive.protocols['overlaydata:'] = Source;
};
