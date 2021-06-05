var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');

const config = {
  openSportsGroupId: ****
};


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Bench Builder' });
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


module.exports = router;
