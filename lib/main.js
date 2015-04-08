'use strict';

var cheerio = require('cheerio');
var postcss = require('postcss');
var cssWhat = require('css-what');
var Hashids = require('hashids');

var stringify = require('./css-what/stringify');

var ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
var VERSION = require('../package.json').version;
var LOOKUP_DELIMITER = '=';

function HtmlUglify(config) {
  this.version = VERSION;

  config = config || {};

  var salt = config.salt || 'use the force harry';
  this.hashids = new Hashids(salt, 0, ALPHABET);
}

HtmlUglify.prototype.determinePointer = function(type, value, lookups) {
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

HtmlUglify.prototype.pointerizeClass = function(payload) {
  var self = this;
  var $element = payload.$(payload.element);
  var value = $element.attr('class');

  if (value) {
    var splitClasses = value.split(/\s+/);
    splitClasses.forEach(function(value) {
      var pointer = self.determinePointer('class', value, payload.lookups);

      $element.removeClass(value);
      $element.addClass(pointer);

      self.populateLookups(payload, 'class', value, pointer);
    });
  }
};

HtmlUglify.prototype.pointerizeIdAndFor = function(type, payload) {
  var self = this;
  var $element = payload.$(payload.element);

  var value = $element.attr(type);
  if (value) {
    var pointer = self.determinePointer('id', value, payload.lookups);

    $element.attr(type, pointer);
    this.populateLookups(payload, 'id', value, pointer); // always set to id for lookups
  }
};

HtmlUglify.prototype.populateLookups = function(payload, type, value, pointer) {
  var key = [type, value].join(LOOKUP_DELIMITER);
  payload.lookups[key] = pointer;
};

HtmlUglify.prototype.pointerize = function(type, payload) {
  if (type === 'class') {
    this.pointerizeClass(payload);
  } else if (type === 'id' || type === 'for') {
    this.pointerizeIdAndFor(type, payload);
  } else {
    throw new Error("Only 'class', 'id' and 'for' type allowed");
  }
};

HtmlUglify.prototype.rewriteElements = function($, lookups) {
  var self = this;

  lookups = lookups || {};

  $('*').each(function(index, element) {
    var pointerizePayload = {
      $: $,
      element: element,
      lookups: lookups
    };

    self.pointerize('id', pointerizePayload);
    self.pointerize('for', pointerizePayload);
    self.pointerize('class', pointerizePayload);
  });

  return $;
};

HtmlUglify.prototype.processRules = function(rules, lookups) {
  var self = this;

  rules.forEach(function(rule) {
    // go deeper inside media rule to find css rules
    if (rule.type === 'atrule' && rule.name === 'media') {
      self.processRules(rule.nodes, lookups);
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

HtmlUglify.prototype.rewriteCss = function($, lookups) {
  var self = this;

  lookups = lookups || {};

  $('style').each(function() {
    var $style = $(this);
    var ast = postcss.parse($style.text(), { safe: true });
    self.processRules(ast.nodes, lookups);
    $style.text(ast.toString());
  });

  return $;
};

HtmlUglify.prototype.process = function(html) {
  var lookups = {};

  var $ = cheerio.load(html);
  $ = this.rewriteElements($, lookups);
  $ = this.rewriteCss($, lookups);

  return $.html();
};

module.exports = HtmlUglify;
