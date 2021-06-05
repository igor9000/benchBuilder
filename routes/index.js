var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');
const MongoClient = require('mongodb').MongoClient;

var db = require('../db')

const config = {
  openSportsGroupId: ****
};


/* GET home page. */
router.get('/', function(req, res, next) {
	console.log('db is ', db)
	db.get().collection('openSportsGroups').findOne({}, function (findErr, result) {
		const isGroupDefined = result !== null;
		res.render('index', { title: req.app.settings.name, isGroupDefined, osGroup: result });
	});



	// const osGroup = getOpenSportGroup();
	// console.log('osGroup', osGroup)
	// const isGroupDefined = false;
	// res.render('index', { title: req.app.settings.name, isGroupDefined, osGroup });
});


/* GET games list */
router.get('/games', function(req, res, next) {
  fetchGames().then(gameList => {
	res.render('games', { title: 'Hello, games!', tacos: 'tacos', games: gameList });
  });
});


/* GET config */
router.get('/config', function(req, res, next) {
	res.render('config', { title: 'Configuration' });
});

const fetchGames = function(groupId = config.openSportsGroupId) {
  return fetch(`https://osapi.opensports.ca/app/posts/listFiltered?groupID=${groupId}&limit=24`)
	.then(response => response.json())
	.then(data => data);
}


// const getOpenSportGroup = function() {
// 	MongoClient.connect("mongodb://localhost", function (err, client) {
// 		if(err) throw err;
// 		const db = client.db('hockey');

// 		db.collection('groups').findOne({}, function (findErr, result) {
// 			if (findErr) throw findErr;
// 			client.close();
// 			console.log('result is', result)
// 			return result;
// 		});
// 	});
// };



module.exports = router;
