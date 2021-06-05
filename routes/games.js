var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');

/* GET games list */
router.get('/games', function(req, res, next) {
  fetchGames().then(gameList => {
    res.render('games', { title: 'Hello, games!', tacos: 'tacos', games: gameList });
  });
});

const fetchGames = function(groupId = config.openSportsGroupId) {
  return fetch(`https://osapi.opensports.ca/app/posts/listFiltered?groupID=${groupId}&limit=24`)
    .then(response => response.json())
    .then(data => data);
}



module.exports = router;
