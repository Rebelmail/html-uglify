'use strict';

var cheerio = require('cheerio');
var Hashids = require('hashids');
var postcssSafeParser = require('postcss-safe-parser');
var postcssSelectorParser = require('postcss-selector-parser');

var ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
var VERSION = require('../package.json').version;

function HTMLUglify(config) {
  this.version = VERSION;

  config = config || {};

  var salt = config.salt || 'use the force harry';
  this.hashids = new Hashids(salt, 0, ALPHABET);
  this.whitelist = config.whitelist || [];
}

HTMLUglify.prototype.checkForStandardPointer = function(lookups, type, value) {
  return lookups[type] && lookups[type][value];
};

HTMLUglify.prototype.checkForAttributePointer = function(lookups, type, value) {
  var typeLookups = lookups[type] || {};
  var keys = Object.keys(typeLookups);
  var pointer;

  keys.some(function(key) {
    if (value.indexOf(key) !== -1) {
      pointer = value.replace(key, typeLookups[key]);
      return true;
    }
    return false;
  });

  return pointer;
};

HTMLUglify.prototype.generatePointer = function(lookups) {
  var idCount = Object.keys(lookups['id'] || {}).length;
  var classCount = Object.keys(lookups['class'] || {}).length;
  var counter = idCount + classCount;

  return this.hashids.encode(counter);
};

HTMLUglify.prototype.pointer = function(type, value, lookups) {
  return this.checkForStandardPointer(lookups, type, value) ||
    this.checkForAttributePointer(lookups, type, value) ||
    this.generatePointer(lookups);
};

HTMLUglify.prototype.insertLookup = function(type, value, pointer, lookups) {
  if (!lookups[type]) {
    lookups[type] = {};
  }
  lookups[type][value] = pointer;
};

HTMLUglify.prototype.createLookup = function(type, value, lookups) {
  var pointer;
  if (value && !this.isWhitelisted(type, value)) {
    pointer = this.pointer(type, value, lookups);
    this.insertLookup(type, value, pointer, lookups);
  }
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

  if (value) {
    var splitClasses = value.split(/\s+/);

    splitClasses.forEach(function(value) {
      var pointer = self.createLookup('class', value, lookups);
      if (pointer) {
        $element.removeClass(value);
        $element.addClass(pointer);
      }
    });
  }
};

HTMLUglify.prototype.pointerizeIdAndFor = function(type, $element, lookups) {
  var value = $element.attr(type);

  var pointer = this.createLookup('id', value, lookups);
  if (pointer) {
    $element.attr(type, pointer);
  }
};

HTMLUglify.prototype.processRules = function(rules, lookups) {
  var self = this;

  rules.forEach(function(rule) {
    // go deeper inside media rule to find css rules
    if (rule.type === 'atrule' && (rule.name === 'media' || rule.name === 'supports')) {
      self.processRules(rule.nodes, lookups);
    } else if (rule.type === 'rule') {
      postcssSelectorParser(function(selectors) {
        selectors.eachInside(function(selector) {
          var pointer;

          if ((selector.type === 'id')
              || (selector.type === 'attribute' && selector.attribute === 'id')
              || (selector.type === 'attribute' && selector.attribute === 'for')) {
            pointer = self.createLookup('id', selector.value, lookups);
          } else if ((selector.type === 'class')
              || (selector.type === 'attribute' && selector.attribute === 'class')) {
            pointer = self.createLookup('class', selector.value, lookups);
          }

          if (pointer) {
            selector.value = pointer;
          }
        });

        rule.selector = String(selectors);
      }).process(rule.selector);
    }
  });
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
