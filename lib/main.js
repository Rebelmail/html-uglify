'use strict';

var Hashids = require('hashids');
var posthtml = require('posthtml');
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

HTMLUglify.prototype.checkForStandardPointer = function(type, value, lookups) {
  return lookups[type] && lookups[type][value];
};

HTMLUglify.prototype.checkForAttributePointer = function(type, value, lookups) {
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
  return this.checkForStandardPointer(type, value, lookups) ||
    this.checkForAttributePointer(type, value, lookups) ||
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
  switch (type) {
    case 'class':
      value = '.' + value;
      break;
    case 'id':
      value = '#' + value;
      break;
    default:
      break;
  }

  return this.whitelist.indexOf(value) >= 0;
};

HTMLUglify.prototype.pointerizeClass = function(node, lookups) {
  var self = this;
  var classes = node.attrs.class;

  if (classes) {
    node.attrs.class = classes.split(/\s+/).map(function(value) {
      var pointer = self.createLookup('class', value, lookups);
      if (pointer) {
        return pointer;
      }

      return value;
    }).join(' ');
  }
};

HTMLUglify.prototype.pointerizeIdAndFor = function(type, node, lookups) {
  var pointer = this.createLookup('id', node.attrs[type], lookups);
  if (pointer) {
    node.attrs[type] = pointer;
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

          if ((selector.type === 'class')
              || (selector.type === 'attribute' && selector.attribute === 'class')) {
            pointer = self.createLookup('class', selector.value, lookups);
          } else if ((selector.type === 'id')
              || (selector.type === 'attribute' && selector.attribute === 'id')
              || (selector.type === 'attribute' && selector.attribute === 'for')) {
            pointer = self.createLookup('id', selector.value, lookups);
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

HTMLUglify.prototype.rewriteElements = function(tree, lookups) {
  var self = this;

  lookups = lookups || {};

  return tree.walk(function(node) {
    if (node.attrs) {
      if (node.attrs.class) {
        self.pointerizeClass(node, lookups);
      }

      if (node.attrs.id) {
        self.pointerizeIdAndFor('id', node, lookups);
      }

      if (node.attrs.for) {
        self.pointerizeIdAndFor('for', node, lookups);
      }
    }
    return node;
  });
};

HTMLUglify.prototype.rewriteStyles = function(tree, lookups) {
  var self = this;

  lookups = lookups || {};

  return tree.walk(function(node) {
    if (node.tag === 'style' && node.content) {
      var ast = postcssSafeParser([].concat(node.content).join(''));
      self.processRules(ast.nodes, lookups);
      node.content = ast.toString();
    }
    return node;
  });
};

HTMLUglify.prototype.process = function(tree) {
  var lookups = {};

  tree = this.rewriteStyles(tree, lookups);
  tree = this.rewriteElements(tree, lookups);

  return tree;
};

module.exports = function(options) {
	return function(tree) {
    return new HTMLUglify(options).process(tree);
  }
};

module.exports.HTMLUglify = HTMLUglify;

module.exports.process = function(html, options) {
	return posthtml().use(module.exports(options)).process(html, { sync: true });
};
