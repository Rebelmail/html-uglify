var cheerio = require('cheerio');
var Hashids = require('hashids');
var hashids = new Hashids('use the force harry', 0, "abcdefghijklmnopqrstuvwxyz");
var css = require('css');

var Uglifier = function(){
  this.access = {};
  this.access.used = {
    ids: [],
    classes: []
  };
  this.access.forCSS = {};
  this.access.idmapper = 0;
  this.access.classmapper = 0;

  return this
};

Uglifier.prototype.uglify = function(input, cb){
	function escapeRegExp(str) {
	  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};

	var that = this;
	$ = cheerio.load(input);
  	
  $('*').each(function(i, elm){
    var id = $(elm).attr('id');
    var clas = $(elm).attr('class');
    var fore = $(elm).attr('for');
    if (id && that.access.used.ids.indexOf(id) === -1){
      var newID = RM.generateID.call(that, id);
    } else if (id){
      var newID = RM.generateID.call(that, id, that.access.used.ids.indexOf(id));
    };
    if (id && newID) $(elm).attr('id', newID);
    if (fore && that.access.used.ids.indexOf(fore) === -1){
      var newFore = RM.generateID.call(that, fore);
    } else if (fore){
      var newFore = RM.generateID.call(that, fore, that.access.used.ids.indexOf(fore));
    };
    if (fore && newFore) $(elm).attr('for', newFore);
    if (clas) {
      clas.split(' ').forEach(function(claz){
        if (claz && that.access.used.classes.indexOf(claz) === -1){
          var newClass = RM.generateClass.call(that, claz);	
        } else {
          var newClass = RM.generateClass.call(that, claz, that.access.used.classes.indexOf(claz));
        };
      $(elm).removeClass(claz);
      $(elm).addClass(newClass);
    });
  };
  });

  $('style').each(function(i, elm){
    var contents = $(elm).contents().toString();
    var obj = contents && new css.parse(contents);

    var loopRules = function(obbi){
      obbi.forEach(function(rule, i){
        if (rule.type == "rule"){
          rule && rule.selectors && rule.selectors.length > 0 && rule.selectors.forEach(function(selector,z){
            selector.split(/ |\:not\(|\)|\>|\~|\+|\:\:|\:checked|\:after|\:before|\:root|\:|\[|\]|(?=\s*\.)|(?=\s*\#)/).forEach(function(c){
              if (c.indexOf('for=') > -1){
                var newc = {backto: 'for=', replaced: c.replace(/for=/g,'\#'), a: '\#'};
              } else if (c.indexOf('class=') > -1){
                var newc = {backto: 'class=', replaced: c.replace(/class=/g, '\.'), a: '\.'};
              } else if (c.indexOf('id=') > -1){
                var newc = {backto: 'id=', replaced: c.replace(/id=/g, "\#"), a: '\#'};
              } else {
                var newc = {replaced: c}
              };

              if (c && that.access.forCSS[newc.replaced]){
                var reg = new RegExp(escapeRegExp(c)+"(?!-|_|\w)",'g');
                  if (c.indexOf('=') > -1){
                    selector = selector.replace(reg, that.access.forCSS[newc.replaced].replace(newc.a,newc.backto));
                  } else {
                    selector = selector.replace(reg, that.access.forCSS[newc.replaced]);
                  }
                }
              });
              obbi[i].selectors[z] = selector;
            });
          } else if (rule.type == "media"){
            loopRules(rule.rules);
          };
        });
      };
    loopRules(obj.stylesheet.rules);
    $(elm).contents()[0].data = css.stringify(obj)
  });

  cb(null, {html: $.html(), map: that.access.forCSS});
} 

RM = {
  generateID: function(old, num){
    var newnum = (typeof num === "number") ? num : this.access.idmapper;
    var newer = hashids.encode(newnum);
    if (typeof num != "number"){
      ++this.access.idmapper;
      this.access.used.ids.push(old);
      this.access.forCSS["#" + old]= "#"+newer;
    };
    return newer;
  },
  generateClass: function(old, num){
    var newnum = (typeof num === "number") ? num : this.access.classmapper;
    var newer = hashids.encode(newnum);
    if (typeof num != "number"){
      ++this.access.classmapper;
      this.access.used.classes.push(old);
      this.access.forCSS["."+old]= "."+newer;
    };
    return newer;
  }
};

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

module.exports = new Uglifier();
