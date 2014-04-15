var fs = require('fs'),
    path = require('path'),
    blend = require('blend'),
    xtend = require('xtend'),
    get = require('./get.js');

var ErrorHTTP = require('./errorhttp');

// Hardcoded mtime date to ensure stable Last-Modified / ETag headers for
// marker requests. This should be updated whenever the source marker assets
// or rendering behavior is changed.
// @TODO deprecate this in favor of loading markers from S3/API source.
var mtime = new Date('Mon May 06 2013 20:00:00 UTC');

module.exports = Marker;

function Marker(options, callback) {
    if (options.tint) {
        // Expand hex shorthand (3 chars) to 6, e.g. 333 => 333333.
        // This is not done upstream in `node-tint` as some such
        // shorthand cannot be disambiguated from other tintspec strings,
        // e.g. 123 (rgb shorthand) vs. 123 (hue).
        if (options.tint.length === 3) options.tint =
            options.tint[0] + options.tint[0] +
            options.tint[1] + options.tint[1] +
            options.tint[2] + options.tint[2];
        this.tint = blend.parseTintString(options.tint);
    }

    // Unique key for all (file or url) markers.
    this.key = options.name + (typeof options.label !== 'undefined' ? '-' + options.label : '') + (options.retina ? '@2x' : '');

    if (options.name === 'url') {
        this._loadURL(options, callback);
    // Alpha-numeric files.
    } else if (!options.label || (options.label && options.label.length === 1)) {
        this._loadFile(options, callback);
    } else {
        this._loadMaki(options, callback);
    }
}

Marker.offsets = {
    's': {x:4,y:4},
    'm': {x:6,y:5},
    'l': {x:5,y:7},
    's@2x': {x:8,y:8},
    'm@2x': {x:12,y:10},
    'l@2x': {x:10,y:14}
};

Marker.sizes = {
    s: 12,
    m: 18,
    l: 24
};

// Loads up all default markers at require time.
Marker.cache = [
    ['base', 'base'],
    ['mask', 'mask'],
    ['alphanum', 'symbol']
].reduce(function(memo, destsrc) {
    var dest = destsrc[1],
        src = destsrc[0];
    var basepath = path.resolve(__dirname + '/../markers-src/' + src);
    memo[dest] = fs.readdirSync(basepath)
        .sort()
        .reduce(function(memo, file) {
            if (path.extname(file) !== '.png') return memo;
            var key = path.basename(file, '.png')
                .replace('-12', '-s')
                .replace('-18', '-m')
                .replace('-24', '-l');
            memo[key] = fs.readFileSync(basepath + '/' + file);
            return memo;
        }, memo[dest] || {});
    return memo;
}, { url: {} });

/**
 * @param {object} options
 * @param {function} callback
 */
Marker.prototype._loadMaki = function(options, callback) {
    var base = options.name + ((options.name && options.retina) ? '@2x' : '');
    var size = options.name.split('-').pop();
    var symbol = (options.label || '') +
        ((options.label && size) ? '-' + Marker.sizes[size] : '') +
        ((options.label && options.retina) ? '@2x' : '');

    if (!base || !size) {
        return callback(new ErrorHTTP('Marker "' + this.key + '" is invalid.', 400));
    }

    get('http://s3.amazonaws.com/www.mapbox.com/maki/renders/' + symbol + '.png', this.key, function(err, data) {
        if (err) return callback(new ErrorHTTP('Marker "' + this.key + '" is invalid.', 400));

        // Base marker gets tint applied.
        var parts = [{
            buffer: Marker.cache.base[base],
            tint: this.tint
        }];

        // If symbol is present, find correct offset (varies by marker size).
        if (symbol) {
            parts.push(xtend({
                buffer: data,
                tint: blend.parseTintString('0x0;0x0;1.4x0'),
            }, Marker.offsets[size + (options.retina ? '@2x' : '')]));
        }

        // Add mask layer.
        parts.push({
            buffer: Marker.cache.mask[base]
        });

        // Extract width and height from the IHDR. The IHDR chunk must appear
        // first, so the location is always fixed.
        this.width = Marker.cache.base[base].readUInt32BE(16);
        this.height = Marker.cache.base[base].readUInt32BE(20);

        this.maxAge = 3600;
        this.mtime = mtime;
        this.size = data.length;

        // Combine base, (optional) symbol, to supply the final marker.
        blend(parts, {
            format: 'png',
            quality: 256,
            width: this.width,
            height: this.height
        }, function(err, data) {
            if (err) return callback(err);
            this.image = data;
            return callback(null, this);
        }.bind(this));
    }.bind(this));
};

/**
 * @param {object} options
 * @param {function} callback
 */
Marker.prototype._loadURL = function(options, callback) {
    var uri = options.label;
    if (uri.substring(0, 4) !== 'http') uri = 'http://' + uri;

    get(uri, function(err, data) {
        if (err) return callback(err);

        // Check for PNG header.
        if (data.toString('binary', 0, 8) !== '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A') {
            return callback(new ErrorHTTP('Marker image format is not supported.', 415));
        }

        // Extract width and height from the IHDR. The IHDR chunk must appear
        // first, so the location is always fixed.
        this.width = data.readUInt32BE(16);
        this.height = data.readUInt32BE(20);

        // Check image size. 400x400 square limit.
        if (this.width * this.height > 160000) {
            return callback(new ErrorHTTP('Marker image size must not exceed 160000 pixels.', 415));
        }

        this.maxAge = 3600;
        this.mtime = mtime;
        this.size = data.length;
        this.image = data;

        if (!this.tint) return callback(null, this);

        blend([{buffer:data, tint:this.tint}], {}, function(err, tinted) {
            if (err) return callback(err);
            this.image = tinted;
            return callback(null, this);
        }.bind(this));
    }.bind(this));
};

/**
 * @param {object} options
 * @param {function} callback
 */
Marker.prototype._loadFile = function(options, callback) {
    var base = options.name + ((options.name && options.retina) ? '@2x' : '');
    var size = options.name.split('-').pop();
    var symbol = (options.label || '') +
        ((options.label && size) ? '-' + size : '') +
        ((options.label && options.retina) ? '@2x' : '');

    if (!base || !size || !Marker.cache.base[base] || (symbol && !Marker.cache.symbol[symbol])) {
        return callback(new ErrorHTTP('Marker "' + this.key + '" is invalid.', 400));
    }

    // Base marker gets tint applied.
    var parts = [{
        buffer: Marker.cache.base[base],
        tint: this.tint
    }];

    // If symbol is present, find correct offset (varies by marker size).
    if (symbol) {
        parts.push(xtend({
            buffer: Marker.cache.symbol[symbol],
            tint: blend.parseTintString('0x0;0x0;1.4x0'),
        }, Marker.offsets[size + (options.retina ? '@2x' : '')]));
    }

    // Add mask layer.
    parts.push({ buffer:Marker.cache.mask[base] });

    // Extract width and height from the IHDR. The IHDR chunk must appear
    // first, so the location is always fixed.
    this.width = Marker.cache.base[base].readUInt32BE(16);
    this.height = Marker.cache.base[base].readUInt32BE(20);
    this.maxAge = 3600;

    // Combine base, (optional) symbol, to supply the final marker.
    blend(parts, {
        format: 'png',
        quality: 256,
        width: this.width,
        height: this.height
    }, function(err, data) {
        if (err) return callback(err);
        this.mtime = mtime;
        this.size = data.length;
        this.image = data;
        return callback(null, this);
    }.bind(this));
};
