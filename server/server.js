//--- Learning tutorial from youtube: a simple task list
var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var watchList = require('./util/watch-list');
var histQuote = require('./util/hist-quote');

//--- init
const port = 3000;
var app = express();

//--- static folder for angular, don't need any app.use and it will work
app.use(express.static(path.join(__dirname, '../client'))); //must have this to serve static content like images

//--- body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//--- entry point to Angular world, initial refresh
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/main.html'));//use absolute path to serve home page
});

//--- C (of C R U D) for watch list , body contains watch list object
app.post('/watchlist', function (req, res) {
    var wl_name = req.body.name;
    console.log("[Ok] Server received POST request for creating watch list: " + wl_name);
    //check uniqueness, then insert doc
    watchList.insertUniqueIntoDb(req, res);
});
//----------- Watch list operations --------------
//--- R (of C R U D) for retrieving watch list(s)
app.get('/watchlist', function (req, res) {//no argument - all watch lists in db
    console.log("[Ok] Server received GET request to retrieve all watch lists.");
    watchList.retriveAll(req, res);
});
app.get('/watchlist/:name', function (req, res) {
    var wl_name = req.params.name;
    console.log("[Ok] Server received GET request for retrieving watch list: " + wl_name);
    watchList.retrieveWatchlistByName(wl_name, res);
});

//--- U (of C R U D) to update parts of a watch list
app.put('/watchlist/:name', function (req, res) {//url has db's watch list name, req.body has new name
    var wl_name = req.params.name;
    var wl = req.body;
    console.log("[Ok] Server received PUT request for updating watch list: " + wl_name);
    watchList.replaceByName(req, res);
});

//--- D (of C R U D) for deleting 1 watch list by name
app.delete('/watchlist/:name', function (req, res) {
    var wl_name = req.params.name;
    console.log("[Ok] Server received DELETE request for watch list. Name = " + wl_name);
    watchList.deleteByName(wl_name, res);
});


//--------------- Historical Quotes operations -------------------
//--- C (of C R U D) download from barchart.com 2 year quotes, store in DB
//create new quotes for a symbol
app.post('/hist-quote/:symbols', function (req, res) {
    var sym = req.params.symbols;
    console.log("[Ok] Server received POST request to create historical quotes for " + sym);
    histQuote.createQuotesForSymbol(sym, res);
});
//--- R (of C R U D) for retrieving various results from querying historical quotes
//retrieve all quotes for a symbol
app.get('/hist-quote/:symbol', function (req, res) {
    var sym = req.params.symbol;
    console.log("[Ok] Server received GET request to retrieve historical quotes for " + sym);
    histQuote.retrieveRecentQuotesBySymbol(sym, res);
});
//retrieve unique symbols in DB
app.get('/hist-quote',function (req, res) {
    console.log("[Ok] Server received GET request to retrieve unique symbols");
    histQuote.retrieveUniqueSymbols(res);
});
//retrieve doc count for a symbol
app.get('/hist-quote/doc-count/:symbol', function (req, res) {
    var sym = req.params.symbol;
    console.log("[Ok] Server received GET to retrieve quote counts for " + sym);
    histQuote.retrieveQuoteCount(sym, res);
});
//retrieve most recent quote date for a symbol
app.get('/hist-quote/recent-date/:symbol', function (req, res) {
    var sym = req.params.symbol;
    console.log("[Ok] Server received GET to retrieve recent date for " + sym);
    histQuote.retrieveRecentDate(sym, res);
});
//update to the latest qutoes
app.put('/hist-quote/:symbol/:startDate', function (req, res) {
    var sym = req.params.symbol;
    var date = req.params.startDate;
    console.log("[Ok] Server received PUT to update quotes for " + sym + " from " + date);
    histQuote.updateQuotes(sym, date, res);
});

//--- D (of C R U D) - delete historical quotes for a symbol from DB
app.delete('/hist-quote/:symbol', function (req, res) {
    var sym = req.params.symbol;
    console.log("[Ok] Server received DELETE to remove quotes for " + sym);
    histQuote.deleteQuotes(sym, res);
});

//--- Error handling for all other requests
app.use(function (req, res, next) {
    res.status(404);
    res.sendFile(path.join(__dirname, '../client/404.html'));//wrong place to go
});

app.listen(port, function () {
    console.log("Server started on port " + port);
});


// var index = require("./routes/index");//routes to index.js inside routes folder
// app.use('/', index);//hookup express with this path
// app.use('/home', index);//hookup express with this path, alias to root
//TODO use mongo-promise to reduce deep levels of callback hell?????