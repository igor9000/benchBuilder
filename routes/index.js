var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');
const MongoClient = require('mongodb').MongoClient;

var db = require('../db');

const attendeeTypes = {
	goalie: 95868,
	player: 95869
}

/* GET home page. */
router.get('/', function(req, res, next) {
	db.get().collection('openSportsGroups').findOne({}, function (findErr, result) {

		if (result) {
			fetchGames(result.openSportsGroupId).then(gameList => {
				res.render('index', {
					title: req.app.settings.name,
					groupInfo: result,
					gameList: gameList.result
				});
				next();
			});
		} else {
			res.render('index', {
				title: req.app.settings.name,
				groupInfo: result
			});
		}
	});


});


/* GET game */
router.get('/game', function(req, res, next) {
	fetchGame(req.query.aliasID).then(gameInfo => {
		const d = new Date(gameInfo.result.start);
		const dateString = `${d.getMonth()}/${d.getDate()}/${d.getFullYear()}`;
		const playerList = getAttendeeListByAttendeeType(gameInfo.result.attending, attendeeTypes.player);
		const playerIds = getAttendeeIDList(playerList);


		const matches = db.get().collection('players').find({ 'openSportsUserId': { $in:playerIds } });
		
		if (matches) {
			console.log('potential matches')
			matches.forEach(console.log);
		}


		res.render('game', {
			title: `${dateString} - ${gameInfo.result.title}`,
			gameInfo: gameInfo.result,
			playerList
		});
	});
	
});


/* GET config */
router.get('/config', function(req, res, next) {
	let error;
	switch (req.query.err) {
		case '10':
			error = "Unable to find ID in OpenSports"
			break;
		case undefined:
			break;
		default:
			error = "Unhandled error"
	}

	db.get().collection('openSportsGroups').findOne({}, function (err, result) {
		if (err) throw err;
		res.render('config', {
			title: 'Configuration',
			err: error,
			groupInfo: result ? result : {}
		});
		next();
	});


});

/* POST config */
router.post('/config', function(req, res, next) {
	// TODO: this fetchGames needs to be replaced with some kind of "fetchGroup", but I can't find an open sports API for groups so I'm just using the events data
	fetchGames(req.body.openSportsGroupId).then(response => {
		if (response.result.length) {
			db.get().collection('openSportsGroups', function (err, collection) {
				if (err) throw err;
				collection.deleteMany({});
				collection.insertOne({
					openSportsGroupId: req.body.openSportsGroupId,
					name: response.result[0].groupName
				});
			});

			res.redirect('config');
		} else {
			console.log('response', response)
			res.redirect('config?err=10');
		}
	});
});


router.get('/deletegroup', function(req, res, next) {
	res.send('<form action="/deletegroup" method="POST"><input type="submit" value="Delete Open Sports Group" /></form>');
});
router.post('/deletegroup', function(req, res, next) {
	db.get().collection('openSportsGroups', function (err, collection) {
		if (err) throw err;
		collection.deleteMany({});
		res.redirect('config');
	});
});


const fetchGames = function(groupId) {
  return fetch(`https://osapi.opensports.ca/app/posts/listFiltered?groupID=${parseInt(groupId)}&limit=24`)
	.then(response => response.json())
	.then(data => data);
};

const fetchGame = function(gameId) {
  return fetch(`https://opensports.net/api/posts/loadOne?aliasID=${gameId}`)
	.then(response => response.json())
	.then(data => data);
};

const getAttendeeListByAttendeeType = function(attendeeList, attendeeType) {
	return attendeeList.filter(attendee => {
		return parseInt(attendee.attendeeSummary[0].ticketClassID) === attendeeType;
	});
}

const getAttendeeIDList = function(attendeeList) {
	return attendeeList.map(attendee => {
		return attendee.attendeeSummary[0].userSummary.userID;
	});
}

module.exports = router;
