'use strict';

var postcss = require('postcss');
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

HTMLUglify.prototype.setNewSelector = function(lead, rule, toReplace, pointer) {
  toReplace = [lead, toReplace].join('');
  pointer = [lead, pointer].join('');
  var newSelector = rule.selector.replace(toReplace, pointer);
  rule.selector = newSelector;
};

HTMLUglify.prototype.processRules = function(rules, lookups) {
  var _this = this;

  rules.forEach(function(rule) {
    // go deeper inside media rule to find css rules
    if (rule.type === 'atrule' && rule.name === 'media') {
      _this.processRules(rule.nodes, lookups);
    } else if (rule.type === 'rule') {
      var selectorParts = rule.selector.split(/ |\:not\(|\)|\>|\~|\+|\:\:|\:checked|\:after|\:before|\:root|\:|\[|\]|(?=\s*\.)|(?=\s*\#)|\,/);
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
          var regex = new RegExp('(?!^)' + toReplace); // negative look ahead to avoid start of the string
          var newSelectorPart = selectorPart.replace(regex, pointer);
          var newSelector = rule.selector.replace(selectorPart, newSelectorPart);
          rule.selector = newSelector;
        }
      });
    }
  });
};

HTMLUglify.prototype.rewriteStyles = function($, lookups) {
  var _this = this;

  lookups = lookups || {};

  $('style').each(function(index, element) {
    var $style = $(this);
    var ast = postcss.parse($style.text(), { safe: true });
    _this.processRules(ast.nodes, lookups);
    $style.text(ast.toString());
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
