var _ = require('lodash');
var cheerio = require('cheerio');
var Hashids = require('hashids');
var hashids = new Hashids('use the force harry', 0, "abcdefghijklmnopqrstuvwxyz");
var css = require('css');

var LOOKUP_DELIMITER = '=';

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

Uglifier.prototype.pointerizeClass = function(payload) {
  var _this;
  var value;
  var counter;
  var pointer;
  var $element;
  var lookupKey;
  var splitClasses;
  var existingPointer;

  _this = this;
  $element = payload.$(payload.element);
  value = $element.attr('class');

  if (value) {
    splitClasses = value.split(' ');
    splitClasses.forEach(function(value) {
      lookupKey = ['class', value].join(LOOKUP_DELIMITER);
      existingPointer = payload.lookups[lookupKey];

      if (existingPointer) {
        pointer = existingPointer;
      } else {
        counter = _.keys(payload.lookups).length;
        pointer = hashids.encode(counter);
      }

      $element.removeClass(value);
      $element.addClass(pointer);

      _this.populateLookups(payload, 'class', value, pointer);
    });
  }
};

Uglifier.prototype.pointerizeIdAndFor = function(type, payload) {
  var value;
  var pointer;
  var counter;
  var $element;
  var lookupKey;
  var existingPointer;

  $element = payload.$(payload.element);
  value = $element.attr(type);
  if (value) {
    lookupKey = ['id', value].join(LOOKUP_DELIMITER);
    existingPointer = payload.lookups[lookupKey];

    if (existingPointer) {
      pointer = existingPointer;
    } else {
      counter = _.keys(payload.lookups).length;
      pointer = hashids.encode(counter);
    }

    $element.attr(type, pointer);
    this.populateLookups(payload, 'id', value, pointer); // always set to id for lookups
  }
};

Uglifier.prototype.populateLookups = function(payload, type, value, pointer) {
  var key = [type, value].join(LOOKUP_DELIMITER);
  payload.lookups[key] = pointer;
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

Uglifier.prototype.rewriteElements = function($, lookups) {
  if (typeof lookups === 'undefined') {
    lookups = {};
  }

  var _this = this;
  var results = $('*');

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

  return $;
};

Uglifier.prototype.processRules = function(rules, lookups) {
  var _this = this;

  rules.forEach(function(rule, index) {
    // go deeper inside media rule to find css rules
    if (rule.type === 'media') {
      return _this.processRules(rule.rules, lookups);
    }

    // handle standard css rule
    if (rule.type === 'rule') {
      rule && rule.selectors && rule.selectors.length > 0 && 
      rule.selectors.forEach(function(selector, selectorIndex){

        var selectorParts = selector.split(/ |\:not\(|\)|\>|\~|\+|\:\:|\:checked|\:after|\:before|\:root|\:|\[|\]|(?=\s*\.)|(?=\s*\#)/);
        selectorParts.forEach(function(selectorPart) {
          var keyLookup = '';

          // handle #something
          if (selectorPart.indexOf('#') > -1) {
            var toReplace = selectorPart.replace(/\#/g, '');
            keyLookup = ['id', toReplace].join(LOOKUP_DELIMITER);
          }

          // handle .something
          if (selectorPart.indexOf('.') > -1) {
            var toReplace = selectorPart.replace(/\./g, '');
            keyLookup = ['class', toReplace].join(LOOKUP_DELIMITER);
          }

          // handle *[id=something]
          if (selectorPart.indexOf('id=') > -1){
            var toReplace = selectorPart.replace(/id=/g, '');
            toReplace = toReplace.replace(/\"/g, ''); // remove quotes from "somevalue"
            keyLookup = ['id', toReplace].join(LOOKUP_DELIMITER);
          }

          // handle *[class=something]
          if (selectorPart.indexOf('class=') > -1) {
            var toReplace = selectorPart.replace(/\class=/g, '');
            keyLookup = ['class', toReplace].join(LOOKUP_DELIMITER);
          }

          // handle *[for=something]
          if (selectorPart.indexOf('for=') > -1){
            var toReplace = selectorPart.replace(/for=/g, '');
            toReplace = toReplace.replace(/\"/g, ''); // remove quotes from "somevalue"
            keyLookup = ['id', toReplace].join(LOOKUP_DELIMITER);
          }

          var pointer = lookups[keyLookup];
          if (pointer) {
            var newSelector = selector.replace(toReplace, pointer);
            // overwrite past selector
            rule.selectors[selectorIndex] = newSelector;
          }
        });
      });
    }
  });
};

Uglifier.prototype.rewriteCss = function($, lookups) {
  if (typeof lookups === 'undefined') {
    lookups = {};
  }

  var _this = this;
  var results = $('style');

  results.each(function(index, element){
    var contents = $(element).contents().toString();
    var ast = css.parse(contents);
    var stylesheet = ast.stylesheet;

    _this.processRules(stylesheet.rules, lookups);

    var options = { compress: true };
    $(element).contents()[0].data = css.stringify(ast, options);
  });

  return $;
};

Uglifier.prototype.uglify = function(input, cb){
	function escapeRegExp(str) {
	  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};

  var lookups = {};
	var that = this;
	$ = cheerio.load(input);

  $ = this.rewriteElements($, lookups);
  //$ = this.rewriteCss($, lookups);

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
