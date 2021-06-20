const express = require('express');
const fetch = require('node-fetch');

const createError = require('http-errors');
const path = require('path');

const indexRouter = require('./routes/index').router;
const gamesRouter = require('./routes/games');
const db = require('./db');

const benchBuilderPackage = require('./package.json');

const MongoClient = require('mongodb').MongoClient;

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('name', 'Bench Builder')

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/games', gamesRouter);


indexRouter.get('*', function(req, res, next) {
	req.app = app;
	next();
});




db.connect('mongodb://localhost', 'benchBuilder', function(err) {
	if (err) {
		console.log('something bad happened with the database connection', error);
	} else {
		console.log('Booting Up...');
		isMostRecentAppVersion().then(function(successMsg) {
			console.log(successMsg);
			app.listen(3000, function () {
				console.log('\x1b[32m', `${app.settings.name} running at http://localhost:3000`, '\x1b[0m');
			});
		}, function(errorMsg) {
			console.log('\x1b[31m', errorMsg, '\x1b[0m');
			console.log('Shutting down.');
		})
			
		
	}
});

const isMostRecentAppVersion = function() {
	return fetchBenchBuilderVersion().then((response) => {
		if (response.version !== benchBuilderPackage.version) {
			return Promise.reject(`Version ${benchBuilderPackage.version} is out of date - visit https://github.com/igor9000/benchBuilder#readme to upgrade`)
		} else {
			return Promise.resolve(`Version ${benchBuilderPackage.version} is current.`);
		}
	});
};


const fetchBenchBuilderVersion = function() {
  return fetch(`https://raw.githubusercontent.com/igor9000/benchBuilder/main/package.json`)
	.then(response => response.json())
	.then(data => data);
};


module.exports = app;
