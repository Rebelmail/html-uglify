var assert = require('chai').assert;
var cheerio = require('cheerio');
var Uglify = require('../lib/main.js');

describe('Uglify', function() {
  describe('#constructor', function() {
    it('should return an access', function() {
      assert.isObject(Uglify.access);
    });
    it('should return an access.used', function() {
      assert.isArray(Uglify.access.used.ids);
    });
    it('should return an forCss', function() {
      assert.isObject(Uglify.access.forCSS);
    });
    it('should return an idmapper', function() {
      assert.equal(Uglify.access.idmapper, 0);
    });
    it('should return an classmapper', function() {
      assert.equal(Uglify.access.classmapper, 0);
    });
  });

  describe('uglify', function() {
    it('uglifies style and html', function() {
      Uglify.uglify("<style>.demo_class#andID{color:red}</style><div class='demo_class' id='andID'>Welcome to HTML Uglifier</div>", function(err, result) {
        assert.equal(result.html, '<style>.xz#xz {\n  color: red;\n}</style><div class="xz" id="xz">Welcome to HTML Uglifier</div>');
        //console.log(result.map);
        //console.log(result.html);
      });
    });

  });
});


