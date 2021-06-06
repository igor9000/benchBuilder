var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');
const MongoClient = require('mongodb').MongoClient;

var db = require('../db');

const attendeeTypes = {
	goalie: 95868,
	player: 95869
};

const playerRatingCategories = [
	{
		name: 'ratingSpeed',
		uiLabel: 'Speed',
		description: ''
	}, {
		name: 'ratingStopping',
		uiLabel: 'Stopping',
		description: ''
	}, {
		name: 'ratingTightTurn',
		uiLabel: 'Tight Turn',
		description: ''
	}, {
		name: 'ratingShotPower',
		uiLabel: 'Shot Power',
		description: ''
	}, {
		name: 'ratingShotAccuracy',
		uiLabel: 'Shot Accuracy',
		description: ''
	}, {
		name: 'ratingBalance',
		uiLabel: 'Balance',
		description: ''
	}, {
		name: 'ratingSkatingBackwards',
		uiLabel: 'Skating Backwards',
		description: ''
	}, {
		name: 'ratingForwardCrossover',
		uiLabel: 'Forward Crossover',
		description: ''
	}, {
		name: 'ratingBackwardCrossOver',
		uiLabel: 'Backward Crossover',
		description: ''
	}, {
		name: 'ratingPositioning',
		uiLabel: 'Positioning',
		description: ''
	}, {
		name: 'ratingHockeySense',
		uiLabel: 'Hockey Sense',
		description: ''
	}
];

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


		db.get().collection('players').find({ 'openSportsUserId': { $in:playerIds } }).toArray().then(knownPlayerList => {

			knownPlayerList.forEach(player => {
				makePlayerKnown(playerList, player);
			});

			const hasUnknownPlayers = !!getUnknownPlayers(playerList).length;


			res.render('game', {
				title: `${dateString} - ${gameInfo.result.title}`,
				gameInfo: gameInfo.result,
				playerList,
				knownPlayerList,
				hasUnknownPlayers
			});
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


router.get('/player', function(req, res, next) {
	db.get().collection('players').findOne({ openSportsUserId: parseInt(req.query.id) }, function (findErr, result) {
		console.log(req.query.id, result)
		res.render('player', {
			title: `${result.firstName} ${result.lastName}`,
			playerInfo: result ? result : {},
			playerRatingCategories
		});
		next();
	});
});
router.post('/player', function(req, res, next) {
	console.log('its a response!', req.body)
	Object.keys(req.body).forEach(key => {
		console.log(req.body[key])
	})
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
};

const getAttendeeIDList = function(attendeeList) {
	return attendeeList.map(attendee => {
		return attendee.attendeeSummary[0].userSummary.userID;
	});
};

const makePlayerKnown = function(playerList, knownPlayer) {
	const matchedPlayer = playerList.find(player => {
		return parseInt(player.attendeeSummary[0].userSummary.userID) === parseInt(knownPlayer.openSportsUserId);
	});
	if (matchedPlayer) {
		matchedPlayer.attendeeSummary[0].userSummary.ratingOverall = knownPlayer.ratingOverall;
	}
};

const getUnknownPlayers = function(playerList) {
	const matchedPlayers = playerList.filter(player => {
		return !player.attendeeSummary[0].userSummary.ratingOverall;
	});
	return matchedPlayers;
};

module.exports = router;
