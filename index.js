var util = require('util'),
    mapnik = require('mapnik'),
    sph = require('./lib/sphericalmercator.js'),
    geojsonhint = require('geojsonhint'),
    mapnikify = require('geojson-mapnikify'),
    getUrlMarker = require('./lib/urlmarker.js'),
    getMarker = require('makizushi'),
    url = require('url'),
    fs = require('fs'),
    queue = require('queue-async'),
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
        throw new Error('Only the overlaydata protocol is supported');
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

    var done = function(err) {
        if (err) return callback(err);
        return callback(null, this);
    }.bind(this);

    var generated = mapnikify(JSON.parse(data), retina);
    this._xml = generated.xml;

    if (generated.resources.length) {
        var q = queue(10);
        generated.resources.forEach(function(res) {
            q.defer(loadMarker, res.replace('@2x', ''), retina);
        });
        q.awaitAll(done);
    } else {
        done();
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
    var im = new mapnik.Image(256, 256);

    map.fromStringSync(this._xml, {});
    map.bufferSize = 256;
    map.extent = sph.xyz_to_envelope(x, y, z);
    map.render(im, function(err, im) {
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
    tilelive.protocols['overlaydata:'] = Source;
};

function loadMarker(id, retina, callback) {
    var matchURL = /^(url)(?:-([^\(]+))()/;
    var matchFile = /^(pin-s|pin-m|pin-l)(?:-([a-z0-9-]+))?(?:\+([0-9a-fA-F]{6}|[0-9a-fA-F]{3}))?$/;

    var isurl = id.indexOf('url-') === 0;
    var marker = id.match(isurl ? matchURL : matchFile);

    if (!marker) {
        return callback('Marker "' + marker + '" is invalid.');
    }

    var slug = id + (retina ? '@2x' : '') + '.png';

    if (isurl) {
        getUrlMarker({
            label: marker[2]
        }, function(err, data) {
            if (err) return callback(err);
            fs.writeFile(TMP + slug, data.image, callback);
        });
    } else {
        getMarker({
            name: marker[1],
            label: marker[2],
            tint: marker[3],
            retina: retina
        }, function(err, data) {
            if (err) return callback(err);
            fs.writeFile(TMP + slug, data.image, callback);
        });
    }
}
