var _ = require('lodash');
var cheerio = require('cheerio');
var Hashids = require('hashids');
var hashids = new Hashids('use the force harry', 0, "abcdefghijklmnopqrstuvwxyz");
var css = require('css');

var Uglifier = function(){
  this.access = {};
  this.access.used = {
    ids: [],
    classes: []
  };
  this.access.forCSS = {};
  this.access.idmapper = 0;
  this.access.classmapper = 0;


  return this;
};

Uglifier.prototype.styles = function(html) {
  var $ = cheerio.load(html);
  var results = $('style');
  return results;
};

Uglifier.prototype.elements = function(html) {
  var $ = cheerio.load(html);
  var results = $('*');
  return results;
};

Uglifier.prototype.pointerizeClass = function(payload) {
  var _this = this;
  var $element = payload.$(payload.element);
  var value = $element.attr('class');
  if (value) {
    var splitClasses = value.split(' ');
    splitClasses.forEach(function(value) {
      var pointer = hashids.encode(payload.lookups.length);
      $element.removeClass(value);
      $element.addClass(pointer);

      _this.populateLookups(payload, 'class', value, pointer);
    });
  }
};

Uglifier.prototype.populateLookups = function(payload, type, value, pointer) {
 var lookup = {
    type: type,
    value: value,
    pointer: pointer
  }
  payload.lookups.push(lookup);
};

Uglifier.prototype.pointerizeIdAndFor = function(type, payload) {
  var $element = payload.$(payload.element);
  var value = $element.attr(type);
  if (value) {
    var pointer = hashids.encode(payload.lookups.length);
    $element.attr(type, pointer);

    this.populateLookups(payload, type, value, pointer);
  }
};

Uglifier.prototype.pointerize = function(type, payload) {
  if (['id', 'for', 'class'].indexOf(type) < 0) {
    throw "Only 'id' and 'for' allowed";
  }

  if (type === 'class') {
    this.pointerizeClass(payload);
  } else {
    this.pointerizeIdAndFor(type, payload);
  }
};

Uglifier.prototype.rewriteElements = function(html, lookups) {
  if (typeof lookups === 'undefined') {
    lookups = [];
  }

  var _this = this;
  var $ = cheerio.load(html);
  var results = $('*');

  var lookups = [];
  results.each(function(index, element){
    var pointerizePayload = {
      $: $,
      element: element,
      lookups: lookups
    }
    
    _this.pointerize('id', pointerizePayload);
    _this.pointerize('for', pointerizePayload);
    _this.pointerize('class', pointerizePayload);
  });

  return $.html();
};

Uglifier.prototype.uglify = function(input, cb){
	function escapeRegExp(str) {
	  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};

  var lookups = [];
  this.rewriteElements(input, lookups);

	var that = this;
	$ = cheerio.load(input);

  $('style').each(function(i, elm){
    var contents = $(elm).contents().toString();
    var obj = contents && new css.parse(contents);

    var loopRules = function(obbi){
      obbi.forEach(function(rule, i){
        if (rule.type == "rule"){
          rule && rule.selectors && rule.selectors.length > 0 && rule.selectors.forEach(function(selector,z){
            selector.split(/ |\:not\(|\)|\>|\~|\+|\:\:|\:checked|\:after|\:before|\:root|\:|\[|\]|(?=\s*\.)|(?=\s*\#)/).forEach(function(c){
              if (c.indexOf('for=') > -1){
                var newc = {backto: 'for=', replaced: c.replace(/for=/g,'\#'), a: '\#'};
              } else if (c.indexOf('class=') > -1){
                var newc = {backto: 'class=', replaced: c.replace(/class=/g, '\.'), a: '\.'};
              } else if (c.indexOf('id=') > -1){
                var newc = {backto: 'id=', replaced: c.replace(/id=/g, "\#"), a: '\#'};
              } else {
                var newc = {replaced: c}
              };

              if (c && that.access.forCSS[newc.replaced]){
                var reg = new RegExp(escapeRegExp(c)+"(?!-|_|\w)",'g');
                  if (c.indexOf('=') > -1){
                    selector = selector.replace(reg, that.access.forCSS[newc.replaced].replace(newc.a,newc.backto));
                  } else {
                    selector = selector.replace(reg, that.access.forCSS[newc.replaced]);
                  }
                }
              });
              obbi[i].selectors[z] = selector;
            });
          } else if (rule.type == "media"){
            loopRules(rule.rules);
          };
        });
      };
    loopRules(obj.stylesheet.rules);
    $(elm).contents()[0].data = css.stringify(obj)
  });

  cb(null, {html: $.html(), map: that.access.forCSS});
} 

module.exports = new Uglifier();
