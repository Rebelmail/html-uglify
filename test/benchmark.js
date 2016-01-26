'use strict';

var fs = require('fs');
var Benchmark = require('benchmark');
var posthtml = require('posthtml');
var uglify = require('../lib/main.js');

var suite = new Benchmark.Suite();
var htmlUglify = posthtml().use(uglify());

console.log('Running benchmark');

var html = fs.readFileSync('./test/test.html');

suite
.add('#process', function(done) {
  htmlUglify.process(html, { sync: true });
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.run({ 'async': true });
