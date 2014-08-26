var Benchmark = require('benchmark'),
    fs = require('fs'),
    queue = require('queue-async'),
    Overlay = require('../');

var suite = new Benchmark.Suite();

new Overlay('overlaydata://' + fs.readFileSync('./test/data/complex.geojson', 'utf8'),
    function(err, source) {
        suite
        .add('#getTile', function(deferred) {
            var q = queue(4);
            for (var i = 0; i < 16; i++) q.defer(function(done) {
                source.getTile(11, 486, 779, done);
            });
            q.awaitAll(function() {
                deferred.resolve();
            });
        }, {
            defer: true
        })
        .on('cycle', function(event) {
            console.log(String(event.target));
        })
        .on('complete', function() {
            console.log('Fastest is ' + this.filter('fastest').pluck('name'));
        })
        .run({ 'async': true });
    });
