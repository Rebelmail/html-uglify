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
  var _this;
  var value;
  var pointer;
  var $element;
  var splitClasses;

  _this = this;
  $element = payload.$(payload.element);
  value = $element.attr('class');

  if (value) {
    splitClasses = value.split(/\s+/);
    splitClasses.forEach(function(value) {
      pointer = _this.determinePointer('class', value, payload.lookups);

      $element.removeClass(value);
      $element.addClass(pointer);

      _this.populateLookups(payload, 'class', value, pointer);
    });
  }
};

HtmlUglify.prototype.pointerizeIdAndFor = function(type, payload) {
  var _this;
  var value;
  var pointer;
  var $element;

  _this = this;
  $element = payload.$(payload.element);
  value = $element.attr(type);
  if (value) {
    pointer = _this.determinePointer('id', value, payload.lookups);

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
    };

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
    if (rule.type === 'atrule' && rule.name === 'media') {
      return _this.processRules(rule.nodes, lookups);
    }

    // handle standard css rule
    if (rule.type === 'rule') {
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
    ast = postcss.parse(contents, { safe: true });

    _this.processRules(ast.nodes, lookups);

    $(element).contents()[0].data = ast.toString();
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
};

module.exports = HtmlUglify;
