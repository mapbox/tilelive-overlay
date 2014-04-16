var test = require('tap').test,
    fs = require('fs'),
    Overlay = require('../');

test('overlay', function(t) {
    new Overlay('overlaydata://' + fs.readFileSync(__dirname + '/data/example.geojson', 'utf8'),
        function(err, source) {
        if (err) throw err;
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
