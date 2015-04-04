var _ = require('lodash');
var css = require('css');
var cheerio = require('cheerio');
var Hashids = require('hashids');
var hashids = new Hashids('use the force harry', 0, "abcdefghijklmnopqrstuvwxyz");

var VERSION = require('../package.json').version;
var LOOKUP_DELIMITER = '=';

var HtmlUglify = function() {
  this.version = VERSION;

  return this;
};

HtmlUglify.prototype.pointerizeClass = function(payload) {
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

HtmlUglify.prototype.pointerizeIdAndFor = function(type, payload) {
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

HtmlUglify.prototype.populateLookups = function(payload, type, value, pointer) {
  var key = [type, value].join(LOOKUP_DELIMITER);
  payload.lookups[key] = pointer;
};

HtmlUglify.prototype.pointerize = function(type, payload) {
  if (['id', 'for', 'class'].indexOf(type) < 0) {
    throw "Only 'id' and 'for' allowed";
  }

  if (type === 'class') {
    this.pointerizeClass(payload);
  } else {
    this.pointerizeIdAndFor(type, payload);
  }
};

HtmlUglify.prototype.rewriteElements = function($, lookups) {
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

HtmlUglify.prototype.processRules = function(rules, lookups) {
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
            var newSelector;

            selector = rule.selectors[selectorIndex];
            newSelector = selector.replace(toReplace, pointer);
            rule.selectors[selectorIndex] = newSelector;
          }
        });
      });
    }
  });
};

HtmlUglify.prototype.rewriteCss = function($, lookups) {
  if (typeof lookups === 'undefined') {
    lookups = {};
  }

  var ast;
  var _this;
  var results;
  var contents;
  var stylesheet;

  _this = this;
  results = $('style');

  results.each(function(index, element){
    contents = $(element).contents().toString();
    ast = css.parse(contents);
    stylesheet = ast.stylesheet;

    _this.processRules(stylesheet.rules, lookups);

    $(element).contents()[0].data = css.stringify(ast, {compress: true});
  });

  return $;
};

HtmlUglify.prototype.process = function(html) {
  var $;
  var that;
  var lookups;

  lookups = {};
	that = this;
	$ = cheerio.load(html);

  $ = this.rewriteElements($, lookups);
  $ = this.rewriteCss($, lookups);

  return $.html();
} 

module.exports = new HtmlUglify();
