var Benchmark = require('benchmark'),
    fs = require('fs'),
    Overlay = require('../');

var suite = new Benchmark.Suite();

new Overlay('overlaydata://' + fs.readFileSync('./test/data/example.geojson', 'utf8'),
    function(err, source) {
        suite
        .add('#getTile', function(deferred) {
            source.getTile(0, 0, 0, function() {
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
