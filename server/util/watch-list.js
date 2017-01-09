// Helpers for watch list C R U D operations to/from database
var http = require('http');
var requestify = require('requestify');
var underscore = require('underscore');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
const DB_NAME = 'rhea3';
const DB_WATCH_LIST_COLLECTION = 'watchLists';
const DB_URI = "mongodb://localhost:27017/rhea3";

module.exports = {
    //param - single watch list object - name and symbols
    createWatchlistInDb: function (watch_list_obj) {
        db_pool.collection(DB_WATCH_LIST_COLLECTION).insert(watch_list_obj, function (err, docs) {
            if (err) { console.log("*** ERROR Insert into database" + err); return; }
            console.log("[Ok] - insert watch list " + watch_list_obj.name);
            db_pool.close();//this doesn't close connection but close this insert operation such that no new connection is created???
        })
    },

    //--remove all watch list documents from database
    clearWatchlistCollection: function () {
        db_pool.collection(DB_WATCH_LIST_COLLECTION).remove({}, function (err) {
            if (err) { console.log("[ERR] Removing watch list collection" + err); return; }
            console.log("[Ok] - remove watch list collection");
        })
    },

    //-- C (of C R U D) is this watch list unique? if yes, insert into db
    insertUniqueIntoDb: function (request, response) {
        var watchlist_obj = request.body;
        var watchlist_name = watchlist_obj.name;
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) {
                var msg = "[ERR-001] Connect to rhea3 database. ";
                console.log(msg + err); response.json(msg); response.end();
                db_instance.close();
                return;
            }
            db_instance.collection(DB_WATCH_LIST_COLLECTION).find({ name: watchlist_name }).count().then(function (counts) {
                if (counts > 0) {
                    var msg = "[ERR-002] Watch list <" + watchlist_name + "> is not unique.";
                    console.log(msg); response.json(msg); response.end();
                    db_instance.close();
                }
                else {//unique watch list
                    db_instance.collection(DB_WATCH_LIST_COLLECTION).insert(watchlist_obj, function (err, doc) {
                        if (err) {
                            var msg = "[ERR-004] Insert watch list <" + watchlist_name + "> to db.";
                            console.log(msg + err); response.json(msg); response.end();
                        }
                        else {
                            console.log("[Ok] <" + watchlist_name + "> inserted successfully.");
                            response.json(request.body); response.end();//send back the same content, acknowledge the operation
                        }
                        db_instance.close();
                    });
                }
            }, function (err) {
                var msg = "[ERR-003] Counting watch list <" + watchlist_name + "> Error " + err;
                console.log(msg);
                response.json(msg); response.end();
                db_instance.close();
            });
        })
    },

    //-- R (of C R U D) get back all watch lists
    retriveAll: function (req, res) {
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;
            db_instance.collection('watchLists').find({}).toArray(function (err, items) {
                if (err) throw err;
                res.json(items); res.end();//send items to client
                db_instance.close();
            });
        })
    },
    retrieveWatchlistByName: function (wl_name, res) {//single watch list, name in req.params
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;
            db_instance.collection('watchLists').find({ name: wl_name }, function (err, wl_obj) {
                if (err) throw err;
                res.json(wl_obj); res_end();
                db_instance.close();
            })
        })
    },

    //-- U (of C R U D) find match in db, replace it
    replaceByName: function (req, res) {
        var wl_name = req.params.name;
        var wl = req.body;
        mongoClient.connect(DB_URI, function (err, db_instance) {
            db_instance.collection(DB_WATCH_LIST_COLLECTION).findOneAndUpdate(
                { name: wl_name },
                { $set: {name: wl.name, symbols: wl.symbols } },
                function (err, result) {
                    if (err) throw err;

                    res.json("[Ok] <" + wl_name + "> replaced successfully.");
                    res.end(); db_instance.close();
            })
        })
    },

    //-- D (of C R U D) delete watch list
    deleteByName: function (wl_name, res) {//name in request body
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;
            db_instance.collection(DB_WATCH_LIST_COLLECTION).deleteOne({ name: wl_name }, function (err, doc) {
                if (err) throw err;
                res.json("[ok] Watch list <" + wl_name + "> deleted"); res.end();
                db_instance.close();
            })
        })
    }
};


//TODO how to effectively close or pool db connections???????
//TODO research throw err, is it better than customized message ???????