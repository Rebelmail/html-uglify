var assert = require('chai').assert;
var cheerio = require('cheerio');
var Uglify = require('../lib/main.js');

var html;

describe('Uglify', function() {
  describe('#constructor', function() {
    it('should return an access', function() {
      assert.isObject(Uglify.access);
    });
    it('should return an access.used', function() {
      assert.isArray(Uglify.access.used.ids);
    });
    it('should return a forCss', function() {
      assert.isObject(Uglify.access.forCSS);
    });
    it('should return an idmapper', function() {
      assert.equal(Uglify.access.idmapper, 0);
    });
    it('should return a classmapper', function() {
      assert.equal(Uglify.access.classmapper, 0);
    });
  });

  describe('#generateId', function() {
    it('can generate an id', function() {
      var original = 'header';
      //Uglify.mungeId(original);

    });
  });

  describe('#styles', function() {
    it('returns 2 style elements', function() {
      var html = '<style>.some-css{};</style><style>.other-css{};</style>';
      var results = Uglify.styles(html);
      assert.equal(results.length, 2);
    });
  });

  describe('#elements', function() {
    it('returns one element', function() {
      var html = '<h1>Header 1</h1>';
      var results = Uglify.elements(html);
      assert.equal(results.length, 1);
    });
    it('returns two elements', function() {
      var html = '<h1>Header 1</h1><p>Paragraph</p>';
      var results = Uglify.elements(html);
      assert.equal(results.length, 2);
    });
    it('returns two elements when nested', function() {
      var html = '<h1>Header <strong>1</strong></h1>';
      var results = Uglify.elements(html);
      assert.equal(results.length, 2);
    });
    it('returns three elements when nested', function() {
      var html = '<h1>Header <strong><span>1</span></strong></h1>';
      var results = Uglify.elements(html);
      assert.equal(results.length, 3);
    });
  });

  describe('#rewriteElements', function() {
    it('rewrites multiple nested ids', function() {
      var html = '<h1 id="header">Header <strong id="strong"><span id="span">1</span></strong></h1><label for="something">Something</label><label for="null">null</label><div class="some classes">Some Classes</div>';
      var results = Uglify.rewriteElements(html);
    });
    it('rewrites an id', function() {
      var html = '<h1 id="abe">Header</h1>';
      var results = Uglify.rewriteElements(html);
      assert.equal(results, '<h1 id="xz">Header</h1>');
    });
    it('rewrites a class', function() {
      var html = '<h1 class="abe">Header</h1>';
      var results = Uglify.rewriteElements(html);
      assert.equal(results, '<h1 class="xz">Header</h1>');
    });
    it('rewrites a class', function() {
      var html = '<h1 class="abe">Header</h1>';
      var results = Uglify.rewriteElements(html);
      assert.equal(results, '<h1 class="xz">Header</h1>');
    });
    it('rewrites a for', function() {
      var html = '<label for="abe">Label</h1>';
      var results = Uglify.rewriteElements(html);
      assert.equal(results, '<label for="xz">Label</label>');
    });
  });

  describe('uglify', function() {
    xit('uglifies style and html', function() {
      Uglify.uglify("<style>.demo_class#andID{color:red}</style><div class='demo_class' id='andID'>Welcome to HTML Uglifier</div>", function(err, result) {
        assert.equal(result.html, '<style>.xz#xz {\n  color: red;\n}</style><div class="xz" id="xz">Welcome to HTML Uglifier</div>');
        //console.log(result.map);
        //console.log(result.html);
      });
    });
  });
});


