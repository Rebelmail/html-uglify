'use strict';

var fs = require('fs');
var Benchmark = require('benchmark');
var HTMLUglify = require('../lib/main.js');

var suite = new Benchmark.Suite();
var htmlUglify = new HTMLUglify();

console.log('Running benchmark');

var html = fs.readFileSync('./test/test.html');

suite
.add('#process', function() {
   htmlUglify.process(html);
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.run({ 'async': true });

