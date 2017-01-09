//Historical quotes collection helpers
var http = require('http');
var requestify = require('requestify');
var underscore = require('underscore');
var mongodb = require('mongodb');
var mongo_uri = "mongodb://localhost:27017/rhea3";//connecion string
var mongo_client = mongodb.MongoClient;
var db_pool;

//create 1 persistent connection
mongo_client.connect(mongo_uri, function (err, db) {
    if (err) { console.log("*** ERROR Connect to database" + err); return; }
    db_pool = db;
});

module.exports = {
    //---Collect historical End of day quotes for a symbol from start_date to end_date from a provider
    collectEodQuotes: function (symbol, start_date, end_date, provider) {
        requestify.get(composeUri(symbol, start_date)).then(function (res) {
            res.getBody();
            var body = JSON.parse(res.body);
            console.log(res.body);

            //examine "status" node, make sure code is 200
            var status_code = body.status.code;
            if (status_code !== 200) {
                console.log("*** ERROR Barchart quote request: status code = " + status_code);
                return;
            }

            //extract from "results" array
            var quote_results = body.results;
            console.log("[OK] Received " + quote_results.length + " records");

            //extract needed fields from body into quote objects
            for (idx = 0; idx < quote_results.length; idx++) {
                var bq = quote_results[idx];
                var quote_obj = {
                    symbol: bq.symbol,
                    date: bq.tradingDay,
                    open: bq.open,
                    high: bq.high,
                    low: bq.low,
                    close: bq.close,
                    volume: bq.volume
                };
                quoteToDb(quote_obj);
            }
        }, function (err) {
            console.log("*** ERROR request Barchart quotes --> " + err);
        });
    }

};

//-- constants
BARCHART_API_KEY = "f73368105ec551298b76c69d1e4d6e5a";
BARCHART_URL = "http://marketdata.websol.barchart.com/getHistory.json?key=" + BARCHART_API_KEY +
    "&symbol=IBM&type=daily&startDate=20161210";
BARCHART_HOST = "http://marketdata.websol.barchart.com";
BARCHART_ENDPOINT = "";

//-- componse uri based on symbol and start date (YYYYMMDD)
function composeUri(symbol, start_date) {
    return BARCHART_HOST + "/getHistory.json?key=" + BARCHART_API_KEY + "&type=daily&symbol=" + symbol
        + "&startDate=" + start_date;
}

//-- extract / save historical quotes into db
function quoteToDb(quote_obj) {
    db_pool.collection('histQuotes').insert(quote_obj, function(err, docs) {
        if (err) { console.log(err); return; }
        console.log("[Ok] - insert quote for " + quote_obj.symbol + " on " + quote_obj.date);
        db_pool.close();//this doesn't close connection but close this insert operation such that no new connection is created???
    });
}

//-- extract / save historical quotes into db
function quoteToDb1(quote_obj) {
    mongo_client.connect(mongo_uri, function(err, db) {
        if (err) { console.log(err); return; }
        db_pool = db;//save for global use
        db.collection('histQuotes').insert(quote_obj, function(err, docs) {
            if (err) { console.log(err); return; }
            console.log("SUCCESS - insert quote for " + quote_obj.symbol + " on " + quote_obj.date);
        });
        db.close();
    })
}