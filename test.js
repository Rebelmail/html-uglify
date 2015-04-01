var uglifier = require('./lib/main.js');

uglifier.uglify("<style>.demo_class#andID{color:red}</style><div class='demo_class' id='andID'>Welcome to HTML Uglifier</div>", function(e,r){
	if (e) return console.log(e);
	console.log("MAP:", r.map);
	return console.log("HTML:", r.html);
});
