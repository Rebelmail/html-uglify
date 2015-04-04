# html-uglify

![html-uglify](../master/html-uglify.png?raw=true)

Uglify your HTML and CSS for purposes of compression and obfuscation. 
Great for HTML emails

[![BuildStatus](https://travis-ci.org/RebelMail/html-uglify.png?branch=master)](https://travis-ci.org/RebelMail/html-uglify)
[![NPM version](https://badge.fury.io/js/html-uglify.png)](http://badge.fury.io/js/html-uglify)

```javascript
var HtmlUglify = require('html-uglify');
var htmlUglify = new HtmlUglify({salt: 'your-custom-salt'});
var uglified = htmlUglify.process(htmlString);
```

## Installation

```
npm install html-uglify --save
```

## Usage

There is one command. It mirrors [autoprefixer-core](https://github.com/postcss/autoprefixer-core) API.

You pass an html string to `.process` and it returns the uglified html.

```javascript
var HtmlUglify = require('html-uglify');
var htmlUglify = new HtmlUglify({salt: 'your-custom-salt'});
var htmlString = "<html><head><style>.some-class { color: red; }</style></head><body><h1 class='some-class'>Hello</h1></body></html>";

var uglified = htmlUglify.process(htmlString);
```

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## Running tests

```
npm install
npm test
```

