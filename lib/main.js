'use strict';

var cheerio = require('cheerio');
var postcss = require('postcss');
var cssWhat = require('css-what');
var Hashids = require('hashids');

var stringify = require('./css-what/stringify');

var ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
var VERSION = require('../package.json').version;
var LOOKUP_DELIMITER = '=';

function HTMLUglify(config) {
  this.version = VERSION;

  config = config || {};

  var salt = config.salt || Math.random() + '';
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

  rules.forEach(function(rule) {
    // go deeper inside media rule to find css rules
    if (rule.type === 'atrule' && rule.name === 'media') {
      _this.processRules(rule.nodes, lookups);
    } else if (rule.type === 'rule') {
      var subselectors = cssWhat(rule.selector).map(function(select) {
        return select.map(function(token) {
          var value = token.value;
          var keyLookup;

          if (token.type === 'attribute') {
            if (token.name === 'class') {
              // Handle .something and class=something
              keyLookup = ['class', value].join(LOOKUP_DELIMITER);
            } else if (token.name === 'id' || token.name === 'for') {
              // Handle #something and id=something and for=something
              keyLookup = ['id', value].join(LOOKUP_DELIMITER);
            }

            var pointer = lookups[keyLookup];
            if (pointer) {
              token.value = pointer;
            }
          }

          return token;
        });
      });

      rule.selector = stringify(subselectors);
    }
  });
};

HTMLUglify.prototype.rewriteStyles = function($, lookups) {
  var _this = this;

  lookups = lookups || {};

  $('style').each(function() {
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
