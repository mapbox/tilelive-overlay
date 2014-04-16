var test = require('tap').test,
    fs = require('fs'),
    getUrlMarker = require('../lib/urlmarker.js');

test('getUrlMarker', function(t) {
    getUrlMarker({
        label: 'https://www.mapbox.com/maki/renders/bus-18.png'
    }, function(err, data) {
        t.notOk(err, 'does not return an error');
        t.ok(data, 'returns data');
        t.end();
    });
});
