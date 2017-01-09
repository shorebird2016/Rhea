//-- module for historical quote services for clients
var requestify = require('requestify');
var mongo = require("mongodb");
var mongoClient = mongo.MongoClient;
const DB_NAME = 'rhea3';
const DB_QUTOE_COLLECTION = 'histQuotes';
const DB_URI = "mongodb://localhost:27017/rhea3";
const BARCHART_HOST = "http://marketdata.websol.barchart.com";
const BARCHART_API_KEY = "f73368105ec551298b76c69d1e4d6e5a";
//-- componse uri based on symbol and start date (YYYYMMDD)
function composeBarchartUri(symbol, start_date) {
    return BARCHART_HOST + "/getHistory.json?key=" + BARCHART_API_KEY + "&type=daily&symbol=" + symbol
        + "&startDate=" + start_date;
}

module.exports = {
    //-- create quote records after requesting historical data from barchart.com
    createQuotesForSymbol: function (stock_symbol, res) {
        requestify.get(composeBarchartUri(stock_symbol, "2015-01-01")).then(function (resp) {
            resp.getBody();
            var body = JSON.parse(resp.body);
            console.log(resp.body);

            //examine "status" node, make sure code is 200(ok)
            var status_code = body.status.code;
            if (status_code !== 200) {
                console.log("[Ok] Barchart quote request: status code = " + status_code);
                return;
            }

            //extract from "results" array
            var quote_results = body.results;
            console.log("[OK] Received " + quote_results.length + " records");
            mongoClient.connect(DB_URI, function (err, db_instance) {
                if (err) throw err;
                db_instance.collection(DB_QUTOE_COLLECTION).insert(quote_results, function(err, msg) {
                    if (err) { console.log(err); throw err; }
                    console.log("[Ok] Inserted " + quote_results.length + " quotes for " + stock_symbol);
                });
                db_instance.close();
                res.end('[Ok] POST Successful ' + quote_results.length + " quote records inserted for " + stock_symbol);
            });
        }, function (err) {
            console.log("[ERR] Fail to request Barchart quotes --> " + err);
        });
    },

    //-- get most recent N bars for symbol
    retrieveRecentQuotesBySymbol: function (stock_symbol, res) {
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;//TODO
            console.log("[Ok]    Finding quotes for " + stock_symbol);//use projections to eliminate useless columns
            var cursor = db_instance.collection(DB_QUTOE_COLLECTION)
                .find({ symbol: stock_symbol }, { tradingDay: 1, open:1, high:1, low:1, close: 1, volume: 1 });
            cursor.toArray(function (err, docs) {
                if (err) throw err;//TODO
                console.log("[Ok]    Number of records = " + docs.length);
                if (docs.length > 0)
                    res.send(docs);
                res.end();//finish up request cycle
                db_instance.close();//must do this after all db operation is complete
            });

            //TODO ensure sorted by date

        })
    },

    //-- R (of C R U D) - retrieve unique list of symbols
    retrieveUniqueSymbols: function (res) {
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;//TODO
            db_instance.collection(DB_QUTOE_COLLECTION).distinct("symbol", function (err, symbol_list) {
                console.log("[Ok]    Number of symbols = " + symbol_list.length);
                res.send(symbol_list);
                res.end();
                db_instance.close();
            })
        })
    },
    retrieveQuoteCount: function (stock_symbol, res) {
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;//TODO
            db_instance.collection(DB_QUTOE_COLLECTION).find({symbol: stock_symbol}).count(function (err, counts) {
                if (err) throw err;//TODO
                console.log('[Ok]    Counts = ' + counts + " for " + stock_symbol);
                res.send(counts.toString()); res.end();
                db_instance.close();
            })
        })
    },
    retrieveRecentDate: function (stock_symbol, res) {
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;//TODO
            db_instance.collection(DB_QUTOE_COLLECTION).find({symbol:stock_symbol})
                .sort({tradingDay:-1}).limit(1).toArray(function (err, quotes) {//toArray() returns quote
                if (err) throw err;//TODO
                console.log("[Ok]    Recent date: " + quotes[0].tradingDay);
                res.send(quotes[0].tradingDay); res.end();
                db_instance.close();
            })
        })
    },

    //-- U (of C R U D) - update to latest available quotes from barchart.com for a symbol
    updateQuotes: function (stock_symbol, start_date, res) {
        //add 1 day to start date
        var dtms = Date.parse(start_date) + 24 * 60 * 60 * 1000;
        var dt = new Date(dtms);
        // dt.setMilliseconds(dtms);
        start_date = dt.toISOString().substr(0, 10);
        console.log("[Ok]    Requesting quotes for " + stock_symbol + " starting " + start_date);
        requestify.get(composeBarchartUri(stock_symbol, start_date)).then(function (resp) {
            resp.getBody();
            var body = JSON.parse(resp.body);
            // console.log(resp.body);

            //examine "status" node, make sure code is 200(ok)
            var status_code = body.status.code;
            if (status_code !== 200) {
                console.log("[Ok] Barchart quote request: status code = " + status_code);
                return;
            }

            //if there is no quote to insert, tradingDay is false
            if (body.results[0].tradingDay == false)
                res.end("[Ok] No quotes available for " + stock_symbol);
            else {
                //insert into database
                mongoClient.connect(DB_URI, function (err, db_instance) {
                    if (err) throw err;//TODO
                    db_instance.collection(DB_QUTOE_COLLECTION).insert(body.results, function (err, msg) {
                        if (err) { db_instance.close(); throw err; }
                        console.log("[Ok]   Quotes inserted for " + stock_symbol);
                        res.end("[Ok] PUT successful " + stock_symbol + " quotes updated.");
                        db_instance.close();
                    })
                })
            }
        }, function (err) {
            console.log("[ERR] Fail to request Barchart quotes --> " + err);
        });
    },

    //-- D (of C R U D) - remove quotes for symobl
    deleteQuotes: function (stock_symbol, res) {
        mongoClient.connect(DB_URI, function (err, db_instance) {
            if (err) throw err;
            db_instance.collection(DB_QUTOE_COLLECTION).deleteMany({symbol: stock_symbol}, function (err, status) {
                if (err) throw err;
                if (status.result.ok) {
                    console.log('[Ok]    Deleted ' + status.result.n + " quote records for " + stock_symbol);
                    res.end("[Ok] Deleted " + status.result.n + " quote records for " + stock_symbol);
                }
                else {
                    res.end("[Err] Unable to delete " + stock_symbol);
                }
                db_instance.close();
            })
        })
    }
};

//for non-existent barchart quote
// [{"symbol":"A","timestamp":false,"tradingDay":false,"open":null,"high":null,"low":null,"close":null,"volume":null,
// "openInterest":null}]}