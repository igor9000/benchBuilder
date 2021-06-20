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
		const playerIds = playerModule.getAttendeeIDList(playerList);

		const query = { $or: [ { 'openSportsUserId': { $in:playerIds.map(p => p.userID) } }, { 'tempID': { $in:playerIds.map(p => p.tempID) } } ] };
		db.get().collection('players').find(query).sort({ ratingOverall: -1 }).toArray().then(knownPlayerList => {
			knownPlayerList.forEach(player => {
				makePlayerKnown(playerList, player);
			});

			const unknownPlayers = getUnratedPlayers(playerList);
			const hasUnknownPlayers = !!unknownPlayers.length;

			addPlayersToDb(unknownPlayers);

			playerList.sort(bbUtils.sorts.byPlayerRanking);


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
	const query = req.query.id ? { openSportsUserId: parseInt(req.query.id) } : { tempID: req.query.tempID };
	db.get().collection('players').findOne(query, function (findErr, result) {
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
	const blackList = ['openSportsUserId', 'tempID'];
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


	const query = req.body.openSportsUserId ? { openSportsUserId: parseInt(req.body.openSportsUserId) } : { tempID: req.body.tempID };
	const update = { $set: updateData };
	const options = { upsert: true };
	db.get().collection('players').updateOne(query, update, options);
	const playerLink = req.body.openSportsUserId ? `/player?id=${req.body.openSportsUserId}` : `/player?tempID=${req.body.tempID}`
	res.redirect(playerLink);
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
	const playerList = [];
	attendeeList.forEach(attendee => {
		attendee.attendeeSummary.forEach(summary => {
			if (parseInt(summary.ticketClassID) === attendeeType) {
				playerList.push(summary);
			}
		});
	});
	return playerList;
};

const getAttendeeIDList = function(attendeeList) {
	return attendeeList.map(attendee => {
		return {
			userID: attendee.userSummary.userID,
			tempID: playerModule.getTempID(attendee)
		}
	});
};

const makePlayerKnown = function(playerList, knownPlayer) {
	const matchedPlayer = playerList.find(player => {
		return parseInt(player.userSummary.userID) === parseInt(knownPlayer.openSportsUserId) || playerModule.getTempID(player) === knownPlayer.tempID;
	});

	const didPlayerBecomeAMember = matchedPlayer.userSummary.userID && !knownPlayer.openSportsUserId;

	if (didPlayerBecomeAMember) {
		addPlayersToDb([ matchedPlayer ]);
	}

	if (matchedPlayer) {
		matchedPlayer.userSummary.ratingOverall = knownPlayer.ratingOverall;
		matchedPlayer.userSummary.lastUpdateTime = knownPlayer.lastUpdateTime;
		matchedPlayer.userSummary.tempID = knownPlayer.tempID;
	}
};

const isRatingExpired = function(ratingTime = 0) {
	return Date.now().valueOf() - ratingTime > ratingValidityLengthInMs;
};

const getPlayerRatingLabel = function(attendee, isRatingExpired = isRatingExpired) {
	const rating = attendee.userSummary.ratingOverall;
	if (rating && isRatingExpired(attendee.userSummary.lastUpdateTime)) {
		return `${rating} (expired)`;
	} else if (rating) {
		return rating;
	}
	return `Not Rated`;
};

const getUnratedPlayers = function(playerList) {
	const matchedPlayers = playerList.filter(player => {
		return isRatingExpired(player.userSummary.lastUpdateTime);
	});
	return matchedPlayers;
};

/**
 * @desc Adds a player to the database. If the player was previously a non-member, but became
 * 	a member, their open sports userID will be added to their db entry
 * @param playerList<Object> - The list of players
 */
const addPlayersToDb = function(playerList) {
	playerList.forEach(player => {
		const id = player.userSummary.userID
			? { openSportsUserId: parseInt(player.userSummary.userID) }
			: { tempID: playerModule.getTempID(player) };
		const query = { $or: [ { 'tempID': playerModule.getTempID(player) }, { 'openSportsUserId': parseInt(player.userSummary.userID) } ] };
		const playerData = {
			...id,
			firstName: player.userSummary.firstName,
			lastName: player.userSummary.lastName
		};
		const update = { $set: playerData };
		const options = { upsert: true };
		db.get().collection('players').updateOne(query, update, options);
	});
};

const dao = {
	getPlayers: function(query, sort = { lastName: 1 }) {
		db.get().collection('players').find(query).sort(sort).toArray().then(playerList => {
			console.log('Player List', playerList.length)
			playerList.forEach(item => {
				console.log(`\t${item.openSportsUserId || item.tempID} - ${item.firstName} - ${item.lastName}`)
			});
		});
	}
};

const deleteEmptyPlayers = function() {
	db.get().collection('players').deleteMany({ firstName: null, lastName: null });
};

const deleteUnratedPlayers = function() {
	db.get().collection('players').deleteMany({ ratingOverall: undefined });
};

const deletePLayersWithoutIDs = function() {
	db.get().collection('players').deleteMany({ $and: [ { openSportsUserId: undefined }, { tempID: undefined } ] });
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

const playerModule = {
	getTempID: function(attendee) {
		return `${attendee.userSummary.firstName.toLowerCase()}-${attendee.userSummary.lastName.toLowerCase()}`;
	},
	getAttendeeIDList: function(attendeeList) {
		return attendeeList.map(attendee => {
			return {
				userID: attendee.userSummary.userID,
				tempID: this.getTempID(attendee)
			}
		});
	}
};

const bbUtils = {
	sorts: {
		/**
		 * @desc Array sorter, sorts by player ranking highest to lowest
		 */
		byPlayerRanking(a, b) {
			if (b.userSummary.ratingOverall && a.userSummary.ratingOverall) {
				return parseInt(b.userSummary.ratingOverall) - parseInt(a.userSummary.ratingOverall);
			} else if (b.userSummary.ratingOverall) {
				return 1;
			}
			return -1;
		}
	}
}

module.exports = {
	router,
	fetchGames,
	getAttendeeListByAttendeeType,
	playerModule,
	bbUtils
};
