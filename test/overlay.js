var test = require('tap').test,
    fs = require('fs'),
    mapnik = require('mapnik'),
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

test('overlay - fixture', function(t) {
    new Overlay('overlaydata://' + fs.readFileSync(__dirname + '/data/example.geojson', 'utf8'),
        function(err, source) {
        if (err) throw err;
        t.notOk(err, 'no error returned');
        t.ok(source, 'source created');
        source.getTile(0, 0, 0, function(err, res) {
            t.notOk(err, 'no error');
            if (process.env.UPDATE) fs.writeFileSync(__dirname + '/data/fixture.png', res);
            var expectImage = new mapnik.Image.open(__dirname + '/data/fixture.png');
            var resultImage = new mapnik.Image.fromBytesSync(res);

            // Allow < 2% of pixels to vary by > default comparison threshold of 16.
            var pxThresh = resultImage.width() * resultImage.height() * 0.02;
            var pxDiff = expectImage.compare(resultImage);
            t.end();
        });
    });
});

test('overlay-invalid', function(t) {
    new Overlay('overlaydata://invalidjson', function(err, source) {
        t.equal(err, 'invalid geojson');
        t.end();
    });
});

test('overlay-invalid', function(t) {
    new Overlay('overladata://invalidjson', function(err, source) {
        t.equal(err, 'Only the overlaydata protocol is supported');
        t.end();
    });
});
