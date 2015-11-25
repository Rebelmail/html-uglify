# html-uglify

[![Build Status](https://travis-ci.org/Rebelmail/html-uglify.svg?branch=master)](https://travis-ci.org/Rebelmail/html-uglify)
[![NPM version](https://badge.fury.io/js/html-uglify.png)](http://badge.fury.io/js/html-uglify)

![html-uglify](../master/html-uglify.png?raw=true)

Uglify your HTML and CSS for purposes of compression and obfuscation.

Great for HTML emails.

```javascript
var HTMLUglify = require('html-uglify');
var htmlUglify = new HTMLUglify({ salt: 'your-custom-salt', whitelist: ['#noform', '#withform', '.someclass'] });
var uglified = htmlUglify.process(htmlString);
```

## Installation

```sh
npm install html-uglify --save
```

## Usage

You pass an html string to `.process` and it returns the uglified html.

```javascript
var HTMLUglify = require('html-uglify');
var htmlUglify = new HTMLUglify({ salt: 'your-custom-salt', whitelist: [] });
var htmlString = "<html><head><style>.some-class { color: red; }</style></head><body><h1 class='some-class'>Hello</h1></body></html>";

var uglified = htmlUglify.process(htmlString);
```

## Contributing

1. Fork it
2. Create your feature branch
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## Running tests

```sh
npm install
npm test
```
