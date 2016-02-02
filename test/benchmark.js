'use strict';

var fs = require('fs');
var Benchmark = require('benchmark');
var posthtml = require('posthtml');
var uglify = require('../lib/main.js');

var suite = new Benchmark.Suite();
var htmlUglify = posthtml().use(uglify());

var html = fs.readFileSync('./test/test.html');

console.log('Running benchmark');

suite
  .add('#process', {
    defer: true,
    fn: function(deferred) {
      htmlUglify.process(html).then(function() {
        deferred.resolve();
      });
    }
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .run({ async: true });
