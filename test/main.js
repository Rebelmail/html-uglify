var assert = require('chai').assert;
var sinon = require('sinon');
var cheerio = require('cheerio');
var Uglify = require('../index.js');

describe('Uglify', function() {
  describe('#constructor', function() {
    it('should throw if REBELMAIL_URL is missing', function() {
      assert.throws((function() {new Uglify();}), 'url missing');
    });
  });
});


