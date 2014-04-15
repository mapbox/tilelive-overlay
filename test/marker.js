var test = require('tap').test,
    fs = require('fs'),
    Marker = require('../lib/marker.js');

test('cache', function(t) {
    t.deepEqual(Object.keys(Marker.cache),
        ['url', 'base', 'mask', 'symbol'], 'has built a cache');
    t.end();
});

test('marker', function(t) {
    new Marker({
        name: 'url',
        label: 'https://www.mapbox.com/maki/renders/bus-18.png'
    }, function(err, data) {
        t.notOk(err, 'does not return an error');
        t.end();
    });
});
