var util = require('util'),
    mapnik = require('mapnik'),
    sph = require('./lib/sphericalmercator.js'),
    mapnikify = require('geojson-mapnikify'),
    url = require('url'),
    fs = require('fs'),
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

    try {
        var parsed = JSON.parse(data);
        var generated = mapnikify(parsed, retina, function(err, xml) {
            if (err) return callback(err);
            console.log(xml);
            this._xml = xml;
            callback(null, this);
        }.bind(this));
    } catch(e) {
        return callback('invalid geojson');
    }
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
    var map = new mapnik.Map(256, 256);

    try {
        map.fromString(this._xml, {}, function(err) {
            if (err) return callback(err);
            map.extent = sph.xyz_to_envelope(x, y, z);
            map.render(new mapnik.Image(256, 256), {}, onrender);
        });
    } catch(e) {
        callback(e);
    }

    function onrender(err, im) {
        if (err) return callback(err);
        im.encode('png8:m=h:z=1', function(err, res) {
            callback(err, res);
        });
    }
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
