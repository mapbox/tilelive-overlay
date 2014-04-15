var test = require('tap').test,
    fs = require('fs'),
    generatexml = require('../lib/generatexml.js');

function generates(t, name) {
    console.log(name, fs.readFileSync(__dirname + '/data/' + name + '.xml', 'utf8'));
    t.equal(generatexml(JSON.parse(fs.readFileSync(__dirname + '/data/' + name + '.geojson'))),
        fs.readFileSync(__dirname + '/data/' + name + '.xml', 'utf8'), name);
}

test('generatexml', function(t) {
    generates(t, 'example');
    generates(t, 'point');
    t.end();
});
