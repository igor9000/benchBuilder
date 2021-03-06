const MongoClient = require('mongodb').MongoClient

const state = {
	db: null
};

exports.connect = function(url, databaseName, done) {
	if (state.db) return done();

	MongoClient.connect(url, function(err, client) {
		if (err) return done(err)
		state.db = client.db(databaseName)
		done()
  	});
};

exports.get = function() {
	return state.db;
}

exports.close = function(done) {
	if (state.db) {
		state.db.close(function(err, result) {
		state.db = null
		state.mode = null
		done(err)
	});
  }
};
