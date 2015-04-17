'use strict';

var assert = require('chai').assert;
var cheerio = require('cheerio');
var HTMLUglify = require('../lib/main.js');

var htmlUglify = new HTMLUglify();

describe('HTMLUglify', function() {
  describe('#isWhitelisted', function() {
    var whitelist;
    var htmlUglify;

    beforeEach(function() {
      whitelist = ['#theid', '.theclass'];
      htmlUglify = new HTMLUglify({whitelist: whitelist});
    });
    it('returns true if id is in whitelist', function() {
      var whitelisted = htmlUglify.isWhitelisted('id', 'theid')
      assert.isTrue(whitelisted);
    });
    it('returns false if id is in the whitelist but only checking for classes', function() {
      var whitelisted = htmlUglify.isWhitelisted('class', 'theid')
      assert.isFalse(whitelisted);
    });
    it('returns true if class is in whitelist', function() {
      var whitelisted = htmlUglify.isWhitelisted('class', 'theclass')
      assert.isTrue(whitelisted);
    });
  });
  describe('#rewriteStyles', function() {
    it('rewrites an id given lookups', function() {
      var lookups = { 'id=abe': 'xz' };
      var html = '<style>#abe{ color: red; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>#xz{ color: red; }</style>');
    });
    it('does not rewrite an id given no lookups', function() {
      var lookups = { };
      var html = '<style>#abe{ color: red; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>#abe{ color: red; }</style>');
    });
    it('rewrites an id with the same name as the element', function() {
      var lookups = { 'id=label': 'ab' };
      var html = '<style>label#label{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label#ab{ color: blue; }</style>');
    });
    it('rewrites a for= given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[for=email]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, "<style>label[for=ab]{ color: blue; }</style>");
    });
    it('does not rewrite a for= given no lookups', function() {
      var lookups = {};
      var html = '<style>label[for=email]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, "<style>label[for=email]{ color: blue; }</style>");
    });
    it('rewrites a for= with quotes given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[for="email"]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label[for="ab"]{ color: blue; }</style>');
    });
    it('rewrites a for= with the same name as the element', function() {
      var lookups = { 'id=label': 'ab' };
      var html = '<style>label[for="label"]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label[for="ab"]{ color: blue; }</style>');
    });
    it('rewrites an id= given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[id=email]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label[id=ab]{ color: blue; }</style>');
    });
    it('rewrites an id= with quotes given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[id="email"]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label[id="ab"]{ color: blue; }</style>');
    });
    it('rewrites an id= with quotes and with the same name as the element', function() {
      var lookups = { 'id=label': 'ab' };
      var html = '<style>label[id="label"]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label[id="ab"]{ color: blue; }</style>');
    });
    it('rewrites a class given lookups', function() {
      var lookups = { 'class=email': 'ab' };
      var html = '<style>label.email{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label.ab{ color: blue; }</style>');
    });
    it('rewrites a class with the same name as the element', function() {
      var lookups = { 'class=label': 'ab' };
      var html = '<style>label.label{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label.ab{ color: blue; }</style>');
    });
    it('rewrites a class= given lookups', function() {
      var lookups = { 'class=email': 'ab' };
      var html = '<style>form [class=email] { color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, "<style>form [class=ab] { color: blue; }</style>");
    });
    it('rewrites multi-selector rule', function() {
      var lookups = { 'class=email': 'ab' };
      var html = '<style>label.email, a.email { color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>label.ab, a.ab { color: blue; }</style>');
    });
    it('rewrites css media queries', function() {
      var lookups = { 'id=abe': 'wz' };

      var html = '<style>@media screen and (max-width: 300px) { #abe{ color: red; } }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>@media screen and (max-width: 300px) { #wz{ color: red; } }</style>');
    });
    it('rewrites nested css media queries', function() {
      var lookups = { 'id=abe': 'wz' };

      var html = '<style>@media { @media screen and (max-width: 300px) { #abe{ color: red; } } }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($, lookups).html();
      assert.equal(results, '<style>@media { @media screen and (max-width: 300px) { #wz{ color: red; } } }</style>');
    });
    it('handles malformed syntax', function() {
      var html = '<style>@media{.media{background: red}</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteStyles($).html();
      assert.equal(results, '<style>@media{.media{background: red}}</style>');
    });
  });

  describe('#rewriteElements', function() {
    it('rewrites an id', function() {
      var html = '<h1 id="abe">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 id="xz">Header</h1>');
    });
    it('rewrites a class', function() {
      var html = '<h1 class="abe">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="xz">Header</h1>');
    });
    it('rewrites a multiple classes', function() {
      var html = '<h1 class="foo bar">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="xz wk">Header</h1>');
    });
    it('rewrites a multiple classes with more than one space between them', function() {
      var html = '<h1 class="foo   bar">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="xz wk">Header</h1>');
    });
    it('rewrites a for', function() {
      var html = '<label for="abe">Label</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<label for="xz">Label</label>');
    });
    it('rewrites multiple nested ids, classes, and fors', function() {
      var html = '<h1 id="header">Header <strong id="strong"><span id="span">1</span></strong></h1><label for="something">Something</label><label for="null">null</label><div class="some classes">Some Classes</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 id="xz">Header <strong id="wk"><span id="en">1</span></strong></h1><label for="km">Something</label><label for="dj">null</label><div class="yw qr">Some Classes</div>');
    });
    it('rewrites ids and labels to match when matching', function() {
      var html = '<h1 id="header">Header</h1><label for="header">Something</label><label for="header">Other</label>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 id="xz">Header</h1><label for="xz">Something</label><label for="xz">Other</label>');
    });
    it('rewrites multiple uses of the same class to the correct value', function() {
      var html = '<h1 class="header">Header</h1><label class="header">Something</label><div class="header">Other</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="xz">Header</h1><label class="xz">Something</label><div class="xz">Other</div>');
    });
    it('rewrites multiple uses of the same class to the correct value', function() {
      var html = '<h1 class="header">Header</h1><label class="header">Something</label><div class="other">Other</div><div class="again">Again</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="xz">Header</h1><label class="xz">Something</label><div class="wk">Other</div><div class="en">Again</div>');
    });
    it('rewrites other class combinations', function() {
      var html = '<h1 class="header other">Header</h1><label class="header">Something</label><div class="other">Other</div><div class="again">Again</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="xz wk">Header</h1><label class="xz">Something</label><div class="wk">Other</div><div class="en">Again</div>');
    });
  });

  describe('#process', function() {
    it('uglifies style and html', function() {
      var html = htmlUglify.process("<style>.demo_class#andID{color: red}</style><div class='demo_class' id='andID'>Welcome to HTML Uglify</div>");
      assert.equal(html, '<style>.wk#xz{color: red}</style><div class="wk" id="xz">Welcome to HTML Uglify</div>');
    });
    it('uglifies differently with a different salt', function() {
      var htmlUglify = new HTMLUglify({salt: 'other'});
      var html = htmlUglify.process("<style>.demo_class#andID{color: red}</style><div class='demo_class' id='andID'>Welcome to HTML Uglify</div>");
      assert.equal(html, '<style>.nx#vy{color: red}</style><div class="nx" id="vy">Welcome to HTML Uglify</div>');
    });
    it('uglifies media query with no name', function() {
      var html = htmlUglify.process("<style>@media {.media{ color: red; }}</style><div class='media'>media</div>");
      assert.equal(html, '<style>@media {.xz{ color: red; }}</style><div class="xz">media</div>');
    });
    it('uglifies media queries inside of media queries', function() {
      var html = htmlUglify.process("<style>@media screen{@media screen{.media-nested{background:red;}}}</style><div class='media-nested'>media-nested</div>");
      assert.equal(html, '<style>@media screen{@media screen{.xz{background:red;}}}</style><div class="xz">media-nested</div>');
    });
    it('uglifies media queries inside of media queries inside of media queries', function() {
      var html = htmlUglify.process("<style>@media screen{@media screen{@media screen{.media-double-nested{background:red;}}}}</style><div class='media-double-nested'>media-double-nested</div>");
      assert.equal(html, '<style>@media screen{@media screen{@media screen{.xz{background:red;}}}}</style><div class="xz">media-double-nested</div>');
    });
    it('uglifies with whitelisting for ids and classes', function() {
      var whitelist = ['#noform', '.withform'];
      var htmlUglify = new HTMLUglify({salt: 'use the force harry', whitelist: whitelist});
      var html = htmlUglify.process("<style>#noform { color: red; } .withform{ color: red } #other{ color: red; }</style><div id='noform' class='noform'>noform</div><div class='withform'>withform</div><div id='other'>other</div>");
      assert.equal(html, '<style>#noform { color: red; } .withform{ color: red } #xz{ color: red; }</style><div id="noform" class="wk">noform</div><div class="withform">withform</div><div id="xz">other</div>');
    });
    it('uglifies a class with a ::before', function() {
      var html = htmlUglify.process("<style>.before::before{color: red}</style><div class='before'>before</div>");
      assert.equal(html, '<style>.xz::before{color: red}</style><div class="xz">before</div>');
    });

  });
});
