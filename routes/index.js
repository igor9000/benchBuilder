var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');
const MongoClient = require('mongodb').MongoClient;

var db = require('../db');

const ratingValidityLengthInMs = 30 * (24 * 60 * 60 * 1000);


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
		const dateString = `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
		const playerTicketId = gameInfo.result.ticketsSummary.find(item => item.title === "Player").id;
		const playerList = getAttendeeListByAttendeeType(gameInfo.result.attending, playerTicketId);
		const playerIds = getAttendeeIDList(playerList);

		db.get().collection('players').find({ 'openSportsUserId': { $in:playerIds } }).sort({ ratingOverall: -1 }).toArray().then(knownPlayerList => {

			knownPlayerList.forEach(player => {
				makePlayerKnown(playerList, player);
			});

			const unknownPlayers = getUnknownPlayers(playerList);
			const hasUnknownPlayers = !!unknownPlayers.length;

			addUnknownPlayersToDb(unknownPlayers);

			playerList.sort((a, b) => {
				if (b.attendeeSummary[0].userSummary.ratingOverall && a.attendeeSummary[0].userSummary.ratingOverall) {
					return parseInt(b.attendeeSummary[0].userSummary.ratingOverall) - parseInt(a.attendeeSummary[0].userSummary.ratingOverall);
				} else if (b.attendeeSummary[0].userSummary.ratingOverall) {
					return 1;
				}
				return -1;
			});


			res.render('game', {
				title: `${dateString} - ${gameInfo.result.title}`,
				gameInfo: gameInfo.result,
				playerList,
				knownPlayerList,
				hasUnknownPlayers,
				rosters: !hasUnknownPlayers ? buildRoster(playerList) : undefined,
				getPlayerRatingLabel: getPlayerRatingLabel,
				isRatingExpired: isRatingExpired
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
		res.render('player', {
			title: `${result.firstName} ${result.lastName}`,
			playerInfo: result ? result : {},
			playerRatingCategories,
			success: req.query.hasOwnProperty('success')
		});
		next();
	});
});
router.post('/player', function(req, res, next) {
	const updateData = {};
	const blackList = ['openSportsUserId'];
	let ratingOverall = 0;
	let ratingMax = 0;
	Object.keys(req.body).forEach(key => {
		if (blackList.indexOf(key) === -1) {
			updateData[key] = parseInt(req.body[key]);
			ratingOverall += parseInt(req.body[key]);
			ratingMax += 100;
		}
	});
	updateData.ratingOverall = Math.round(((ratingOverall / ratingMax) * 100));
	updateData.lastUpdateTime = new Date().valueOf();


	const query = { openSportsUserId: parseInt(req.body.openSportsUserId) };
	const update = { $set: updateData };
	const options = { upsert: true };
	db.get().collection('players').updateOne(query, update, options);
	res.redirect(`/player?id=${req.body.openSportsUserId}&success`);
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
		matchedPlayer.attendeeSummary[0].userSummary.lastUpdateTime = knownPlayer.lastUpdateTime;		
	}
};

const isRatingExpired = function(ratingTime = 0) {
	return Date.now().valueOf() - ratingTime > ratingValidityLengthInMs;
};

const getPlayerRatingLabel = function(attendee, isRatingExpired = isRatingExpired) {
	const rating = attendee.attendeeSummary[0].userSummary.ratingOverall;
	if (rating && isRatingExpired(attendee.attendeeSummary[0].userSummary.lastUpdateTime)) {
		return `${rating} (expired)`;
	} else if (rating) {
		return rating;
	}
	return `Not Rated`;
};

const getUnknownPlayers = function(playerList) {
	const matchedPlayers = playerList.filter(player => {
		return isRatingExpired(player.attendeeSummary[0].userSummary.lastUpdateTime);
	});
	return matchedPlayers;
};

const addUnknownPlayersToDb = function(playerList) {
	playerList.forEach(player => {
		const query = { openSportsUserId: parseInt(player.attendeeSummary[0].userSummary.userID) };
		const playerData = {
			openSportsUserId: parseInt(player.attendeeSummary[0].userSummary.userID),
			firstName: player.attendeeSummary[0].userSummary.firstName,
			lastName: player.attendeeSummary[0].userSummary.lastName
		};
		const update = { $set: playerData };
		const options = { upsert: true };
		db.get().collection('players').updateOne(query, update, options);
	});
};

const deleteEmptyPlayers = function() {
	db.get().collection('players').deleteMany({ firstName: null, lastName: null });
};

const deleteUnratedPlayers = function() {
	db.get().collection('players').deleteMany({ ratingOverall: undefined });
};

const buildRoster = function(playerList) {
	const teams = {
		lightTeam: {
			players: []
		},
		darkTeam: {
			players: []
		}
	};

	
	playerList.forEach(player => {
		let onClockTeam;
		if (teams.lightTeam.players.length === teams.darkTeam.players.length) {
			onClockTeam = coinFlip() === 0 ? 'lightTeam' : 'darkTeam';
		} else {
			onClockTeam = teams.lightTeam.players.length < teams.darkTeam.players.length ? 'lightTeam' : 'darkTeam'
		}
		teams[onClockTeam].players.push(player);
	});

	return teams;

};

const coinFlip = function() {
	return Math.floor(Math.random() * (2 - 0) + 0);
}


module.exports = {
	router,
	fetchGames
};
