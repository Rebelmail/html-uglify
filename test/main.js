'use strict';

var assert = require('chai').assert;
var cheerio = require('cheerio');
var HtmlUglify = require('../lib/main.js');

var htmlUglify = new HtmlUglify();

describe('HtmlUglify', function() {
  describe('#rewriteCss', function() {
    it('rewrites an id given lookups', function() {
      var lookups = { 'id=abe': 'Yj' };
      var html = '<style>#abe{ color: red; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>#Yj{ color: red; }</style>');
    });
    it('does not rewrite an id given no lookups', function() {
      var lookups = { };
      var html = '<style>#abe{ color: red; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>#abe{ color: red; }</style>');
    });
    it('rewrites a for= given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[for=email]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, "<style>label[for='ab']{ color: blue; }</style>");
    });
    it('does not rewrite a for= given no lookups', function() {
      var lookups = {};
      var html = '<style>label[for=email]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, "<style>label[for='email']{ color: blue; }</style>");
    });
    it('rewrites a for= with quotes given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[for="email"]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, "<style>label[for='ab']{ color: blue; }</style>");
    });
    it('rewrites an id= given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[id=email]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>label#ab{ color: blue; }</style>');
    });
    it('rewrites an id= with quotes given lookups', function() {
      var lookups = { 'id=email': 'ab' };
      var html = '<style>label[id="email"]{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>label#ab{ color: blue; }</style>');
    });
    it('rewrites a class given lookups', function() {
      var lookups = { 'class=email': 'ab' };
      var html = '<style>label.email{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>label.ab{ color: blue; }</style>');
    });
    it('rewrites a class with the same name as the element', function() {
      var lookups = { 'class=label': 'ab' };
      var html = '<style>label.label{ color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>label.ab{ color: blue; }</style>');
    });
    it('rewrites a class= given lookups', function() {
      var lookups = { 'class=email': 'ab' };
      var html = '<style>form [class=email] { color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, "<style>form [class='ab'] { color: blue; }</style>");
    });
    it('rewrites multi-selector rule', function() {
      var lookups = { 'class=email': 'ab' };
      var html = '<style>label.email, a.email { color: blue; }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>label.ab, a.ab { color: blue; }</style>');
    });
    it('rewrites css media queries', function() {
      var lookups = { 'id=abe': 'wz' };

      var html = '<style>@media screen and (max-width: 300px) { #abe{ color: red; } }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>@media screen and (max-width: 300px) { #wz{ color: red; } }</style>');
    });
    it('rewrites nested css media queries', function() {
      var lookups = { 'id=abe': 'wz' };

      var html = '<style>@media { @media screen and (max-width: 300px) { #abe{ color: red; } } }</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($, lookups).html();
      assert.equal(results, '<style>@media { @media screen and (max-width: 300px) { #wz{ color: red; } } }</style>');
    });
    it('handles malformed syntax', function() {
      var html = '<style>@media{.media{background: red}</style>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteCss($).html();
      assert.equal(results, '<style>@media{.media{background: red}}</style>');
    });
  });

  describe('#rewriteElements', function() {
    it('rewrites an id', function() {
      var html = '<h1 id="abe">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 id="Yj">Header</h1>');
    });
    it('rewrites a class', function() {
      var html = '<h1 class="abe">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="Yj">Header</h1>');
    });
    it('rewrites a multiple classes', function() {
      var html = '<h1 class="foo bar">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="Yj KE">Header</h1>');
    });
    it('rewrites a multiple classes with more than one space between them', function() {
      var html = '<h1 class="foo   bar">Header</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="Yj KE">Header</h1>');
    });
    it('rewrites a for', function() {
      var html = '<label for="abe">Label</h1>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<label for="Yj">Label</label>');
    });
    it('rewrites multiple nested ids, classes, and fors', function() {
      var html = '<h1 id="header">Header <strong id="strong"><span id="span">1</span></strong></h1><label for="something">Something</label><label for="null">null</label><div class="some classes">Some Classes</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 id="Yj">Header <strong id="KE"><span id="jX">1</span></strong></h1><label for="bz">Something</label><label for="rN">null</label><div class="pM No">Some Classes</div>');
    });
    it('rewrites ids and labels to match when matching', function() {
      var html = '<h1 id="header">Header</h1><label for="header">Something</label><label for="header">Other</label>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 id="Yj">Header</h1><label for="Yj">Something</label><label for="Yj">Other</label>');
    });
    it('rewrites multiple uses of the same class to the correct value', function() {
      var html = '<h1 class="header">Header</h1><label class="header">Something</label><div class="header">Other</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="Yj">Header</h1><label class="Yj">Something</label><div class="Yj">Other</div>');
    });
    it('rewrites multiple uses of the same class to the correct value', function() {
      var html = '<h1 class="header">Header</h1><label class="header">Something</label><div class="other">Other</div><div class="again">Again</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="Yj">Header</h1><label class="Yj">Something</label><div class="KE">Other</div><div class="jX">Again</div>');
    });
    it('rewrites other class combinations', function() {
      var html = '<h1 class="header other">Header</h1><label class="header">Something</label><div class="other">Other</div><div class="again">Again</div>';
      var $ = cheerio.load(html);
      var results = htmlUglify.rewriteElements($).html();
      assert.equal(results, '<h1 class="Yj KE">Header</h1><label class="Yj">Something</label><div class="KE">Other</div><div class="jX">Again</div>');
    });
  });

  describe('#process', function() {
    it('uglifies style and html', function() {
      var html = htmlUglify.process("<style>.demo_class#andID{color: red}</style><div class='demo_class' id='andID'>Welcome to HTML Uglify</div>");
      assert.equal(html, '<style>.KE#Yj{color: red}</style><div class="KE" id="Yj">Welcome to HTML Uglify</div>');
    });
    it('uglifies differently with a different salt', function() {
      var htmlUglify = new HtmlUglify({salt: 'other'});
      var html = htmlUglify.process("<style>.demo_class#andID{color: red}</style><div class='demo_class' id='andID'>Welcome to HTML Uglify</div>");
      assert.equal(html, '<style>.ej#QK{color: red}</style><div class="ej" id="QK">Welcome to HTML Uglify</div>');
    });
    it('uglifies media query with no name', function() {
      var htmlUglify = new HtmlUglify();
      var html = htmlUglify.process("<style>@media {.media{ color: red; }}</style><div class='media'>media</div>");
      assert.equal(html, '<style>@media {.Yj{ color: red; }}</style><div class="Yj">media</div>');
    });
    it('uglifies media queries inside of media queries', function() {
      var htmlUglify = new HtmlUglify();
      var html = htmlUglify.process("<style>@media screen{@media screen{.media-nested{background:red;}}}</style><div class='media-nested'>media-nested</div>");
      assert.equal(html, '<style>@media screen{@media screen{.Yj{background:red;}}}</style><div class="Yj">media-nested</div>');
    });
    it('uglifies media queries inside of media queries inside of media queries', function() {
      var htmlUglify = new HtmlUglify();
      var html = htmlUglify.process("<style>@media screen{@media screen{@media screen{.media-double-nested{background:red;}}}}</style><div class='media-double-nested'>media-double-nested</div>");
      assert.equal(html, '<style>@media screen{@media screen{@media screen{.Yj{background:red;}}}}</style><div class="Yj">media-double-nested</div>');
    });
  });
});
