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

  var salt = config.salt || 'use the force harry';
  this.hashids = new Hashids(salt, 0, ALPHABET);
}

HTMLUglify.prototype.determinePointer = function(type, value, lookups) {
  var lookupKey = [type, value].join(LOOKUP_DELIMITER);
  var existingPointer = lookups[lookupKey];

  var pointer;
  if (existingPointer) {
    pointer = existingPointer;
  } else {
    var counter = Object.keys(lookups).length;
    pointer = this.hashids.encode(counter);
  }

  return pointer;
};

HTMLUglify.prototype.pointerizeClass = function($element, lookups) {
  var value = $element.attr('class');

  if (value) {
    var splitClasses = value.split(/\s+/);
    splitClasses.forEach(function(value) {
      var lookupKey = ['class', value].join(LOOKUP_DELIMITER);
      var pointer = lookups[lookupKey];
      if (pointer) {
        $element.removeClass(value);
        $element.addClass(pointer);
      }
    });
  }
};

HTMLUglify.prototype.pointerizeIdAndFor = function(type, $element, lookups) {
  var value = $element.attr(type);
  if (value) {
    var lookupKey = ['id', value].join(LOOKUP_DELIMITER);
    var pointer = lookups[lookupKey];
    if (pointer) {
      $element.attr(type, pointer);
    }
  }
};

HTMLUglify.prototype.populateLookups = function(type, value, pointer, lookups) {
  var key = [type, value].join(LOOKUP_DELIMITER);
  lookups[key] = pointer;
};

HTMLUglify.prototype.processRules = function($, rules, lookups) {
  var self = this;

  rules.forEach(function(rule) {
    // go deeper inside media rule to find css rules
    if (rule.type === 'atrule' && rule.name === 'media') {
      self.processRules($, rule.nodes, lookups);
    } else if (rule.type === 'rule') {
      var subselectors = cssWhat(rule.selector).map(function(select) {
        return select.map(function(token) {
          var value = token.value;
          var type;

          if (token.type === 'attribute') {
            var $element = $(select);
            if ($element.length > 0) {
              if (token.name === 'class') {
                // Handle .something and class=something
                type = 'class';
                $element.each(function() {
                  self.pointerizeClass($(this), lookups);
                });
              } else if (token.name === 'id') {
                // Handle #something and id=something and for=something
                type = 'id';
                $element.each(function() {
                  self.pointerizeIdAndFor('id', $(this), lookups);
                });
              } else if (token.name === 'for') {
                type = 'id';
                $element.each(function() {
                  self.pointerizeIdAndFor('for', $(select), lookups);
                });
              }

              var pointer = self.determinePointer(type, value, lookups);
              self.populateLookups(type, value, pointer, lookups);
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
  var self = this;

  lookups = lookups || {};

  $('style').each(function() {
    var $style = $(this);
    var ast = postcss.parse($style.text(), { safe: true });
    self.processRules($, ast.nodes, lookups);
    $style.text(ast.toString());
  });

  return $;
};

HTMLUglify.prototype.process = function(html) {
  var lookups = {};

  var $ = cheerio.load(html);
  $ = this.rewriteStyles($, lookups);

  return $.html();
};

module.exports = HTMLUglify;
