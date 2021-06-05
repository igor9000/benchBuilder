const express = require('express');
const fetch = require('node-fetch');

const createError = require('http-errors');
const path = require('path');
//const cookieParser = require('cookie-parser');
//const logger = require('morgan');

const indexRouter = require('./routes/index');
const gamesRouter = require('./routes/games');
const db = require('./db');

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
		app.listen(3000, function () {
			console.log(`${app.settings.name} listening on port 3000!`);
		});
	}
});



module.exports = app;
