var test = require('tap').test,
    fs = require('fs'),
    generatexml = require('../lib/generatexml.js');

test('generatexml', function(t) {
    t.equal(generatexml(
        JSON.parse(fs.readFileSync(__dirname + '/data/example.geojson'))),
        fs.readFileSync(__dirname + '/data/example.xml', 'utf8'));
    t.end();
});
