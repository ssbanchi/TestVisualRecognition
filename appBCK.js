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


var dbCredentials = {
		dbName : 'pictures'
	};

var db;
var cloudant;

function initDBConnection() {
	
	if(process.env.VCAP_SERVICES) {
		var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
		if(vcapServices.cloudantNoSQLDB) {
			dbCredentials.host = vcapServices.cloudantNoSQLDB[0].credentials.host;
			dbCredentials.port = vcapServices.cloudantNoSQLDB[0].credentials.port;
			dbCredentials.user = vcapServices.cloudantNoSQLDB[0].credentials.username;
			dbCredentials.password = vcapServices.cloudantNoSQLDB[0].credentials.password;
			dbCredentials.url = vcapServices.cloudantNoSQLDB[0].credentials.url;
			
		} else {
			console.warn('Could not find Cloudant credentials in VCAP_SERVICES environment variable - data will be unavailable to the UI');
		}
	} else{
		console.warn('VCAP_SERVICES environment variable not set - using local var');
		//local credentials
		dbCredentials.host = "93326baa-ea93-491a-83ed-58aa653f638b-bluemix.cloudant.com";
		dbCredentials.port = 443;
		dbCredentials.user = "93326baa-ea93-491a-83ed-58aa653f638b-bluemix";
		dbCredentials.password = "088c8918b9abf8689bee14ec2dbbabd9c145d0074216be2f3bd7b9f326871311";
		dbCredentials.url = "https://93326baa-ea93-491a-83ed-58aa653f638b-bluemix:088c8918b9abf8689bee14ec2dbbabd9c145d0074216be2f3bd7b9f326871311@93326baa-ea93-491a-83ed-58aa653f638b-bluemix.cloudant.com";		       	
	}
	
	cloudant = require('cloudant')(dbCredentials.url);
	
	// check if DB exists if not create
	cloudant.db.create(dbCredentials.dbName, function (err, res) {
		if (err) { console.log('could not create db ', err); }
    });
	
	db = cloudant.use(dbCredentials.dbName);

	//console.log('Connected to DB Cloudant: ' + db);
	
	console.warn('Connected to DB Cloudant - GO !!!');
}

var saveDocument = function(id, name, value, response) {
	
	if(id === undefined) {
		// Generated random id
		id = '';
	}
	
	db.insert({
		name : name,
		value : value
	}, id, function(err, doc) {
		if(err) {
			console.log(err);
			response.sendStatus(500);
		} else
			response.sendStatus(200);
		response.end();
	});
	
}


//init db connection to cloudant
//initDBConnection();

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
		var fileStream = {
			image_file: fs.createReadStream(files.image.path)
		};
	 
		//insert in DB
		
//		db.insert({ filestream: fileStream }, 'file', function(err, body, header) {
//	      if (err) {
//	        return console.error('[file insert] ', err.message);
//	      }
//
//	      console.log('You have inserted a file');
//	      console.log(body);
//	    });
		
//		 var rev = req.query.rev;
//		 
//		db.attachment.insert('', 'nomeFile', fileStream.image_file._readableState.buffer, 'image/jpeg', {rev: rev}, function(err, document) {
//			if (!err) {
//				console.log('image saved successfully.. ');
//			} else {
//				console.log(err);
//			}
//		});
		
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
	
    result.send("<h2>insert</h2>");  
});

//read and show db content
app.get('/read', function(req, res){
	
//	db = cloudant.use(dbCredentials.dbName);
//	var docs = db.allDocs(function(err, response) {
//		var val = response.total_rows;
//		var details = "";
//		var j=0;
//		for(var i=0; i < val; i++) {
//			db.get(response.rows[i].id, function (err,doc){
//				j++;
//				details= details + JSON.stringify(doc.Title) + " by  " +  JSON.stringify(doc.author) + "\n";
//				// Kludge because of Node.js asynchronous handling. To be fixed - T V Ganesh
//				if(j == val) {
//					res.writeHead(200, {'Content-Type': 'text/plain'});
//					res.write(details);
//					res.end();
//					console.log(details);
//				}
//			}); // End db.get
//		} //End for
//	}); // End db.allDocs
	
	db = cloudant.use(dbCredentials.dbName);
	var docList = [];
	var i = 0;
	db.list(function(err, body) {
		if (!err) {
			var len = body.rows.length;
			console.log('total # of docs -> '+len);
			
			body.rows.forEach(function(document) {
				
				db.get(document.id, { revs_info: true }, function(err, doc) {
					if (!err) {
						if(doc['filestream']) {
						
							var attachments = [];
							for(var attribute in doc['_attachments']){
							
								if(doc['_attachments'][attribute] && doc['_attachments'][attribute]['content_type']) {
									attachments.push({"key": attribute, "type": doc['_attachments'][attribute]['content_type']});
								}
								console.log(attribute+": "+JSON.stringify(doc['_attachments'][attribute]));
							}
							var responseData = createResponseData(
									doc._id,
									doc.name,
									doc.value,
									attachments);
						
						} else {
							var responseData = createResponseData(
									doc._id,
									doc.name,
									doc.value,
									[]);
						}	
					
						docList.push(responseData);
						i++;
						if(i >= len) {
							response.write(JSON.stringify(docList));
							console.log('ending response...');
							response.end();
						}
					} else {
						console.log(err);
					}
				});
				
			});
			
			
		} else {
			console.log(err);
		}
	});
	
	res.send('<h1>ris</h1>');
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
