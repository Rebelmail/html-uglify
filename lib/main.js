'use strict';

require('string.prototype.startswith');

var cheerio = require('cheerio');
var Hashids = require('hashids');
var postcssSafeParser = require('postcss-safe-parser');

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

HTMLUglify.prototype.checkForCompoundPointer = function(lookups, lookupKey) {
  var pointer;
  var keys = Object.keys(lookups);

  keys.forEach(function(key) {
    if (lookupKey.startsWith(key)) {
      var remainder = lookupKey.replace(key, '');
      pointer = lookups[key] + remainder;
    }
  });

  return pointer;
};

HTMLUglify.prototype.determinePointer = function(type, value, lookups) {
  var lookupKey = [type, value].join(LOOKUP_DELIMITER);

  // First check for existing pointer
  var existingPointer = lookups[lookupKey];
  if (existingPointer) {
    return existingPointer;
  }

  // Second check for compound pointer
  var compoundPointer = this.checkForCompoundPointer(lookups, lookupKey);
  if (compoundPointer) {
    return compoundPointer;
  }

  // Otherwise, third generate a new pointer
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
      break;
  }

  return this.whitelist.indexOf(value) >= 0;
};

HTMLUglify.prototype.pointerizeClass = function($element, lookups) {
  var self = this;
  var value = $element.attr('class');

  if (value && !this.isWhitelisted('class', value)) {
    var splitClasses = value.split(/\s+/);
    splitClasses.forEach(function(value) {
      var pointer = self.determinePointer('class', value, lookups);

      $element.removeClass(value);
      $element.addClass(pointer);

      self.populateLookups('class', value, pointer, lookups);
    });
  }
};

HTMLUglify.prototype.pointerizeIdAndFor = function(type, $element, lookups) {
  var value = $element.attr(type);

  if (value && !this.isWhitelisted('id', value)) {
    var pointer = this.determinePointer('id', value, lookups);

    $element.attr(type, pointer);
    this.populateLookups('id', value, pointer, lookups);
  }
};

HTMLUglify.prototype.populateLookups = function(type, value, pointer, lookups) {
  var key = [type, value].join(LOOKUP_DELIMITER);
  lookups[key] = pointer;
};

HTMLUglify.prototype.rewriteElements = function($, lookups) {
  var self = this;

  lookups = lookups || {};

  $('*[id]').each(function() {
    self.pointerizeIdAndFor('id', $(this), lookups);
  });

  $('*[for]').each(function() {
    self.pointerizeIdAndFor('for', $(this), lookups);
  });

  $('*[class]').each(function() {
    self.pointerizeClass($(this), lookups);
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
  var self = this;

  rules.forEach(function(rule) {
    // go deeper inside media rule to find css rules
    if (rule.type === 'atrule' && rule.name === 'media') {
      self.processRules(rule.nodes, lookups);
    } else if (rule.type === 'rule') {
      var selectorParts = rule.selector.split(/ |\:not\(|\)|\>|\~|\+|\:\:|\:checked|\:after|\:before|\:root|\:|\[|\]|(?=\s*\.)|(?=\s*\#)|\,/);
      selectorParts.forEach(function(selectorPart) {
        var pointer;
        var value;

        // handle #something
        if (selectorPart.indexOf('#') > -1) {
          value = selectorPart.replace(/\#/g, '');

          if (value && !self.isWhitelisted('id', value)) {
            pointer = self.determinePointer('id', value, lookups);
            self.populateLookups('id', value, pointer, lookups);
          }
        }

        // handle .something
        if (selectorPart.indexOf('.') > -1) {
          value = selectorPart.replace(/\./g, '');

          if (value && !self.isWhitelisted('class', value)) {
            pointer = self.determinePointer('class', value, lookups);
            self.populateLookups('class', value, pointer, lookups);
          }
        }

        // handle *[id=something] or *[id*=something]
        if (selectorPart.indexOf('id=') > -1 || selectorPart.indexOf('id*=') > -1){
          value = selectorPart.replace(/id\*?=|\"|\'/g, '');
          if (value && !self.isWhitelisted('id', value)) {
            pointer = self.determinePointer('id', value, lookups);
            self.populateLookups('id', value, pointer, lookups);
          }
        }

        // handle *[class=something] or *[class*=something]
        if (selectorPart.indexOf('class=') > -1 || selectorPart.indexOf('class*=') > -1) {
          value = selectorPart.replace(/class\*?=|\"|\'/g, '');

          if (value && !self.isWhitelisted('class', value)) {
            pointer = self.determinePointer('class', value, lookups);
            self.populateLookups('class', value, pointer, lookups);
          }
        }

        // handle *[for=something] or *[for*=something]
        if (selectorPart.indexOf('for=') > -1 || selectorPart.indexOf('for*=') > -1){
          value = selectorPart.replace(/for\*?=|\"|\'/g, '');

          if (value && !self.isWhitelisted('id', value)) {
            pointer = self.determinePointer('id', value, lookups);
            self.populateLookups('id', value, pointer, lookups);
          }
        }

        if (pointer) {
          var regex = new RegExp('(?!^)' + value); // negative look ahead to avoid start of the string
          var newSelectorPart = selectorPart.replace(regex, pointer);
          var newSelector = rule.selector.replace(selectorPart, newSelectorPart);
          rule.selector = newSelector;
        }
      });
    }
  });
};

HTMLUglify.prototype.rewriteStyles = function($, lookups) {
  var self = this;

  lookups = lookups || {};

  $('style').each(function() {
    var $style = $(this);
    var ast = postcssSafeParser($style.text());
    self.processRules(ast.nodes, lookups);
    $style.text(ast.toString());
  });

  return $;
};


HTMLUglify.prototype.process = function(html) {
  var lookups = {};

  var $ = cheerio.load(html);
  $ = this.rewriteStyles($, lookups);
  $ = this.rewriteElements($, lookups);

  return $.html();
};

module.exports = HTMLUglify;
