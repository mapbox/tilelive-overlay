var test = require('tap').test,
    Simple = require('../');

test('simple', function(t) {
    console.log('simple://' + __dirname + '/data/example.geojson');
    new Simple('simple://' + __dirname + '/data/example.geojson', function(err, source) {
        console.log(arguments);
        t.notOk(err, 'no error returned');
        t.ok(source, 'source created');
        source.getGrid(0, 0, 0, function(err, res) {
            t.equal(err, 'This source does not provide grids', 'does not provide grids');
        });
        source.getInfo(function(err, res) {
            t.equal(err, 'This source does not provide info', 'does not provide info');
        });
        t.end();
    });
});
