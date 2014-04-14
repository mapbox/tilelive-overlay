var PROJ = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over",
    WGS84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs",
    HEADER = '<?xml version="1.0" encoding="utf-8"?>' +
    '<Map srs="' + PROJ + '">',
    FOOTER = '</Map>';

/**
 * @param {object} data a geojson object
 * @returns {string} a mapnik style
 */
module.exports = function generateXML(data) {
    if (!data.features) return null;

    var ls = data.features.map(convertFeature);

    var styles = ls.map(function(l) {
        return l.style;
    }).join('');

    var layers = ls.map(function(l) {
        return l.layer;
    }).join('');

    return HEADER +
        styles +
        layers +
        FOOTER;
};

/**
 * @param {object} feature geojson feature
 * @returns {object}
 */
function convertFeature(feature, i) {
    return {
        style: generateStyle(feature, i),
        layer: generateLayer(feature, i)
    };
}

var styleMap = {
    'stroke': ['LineSymbolizer', 'stroke'],
    'stroke-opacity': ['LineSymbolizer', 'opacity'],
    'stroke-width': ['LineSymbolizer', 'stroke-width'],
    'fill': ['PolygonSymbolizer', 'fill'],
    'fill-opacity': ['PolygonSymbolizer', 'opacity']
};

/**
 * @param {object} feature geojson feature
 * @returns {string}
 */
function generateStyle(feature, i) {
    if (!feature.properties) return null;
    return tag('Style',
        tag('Rule',
        pairs(pairs(feature.properties)
            .reduce(collectSymbolizers, {}))
            .map(function(symbolizer) {
                return tagClose(symbolizer[0], pairs(symbolizer[1]));
            })),
            [['name', 'style-' + i]]);
}

function collectSymbolizers(mem, prop) {
    var mapped = styleMap[prop[0]];
    if (mapped) {
        if (!mem[mapped[0]]) mem[mapped[0]] = {};
        mem[mapped[0]][mapped[1]] = prop[1];
    }
    return mem;
}

/**
 * @param {object} feature geojson feature
 * @returns {string}
 */
function generateLayer(feature, i) {
    if (!feature.geometry) return null;

    return tag('Layer',
        tag('Stylename', 'style-' + i) +
        tag('Datasource',
            [
                ['type', 'ogr'],
                ['layer_by_index', '0'],
                ['driver', 'GeoJson'],
                ['string', JSON.stringify(feature.geometry)]
            ].map(function(a) {
                return tag('Parameter', a[1], [['name', a[0]]]);
            }).join('')), [
                ['name', 'layer-' + i],
                ['srs', WGS84]
            ]);
}

/**
 * @param {object} o
 * @returns {array}
 */
function pairs(o) {
    return Object.keys(o).map(function(k) {
        return [k, o[k]];
    });
}

/**
 * @param {array} _ an array of attributes
 * @returns {string}
 */
function attr(_) {
    return (_ && _.length) ? (' ' + _.map(function(a) {
        return a[0] + '="' + a[1] + '"';
    }).join(' ')) : '';
}

/**
 * @param {string} el element name
 * @param {array} attributes array of pairs
 * @returns {string}
 */
function tagClose(el, attributes) {
    return '<' + el + attr(attributes) + '/>';
}

/**
 * @param {string} el element name
 * @param {string} contents innerXML
 * @param {array} attributes array of pairs
 * @returns {string}
 */
function tag(el, contents, attributes) {
    return '<' + el + attr(attributes) + '>' + contents + '</' + el + '>';
}

/**
 * @param {string} _ a string of attribute
 * @returns {string}
 */
function encode(_) {
    return (_ === null ? '' : _.toString()).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
