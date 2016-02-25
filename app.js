var string = require('string'); // load string.js first to avoid https://github.com/jprichardson/string.js/issues/160

var express 	= require('express'),
app     	= express(),
ibmbluemix 	= require('ibmbluemix'),
config  	= {
	// change to real application route assigned for your application
	applicationRoute : "http://testvisualrecognitionbe.eu-gb.mybluemix.net",
	// change to real application ID generated by Bluemix for your application
	applicationId : "83519716-5b8d-4354-adc5-d0154f05007e"
};

var watson = require('watson-developer-cloud');
var fs = require('fs');

var formidable = require('formidable');

/* This could be read from environment variables on Bluemix */
var visual_recognition = watson.visual_recognition({
username: '092872d1-dff7-4236-96a1-522f1b1583ae',
password: 'lkhGglN8c9V3',
version: 'v1'
});

// init core sdk
ibmbluemix.initialize(config);
var logger = ibmbluemix.getLogger();

//redirect to cloudcode doc page when accessing the root context
app.get('/', function(req, res){
	res.sendfile('public/index.html');
});

app.get('/desktop', function(req, res){
	res.sendfile('public/desktop.html');
});

app.post('/uploadpic', function(req, result) {
	
	console.log('uploadpic');
	
	var form = new formidable.IncomingForm();
	form.keepExtensions = true;
	
    form.parse(req, function(err, fields, files) {
		var params = {
			image_file: fs.createReadStream(files.image.path)
		};
	 
		visual_recognition.recognize(params, function(err, res) {
		  if (err)
		    console.log(err);
		  else {
			  var results = [];
			  for(var i=0;i<res.images[0].labels.length;i++) {
				results.push(res.images[0].labels[i].label_name);  
			  }
			  console.log('got '+results.length+' labels from good ole watson');

			  /* simple toggle for desktop/mobile mode */
			  if(!fields.mode) {
				  result.send(results);
			  } else {				
				result.send("<h2>Results from Watson</h2>"+results.join(', '));  
			  }
		  }
		});

    });
	
});

// init service sdks 
app.use(function(req, res, next) {
    req.logger = logger;
    next();
});

// init basics for an express app
app.use(require('./lib/setup'));

var ibmconfig = ibmbluemix.getConfig();

logger.info('mbaas context root: '+ibmconfig.getContextRoot());
// "Require" modules and files containing endpoints and apply the routes to our application
app.use(ibmconfig.getContextRoot(), require('./lib/staticfile'));

app.listen(ibmconfig.getPort());
logger.info('Server started at port: '+ibmconfig.getPort());
