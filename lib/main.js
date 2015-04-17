'use strict';

var css = require('css');
var cheerio = require('cheerio');
var Hashids = require('hashids');

var ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
var VERSION = require('../package.json').version;
var LOOKUP_DELIMITER = '=';

function HTMLUglify(config) {
  this.version = VERSION;

  config = config || {};

  var salt = config.salt || 'use the force harry';
  this.hashids = new Hashids(salt, 0, ALPHABET);
  this.whitelist = config.whitelist || [];
}

HTMLUglify.prototype.determinePointer = function(type, value, lookups) {
  var lookupKey = [type, value].join(LOOKUP_DELIMITER);
  var existingPointer = lookups[lookupKey];

  if (existingPointer) {
    return existingPointer;
  }

  var counter = Object.keys(lookups).length;
  var pointer = this.hashids.encode(counter);
  return pointer;
};

HTMLUglify.prototype.isWhitelisted = function(type, value) {
  switch(type) {
    case 'class':
      value = ['.', value].join('');
      break;
    case 'id':
      value = ['#', value].join('');
      break;
    default:
      value;
  }
  
  return this.whitelist.indexOf(value) >= 0;
};

HTMLUglify.prototype.pointerizeClass = function($element, lookups) {
  var _this = this;
  var value = $element.attr('class');

  if (value && !this.isWhitelisted('class', value)) {
    var splitClasses = value.split(/\s+/);
    splitClasses.forEach(function(value) {
      var pointer = _this.determinePointer('class', value, lookups);

      $element.removeClass(value);
      $element.addClass(pointer);

      _this.populateLookups('class', value, pointer, lookups);
    });
  }
};

HTMLUglify.prototype.pointerizeIdAndFor = function(type, $element, lookups) {
  var value = $element.attr(type);

  if (value && !this.isWhitelisted('id', value)) {
    var pointer = this.determinePointer('id', value, lookups);

    $element.attr(type, pointer);
    this.populateLookups('id', value, pointer, lookups); // always set to id for lookups
  }
};

HTMLUglify.prototype.populateLookups = function(type, value, pointer, lookups) {
  var key = [type, value].join(LOOKUP_DELIMITER);
  lookups[key] = pointer;
};

HTMLUglify.prototype.rewriteElements = function($, lookups) {
  var _this = this;

  lookups = lookups || {};

  $('*[id]').each(function() {
    _this.pointerizeIdAndFor('id', $(this), lookups);
  });

  $('*[for]').each(function() {
    _this.pointerizeIdAndFor('for', $(this), lookups);
  });

  $('*[class]').each(function() {
    _this.pointerizeClass($(this), lookups);
  });

  return $;
};

HTMLUglify.prototype.processRules = function(rules, lookups) {
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
            var toReplace = selectorPart.replace(/class=/g, '');
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

HTMLUglify.prototype.rewriteStyles = function($, lookups) {
  var _this = this;

  lookups = lookups || {};

  $('style').each(function(index, element) {
    var contents = $(element).contents().toString();
    var ast = css.parse(contents);
    var stylesheet = ast.stylesheet;

    _this.processRules(stylesheet.rules, lookups);

    $(element).contents()[0].data = css.stringify(ast, {compress: true})
  });

  return $;
};

HTMLUglify.prototype.process = function(html) {
  var lookups = {};

  var $ = cheerio.load(html);
  $ = this.rewriteElements($, lookups);
  $ = this.rewriteStyles($, lookups);

  return $.html();
};

module.exports = HTMLUglify;
