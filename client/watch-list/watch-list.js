//----- servicing watch list related features -----
angular.module('stkApp')
.controller('watchListCtrl', ['$scope', '$http', '$q', '$window', '$timeout', function ($scope, $http, $q, $window, $timeout) {

    //---Starup code: read watch lists from database---
    retrieveWatchlists();

    //--------------- C R U D for watch list in memory ------------
    $scope.addWatchList = function() {
        var name = $scope.watchListEntry;
        if (name !== "") {
            //check validity of watch list name
            if (!isNameValid(name)) {
                $scope.errorText1 = "Oops! " + name + " is NOT Valid.  Please Re-enter.";
                return;
            }
            if (isDupWatchList(name)) {
                $scope.errorText1 = "Oops!!  No duplicate watch list...";
                $scope.watchListEntry = "";//clear field
                return;
            }

            //add this unique list to collection
            var wl = {
                name: name,
                symbols: []
            };
            $scope.watchListCollection.push(wl);
            $scope.currentIndex = $scope.watchListCollection.length - 1;
            $scope.watchListName = $scope.watchListCollection[$scope.currentIndex].name;//save name for possilbe editing
            $scope.newWatchList = "";//clear entry
            clearError(); $scope.currentSymbolIndex = -1;//no symbol yet
            $scope.quoteCollection = [];
            $scope.watchListEntry = "";
            $scope.symbolTableTitle = name + "  (" + $scope.quoteCollection.length + ")";
            //set active class for new watch list
            $scope.activeWatchlist = wl;
        }
    };
    $scope.clickWatchList = function(watch_list_index) {
        $scope.currentIndex = watch_list_index;
        $scope.watchListName = $scope.watchListCollection[$scope.currentIndex].name;//save name for possilbe editing
        //trigger active class for new watch list
        $scope.activeWatchlist = $scope.watchListCollection[watch_list_index];
        clearError();
        requestQuotes();
        var sym = $scope.watchListCollection[$scope.currentIndex].symbols[0];
        refreshChart(sym, true);//true to add watch list to chart
    };
    $scope.editWatchList = function(watch_list_index) {
        $scope.currentIndex = watch_list_index;//select the list first
        $scope.watchListName = $scope.watchListCollection[$scope.currentIndex].name;//save name for possilbe editing
    };
    $scope.handleSymbolKeyPress = function(key_event) {
        if (key_event.which == 13) //hit return key at text field
            $scope.addSymbol();
    };
    $scope.handleModal1KeyPress = function(key_event) {//hit return key in modal1
        if (key_event.which == 13) //hit return key in modal1
            $scope.hideDialogAndSaveDb1();
    };
    $scope.handleModal2KeyPress = function(key_event) {  //quoteCollection[currentSymbolIndex].symbol
        $scope.errorText4 = "";
        if (key_event.which == 13) //hit return key in modal2
            submitSymbol($scope.tempSymbol);
    };
    $scope.removeWatchList = function(watch_list_index) {
        //database update
        deleteWatchlistByName($scope.watchListCollection[watch_list_index].name);
//TODO refresh watch list after DB successful,
        $scope.watchListCollection.splice(watch_list_index, 1);
        $scope.currentIndex = watch_list_index - 1; $scope.currentSymbolIndex = -1;
        $scope.watchListName = $scope.watchListCollection[$scope.currentIndex].name;//save name for possilbe editing
        clearError();
    };
    function submitSymbol(symbol) {
        $scope.tempSymbol = $scope.tempSymbol.toUpperCase();
        //check if symbol is valid via ajax
        var promise_quote = requestYahooQuote($scope.tempSymbol);
        promise_quote.then(function(quote_obj) {
            if (!quote_obj.Volume) {
                $scope.errorText4 = "Oops! " + $scope.tempSymbol + " is not a valid ticker.";
                return;
            }

            //only allow update symbol here and update this row in quoteCollection
            angular.element(document).find('#edit-symbol').modal('hide');//close dialog
            var symbol_edited = $scope.quoteCollection[$scope.currentSymbolIndex].symbol;
            //update watchListCollection's symbol list
            var syms = $scope.watchListCollection[$scope.currentIndex].symbols;
            var idx = syms.indexOf(symbol_edited);
            if (idx !== -1) {
                syms[idx] = $scope.tempSymbol;
            }
            $scope.quoteCollection[$scope.currentSymbolIndex] = quote_obj;

            //send request to update this watch list in db
            var wl_obj = $scope.watchListCollection[$scope.currentIndex];
            updateWatchlistByName($scope.watchListName, wl_obj);
        }, function (error) {
            alert("***ERROR changing " + $scope.tempSymbol + " : " + error);
        });
        $scope.cacheQuotes = $scope.quoteCollection;//save for filtering
    }

    //---------------C R U D for watch list symbols--------------
    $scope.addSymbol = function() {
        if ($scope.symbolEntry !== "") {
            var new_symbol = $scope.symbolEntry.toUpperCase();
            var syms = $scope.watchListCollection[$scope.currentIndex].symbols;
            if (syms === undefined || syms == null) {
                $scope.errorText2 = "Oops!  Watch list is EMPTY.....(bad corner case)";
                return;
            }
//TODO REGX ????????????????????????
            //check non-alpha character
            // var regx = new RegExp("^[A-Z]{1,5}$");
            // if (!regx.test(new_symbol)) {
            //     $scope.errorText2 = "Oops! up to 5 letters are allowed in a symbol.";
            //     return;
            // }

            //check duplicate
            if (syms.indexOf(new_symbol) >= 0) {
                $scope.errorText2 = "Oops!!  No duplicate symbol...";
                $scope.symbolEntry = "";//clear field
                return;
            }
            syms = $scope.watchListCollection[$scope.currentIndex].symbols;

            //get quote for this symbol w promise completion
            var promise_quote = requestYahooQuote(new_symbol);
            promise_quote.then(function(quote_obj) {
                if (!quote_obj.Volume) {
                    $scope.errorText2 = "Oops! " + new_symbol + " does not exist.";
                    $scope.badSymbol = true;
                }
                else {//valid symbol, add to list, update quote array
                    $scope.watchListCollection[$scope.currentIndex].symbols.push(new_symbol);//add to the end
                    $scope.symbolEntry = "";//clear field
                    clearError(); $scope.currentSymbolIndex++;
                    $scope.quoteCollection.push(quote_obj);
                    $scope.cacheQuotes = $scope.quoteCollection;//save for filtering
                    $scope.symbolTableTitle = $scope.watchListCollection[$scope.currentIndex].name
                        + "  (" + $scope.watchListCollection[$scope.currentIndex].symbols.length + ")";
                    //send request to update this watch list in db
                    var wl_obj = $scope.watchListCollection[$scope.currentIndex];
                    updateWatchlistByName($scope.watchListName, wl_obj);
                }
            }, function(error) {
                alert("*** ERROR adding " + new_symbol + " : " + error);
            });
        }
    };
    $scope.clickSymbol = function(symbol_index) {//user clicks symbol, refresh chart
        $scope.currentSymbolIndex = symbol_index;
        clearError();
        var sym = $scope.quoteCollection[$scope.currentSymbolIndex].symbol;
        refreshChart(sym, true);
    };
    $scope.removeSymbol = function(symbol_index) {
        var cur_sym = $scope.quoteCollection[symbol_index].symbol;
        $scope.quoteCollection.splice(symbol_index, 1);
        $scope.cacheQuotes = $scope.quoteCollection;//save for filtering
        clearError(); $scope.currentSymbolIndex--;
        //remove symbol from watchListCollection array
        for (wl_idx = 0; wl_idx < $scope.watchListCollection.length; wl_idx++) {
            var syms = $scope.watchListCollection[wl_idx].symbols;
            for (sym_idx = 0; sym_idx < syms.length; sym_idx++)
                if (syms[sym_idx] == cur_sym) {
                    syms.splice(sym_idx, 1);
                    //send request to update this watch list in db
                    var wl_obj = $scope.watchListCollection[$scope.currentIndex];
                    updateWatchlistByName($scope.watchListName, wl_obj);
                    return;
                }
        }
    };
    $scope.editSymbol = function(symbol_index) {
        $scope.currentSymbolIndex = symbol_index;
        $scope.errorText4 = "";
        $scope.tempSymbol = $scope.quoteCollection[$scope.currentSymbolIndex].symbol;
    };
    //NOTE - hide modal element needs "jQuery loaded before Angular in script tag"
    $scope.hideDialogAndSaveDb1 = function() {
        angular.element(document).find('#edit-watch-list-name').modal('hide');//close dialog
        //send request to update this watch list in db
        var wl_obj = $scope.watchListCollection[$scope.currentIndex];
        updateWatchlistByName($scope.watchListName, wl_obj);
    };
    $scope.hideDialogAndSaveDb2 = function() {
        submitSymbol($scope.tempSymbol);
    };

    //----------------Persistence methods--------------
    $scope.importJson = function() {
        //read directly from data folder, TODO later on use directive and input tag
        //NOTE - turn off browser cache with header option (otherwise content is forever kept)
        $http.get("data/WATCH-LIST.json", {headers: {'Cache-Control': 'no-cache'}})
            .then(function(json_data) {
                //json_data.data contains array of watch lists
                $scope.watchListCollection = json_data.data;//replace existing collection
                $scope.currentIndex = 0;
                $scope.watchListName = $scope.watchListCollection[$scope.currentIndex].name;//save name for possilbe editing

                if (!$scope.watchListCollection)
                    $scope.watchListCollection = [];
                else //retrieve quotes for the active watch list
                    requestQuotes();

//TODO send post request to create new records with empty database
                for (idx = 0; idx < $scope.watchListCollection.length; idx++) {
                    var wl_obj = $scope.watchListCollection[idx];
                    $http.post('/watchlist', wl_obj).then(function (payload) {
                        console.log(payload);
                    }, function (err) {
                        console.log("[ERR] Oops! I can't create watch list " + wl_obj.name + " : " + err);
                    });
                }
            }, function(error) {
                alert("Unable to read JSON file: " + error.data);
            });
    };
    $scope.persistWatchList = function() {
        $.jStorage.set('WATCH_LIST_COLLECTION', $scope.watchListCollection);
    };
    $scope.downloadJson = function() {
        var url = 'data:text/json; charset=utf-8, '
            + JSON.stringify($scope.watchListCollection);
        angular.element('#dld-json').attr('href', url);
        $timeout(function() {//use time out to avoid digest cycle conflict
            angular.element('#dld-json').click();
        });
    };

    //----------- RESTful API C R U D for watch lists via DB --------------
    //--C add new watch list
    $scope.createWatchlist = function () {
        var name = $scope.watchListEntry;
        if (name !== "") {
            //check validity of watch list name
            if (!isNameValid(name)) {
                $scope.errorText1 = "Oops! " + name + " is NOT Valid.  Please Re-enter.";
                return;
            }
            if (isDupWatchList(name)) {
                $scope.errorText1 = "Oops!!  No duplicate watch list...";
                $scope.watchListEntry = "";//clear field
                return;
            }

            //add this unique list to collection
            var watch_list_obj = {
                name: name,
                symbols: []
            };
            $scope.watchListCollection.push(watch_list_obj);
            $scope.currentIndex = $scope.watchListCollection.length - 1;
            $scope.watchListName = $scope.watchListCollection[$scope.currentIndex].name;//save name for possilbe editing
            $scope.newWatchList = "";//clear entry
            clearError(); $scope.currentSymbolIndex = -1;//no symbol yet
            $scope.quoteCollection = [];
            $scope.watchListEntry = "";
            $scope.symbolTableTitle = name + "  (" + $scope.quoteCollection.length + ")";
            //set active class for new watch list
            $scope.activeWatchlist = watch_list_obj;

            //persist in mongodb
            $http.post('/watchlist', watch_list_obj).then(function (payload) {
                console.log(payload);
            }, function (err) {
                console.log("[ERR] Oops! I can't create watch list " + watch_list_obj.name + " : " + err);
                $scope.errorMsg = "Oops! I can't create watch list "  + watch_list_obj.name;
            });
        }
    };
    //--R all watch lists
    function retrieveWatchlists() {
        $scope.watchListCollection = [];
        $http.get('/watchlist').then(function (payload) {
            console.log("From " + payload);
            for (idx = 0; idx < payload.data.length; idx++)
                $scope.watchListCollection.push(payload.data[idx]);
            $scope.currentIndex = 0; $scope.currentSymbolIndex = 0;
            $scope.watchListName = $scope.watchListCollection[$scope.currentIndex].name;
            requestQuotes();
        }, function (err) {
            console.log("[ERR] Oops! I can't retrieve watchlists");
            $scope.errorMsg = "Oops! I can't retrieve watchlists";
        });
    }
    //--R single watch list
    function retrieveWatchListByName(name) {
        $http.get('/watchlist/:' + name).then(function (payload) {
            console.log(payload);
        }, function (err) {
            console.log("[ERR] Oops! I can't retrieve watchlist " + name + " " + err);
            $scope.errorMsg = "Oops! I can't retrieve watchlist " + name;
        });
    }
    //--U single watch list by name
    function updateWatchlistByName(wl_name, wl_obj) {//wl_name: current name in db, wl_obj has new name
        $http.put('/watchlist/' + wl_name, wl_obj).then(function (payload) {
            console.log(payload);
        }, function (err) {
            console.log("[ERR] Oops! I can't update watchlist " + name + " " + err);
            $scope.errorMsg = "Oops! I can't update watchlist " + name;
        });
    }
    //--D single watch list by name
    function deleteWatchlistByName(name) {
        $http.delete('/watchlist/' + name).then(function (payload) {
            console.log(payload);
        }, function (err) {
            console.log("[ERR] Oops! I can't delete watchlist " + name + " " + err);
            $scope.errorMsg = "Oops! I can't delete watchlist " + name;
        });
    }

    //----------------Visual Manipulation: split pane -----------------
    //-- refresh button
    $scope.refreshQuotes = function() {
        requestQuotes();
        reloadResizeChart();
    };
    function refreshChart(symbol, include_watchlist) {
        //when chart is hidden, don't refresh
        if ($scope.chartMode == CHART_HIDDEN) {
            $scope.chartHeight = 10;
            return;
        }
        if (!(angular.element('#chart-frame').is(':visible')))
            return;

        //only full or half view will come here
        var bpw_str = angular.element('#BOTTOM_PANE').css('width');
        var bph_str = angular.element('#BOTTOM_PANE').css('height');
        var bpw = parseFloat(bpw_str.substring(0, bpw_str.length - 2)) - 5;//remove px
        var bph = parseFloat(bph_str.substring(0, bph_str.length - 2)) - 5;//remove px, add 5
        angular.element('#chart-frame').css('width', bpw + 'px');
        angular.element('#chart-frame').css('height', bph + 'px');
        var symbols = $scope.watchListCollection[$scope.currentIndex].symbols;
        var new_body = genBodyHtml(symbol, bpw,  bph, include_watchlist ? symbols : null);
        var body_elem = angular.element('#chart-frame').contents().find('body');
        body_elem.html(new_body);
    }

    //----------------Filtering-------------------
    $scope.filterQuotes = function() {
        if ($scope.cacheQuotes.length == 0) return;//empty list
        var ret = [];
        for (idx = 0; idx < $scope.cacheQuotes.length; idx++) {
            var quote_obj = $scope.cacheQuotes[idx];
            var filter_phase_active = $scope.filterPhase !== "Any Phase";
            var filter_ma_active = $scope.filterMA !== "None";
            var filter_range = ($scope.filterRange !== "") && ($scope.filterRange !== null);//could be either
            //both filters not active
            if (!filter_phase_active && !filter_ma_active) {
                ret.push($scope.cacheQuotes[idx]);
                continue;//no filter active
            }

            //test phase match
            var phase_match = false;
            if (filter_phase_active) {//symbol's phase match?
                var phase = evalPhase(quote_obj);
                if (phase === $scope.filterPhase) {
                    phase_match = true;
                }
            }

            //test MA match
            var ma_match = false;
            if (filter_ma_active) {//both moving average and percent fields have to be active
                if ($scope.filterMA === "50MA") {
                    var delta = parseFloat(quote_obj.PercentChangeFromFiftydayMovingAverage);//+1.17% as an example
                    if (Math.abs(delta) <= $scope.filterRange) {//filter range should not be blank
                        ma_match = true;
                    }
                }
                else if ($scope.filterMA === "200MA") {
                    var delta = parseFloat(quote_obj.PercentChangeFromTwoHundreddayMovingAverage);//+3.27% as an example
                    if (Math.abs(delta) <= $scope.filterRange) {
                        ma_match = true;
                    }
                }
            }

            //several conditions to decide copying
            if (!filter_phase_active && filter_ma_active) {
                if (ma_match)
                    ret.push($scope.cacheQuotes[idx]);
            }
            else if (filter_phase_active && !filter_ma_active) {
                if (phase_match)
                    ret.push($scope.cacheQuotes[idx]);
            }
            else {//both active
                if (phase_match && ma_match)
                    ret.push($scope.cacheQuotes[idx]);
            }
        }//--- END for loop ---
        $scope.quoteCollection = ret;
    };
    $scope.toNumber = function(string_val) {//can not convert in HTML, had to use this method
        return parseFloat(string_val);
    };
    $scope.isPositive = function (string_val) {
        var num = parseFloat(string_val);
        return num >= 0;
    };
    $scope.toggleAllSymbols = function () {//bring all symbols into table for filtering for all symbols mode
        // $scope.clicked = !$scope.clicked;
        $scope.allSymbolMode = !$scope.allSymbolMode;//toggole flag
        if ($scope.allSymbolMode) {
            //collect an array w all symbols from all watch lists, place them in quoteCollection
            var tmp = [];
            for (idx = 0; idx < $scope.watchListCollection.length; idx++) {
                var sym_list = $scope.watchListCollection[idx].symbols;
                for (sym_idx = 0; sym_idx < sym_list.length; sym_idx++) {
                    //remove duplicate
                    var new_sym = sym_list[sym_idx];
                    if (!findSymbol(new_sym, tmp))
                        tmp.push(new_sym);
                }
            }
            requestYahooQuoteCollection(tmp);//for all symbols
            //save current splitter positions for retrieval
            $scope.currentHorPosition = removePx(angular.element('#LEFT-PANE').css('width'));
            $scope.currentVertPosition = $window.innerHeight - removePx(angular.element('#BOTTOM_PANE').css('height'));
            moveSliders(2, 98);//left, top percent 0-100
        }
        else {
            requestQuotes();//back to single watch list
            //restore split pane to saved positions by converting them into percentage in integers
            var hor = ($scope.currentHorPosition / $window.innerWidth) * 100;
            var vert = ($scope.currentVertPosition / $window.innerHeight) * 100;
            moveSliders(Math.round(hor), Math.round(vert));
        }
    };

    //----------------Misc helper functions----------------
    function isDupWatchList(name) {
        for (idx = 0; idx < $scope.watchListCollection.length; idx++) {
            if ($scope.watchListCollection[idx].name == name)
                return true;
        }
        return false;
    }
    function isNameValid(name) {//starts with letter, followed by any number of letters or numbers
        var letters = new RegExp("[a-zA-Z][a-zA-Z0-9\s]*$");//valid letters
        if (letters.test(name)) {
            return true;
        }
        return false;
    }
    function clearError() {
        $scope.errorText1 = undefined;
        $scope.errorText2 = undefined;
        $scope.errorText4 = undefined;
    }
    //--- wrap all symbols in a single request
    function requestYahooQuoteCollection(symbol_array) {//array of symbols (strings), return promise
        //convert array into quoted string "A", "B", "C"
        var symbols = ""; var last_idx = symbol_array.length - 1;
        for (idx = 0; idx < symbol_array.length; idx++) {
            symbols += "%22" + symbol_array[idx] + "%22";
            if (idx < last_idx)//skip the last symbol
                symbols += "%2C";
        }
        var q = $q.defer();
        var url = YQL_URL_HEAD + symbols + YQL_URL_TAIL;
        var promise_obj = $http.get(url);
        promise_obj.then(function (payload) {
            $scope.quotes = payload.data.query.results.quote;//array of quotes from all symbols
            q.resolve($scope.quotes);
            //transfer results into view, convert string into numbers
            $scope.quoteCollection = [];
            for (idx = 0; idx < $scope.quotes.length; idx++) {
                //convert every used field from string to number before pushing into quoteCollection
                var pct = parseFloat($scope.quotes[idx].LastTradePriceOnly);
                $scope.quotes[idx].LastTradePriceOnly = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].ChangeinPercent);
                $scope.quotes[idx].ChangeinPercent = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].Volume);
                $scope.quotes[idx].Volume = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].ChangeinPercent);
                $scope.quotes[idx].ChangeinPercent = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].PercentChangeFromFiftydayMovingAverage);
                $scope.quotes[idx].PercentChangeFromFiftydayMovingAverage = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].PercentChangeFromTwoHundreddayMovingAverage);
                $scope.quotes[idx].PercentChangeFromTwoHundreddayMovingAverage = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].PercebtChangeFromYearHigh);
                $scope.quotes[idx].PercebtChangeFromYearHigh = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].PERatio);
                $scope.quotes[idx].PERatio = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].PEGRatio);
                $scope.quotes[idx].PEGRatio = pct;//force into numbers
                pct = parseFloat($scope.quotes[idx].ShortRatio);
                $scope.quotes[idx].ShortRatio = pct;//force into numbers
                $scope.quoteCollection.push($scope.quotes[idx]);
            }
            //duplicate in cache
            $scope.cacheQuotes = $scope.quoteCollection;//save for filtering
            var descr = "All Symbols";
            if (!$scope.allSymbolMode)
                descr = $scope.watchListCollection[$scope.currentIndex].name;
            $scope.symbolTableTitle = descr + "  (" + $scope.quoteCollection.length + ")";
            console.log("YQL --> " + $scope.quoteCollection);
        }, function (err) {
            q.reject(err);
            console.log("******* Request " + url + " FAILED " + err);
        });
        return q.promise;
    }
    //--- general quote request
    function requestQuotes() {//multiple Yahoo quotes
        // var symbols = $scope.watchListCollection[$scope.currentIndex].symbols;
        if ($scope.dataProvider == 'yql') {
            requestYahooQuoteCollection($scope.watchListCollection[$scope.currentIndex].symbols);
        }
    }
    //---Read 1 Yahoo quote via HTTP using promise to regulate timing, return a promise object---
    var promises = []; //temporary holder for batch quotes
    function requestYahooQuote(symbol) {
        var q = $q.defer();
            var url =
            "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20"+
            "(%22" + symbol
            + "%22)%0A%09%09&format=json&diagnostics=true&env=http%3A%2F%2Fdatatables.org%2Falltables.env&callback=";
        $scope.startTime = performance.now();
        var promise_http = $http.get(url);
        promise_http.then(function(payload) {
            $scope.quote = payload.data;
            var quote_obj = payload.data.query.results.quote;
            var price = quote_obj.LastTradePriceOnly;//deep structure
                //console.log("Got quote for " + symbol + ", price --> " + price);
            q.resolve(quote_obj);
//TODO keep time array???????
            //keep elapsed time
            var diff = performance.now() - $scope.startTime;
                //console.log("Request Time for " + symbol + " = " + diff + "ms");
            var time_obj = new Object(); time_obj.symbol = symbol; time_obj.time = diff;
            // $scope.requestTime.push(time_obj);
        }, function(err) {
            q.reject(err); });
        promises.push(q.promise);//NOTE - must store this inside here, caller can't do this
        return q.promise;
    }
    function replaceChartHtml(symbol, bpw, bph) {
        var body_elem = angular.element('#chart-frame').contents().find('body');
        var new_body = genBodyHtml(symbol, bpw, bph, null);
        body_elem.html(new_body);
    }
    function evalPhase(quote_obj) {
        var price = quote_obj.LastTradePriceOnly;
        var d50ma = quote_obj.ChangeFromFiftydayMovingAverage;
        var d200ma = quote_obj.ChangeFromTwoHundreddayMovingAverage;
        var ma_50 = price - d50ma;  var ma_200 = price - d200ma;
        if (price >= ma_50 && ma_50 >= ma_200) return "Bullish Phase";
        else if (ma_50 >= price && price >= ma_200) return "Warning Phase";
        else if (ma_50 >= ma_200 && ma_200 >= price) return "Distribution Phase";
        else if (ma_200 >= ma_50 && ma_50 >= price) return "Bearish Phase";
        else if (ma_200 >= price && price >= ma_50) return "Recovery Phase";
        else return "Accumulation Phase";
    }
    function removePx(string_with_px) {
        var len = string_with_px.length;
        return string_with_px.substring(0, len - 2);
    }
    function reloadResizeChart() {
        var sym = "AMZN";
        if ($scope.quoteCollection.length > 0 && $scope.currentSymbolIndex >= 0)
            sym = $scope.quoteCollection[$scope.currentSymbolIndex].symbol;
        refreshChart(sym, true);
    }
    function findSymbol(symbol, list) {
        for (list_idx = 0; list_idx < list.length; list_idx++) {
            if (symbol === list[list_idx])
                return true;
        }
        return false;//not found
    }
    //produce HTML for TradingView iframe's <body> tag for given symbol
    function genBodyHtml(symbol, width, height, watchlist_symbols) {
        //format watchlist symbols into quoted string
        var watch_list = '';
        if (watchlist_symbols != null) {
            watch_list = '"watchlist": [';
            for (idx = 0; idx < watchlist_symbols.length; idx++) {
                watch_list += '"' + watchlist_symbols[idx] + '",';
            }
            watch_list += '], ';
        }
        var ret =
            '<script type="text/javascript" src="https://d33t3vvu2t2yu5.cloudfront.net/tv.js"></script>'
            + '<script type="text/javascript"> new TradingView.widget( {'
            // + '"width": 1000, "height": 400, "symbol": "' + symbol + '",'
            + '"width": ' + width + ', "symbol": "' + symbol + '", "height": ' + height + ', '
            + '"interval": "W", "timezone": "America/Los_Angeles", "theme": "White",'
            + '"style": "1", "locale": "en", "toolbar_bg": "#f1f3f6", "enable_publishing": false,'
            + '"hide_side_toolbar": false, "allow_symbol_change": true, "hideideas": true,'
            + '"show_popup_button": false, "popup_width": "1000", "popup_height": "650", '
            + watch_list
            // + '"watchlist": ["A", "AA", "Z"],'
            + '"studies": [ "MASimple@tv-basicstudies", "MASimple@tv-basicstudies",'
            + ' "CCI@tv-basicstudies" ] } );'
            + '</script>';
        return ret;
    }

    //when TradingView chart iframe is ready, call refresh chart
    $window.chartLoaded = function () {
        //change iframe width and height to BOTTOM_PANE width and height
        var bph_str = angular.element('#BOTTOM_PANE').css('height');
        var bpw_str = angular.element('#BOTTOM_PANE').css('width');
        var bph = parseFloat(bph_str.substring(0, bph_str.length - 2)) - 5;//remove px, add 5
        var bpw = parseFloat(bpw_str.substring(0, bpw_str.length - 2)) - 5;//remove px
        angular.element('#chart-frame').css('width', bpw + 'px');
        angular.element('#chart-frame').css('height', bph + 'px');
        var sym = "AMZN";
        if ($scope.watchListCollection.length > 0)
            sym = $scope.watchListCollection[$scope.currentIndex].symbols[0];
        replaceChartHtml(sym, bpw, bph);
    };
    //--- watch browser width change
    angular.element($window).bind('resize', function () {
        // console.log("----RESIZING WL MGR----");
        reloadResizeChart();
    });
}]);
YQL_URL_HEAD = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(";//up to parenthesis
YQL_URL_TAIL = ")%0A%09%09&format=json&diagnostics=true&env=http%3A%2F%2Fdatatables.org%2Falltables.env&callback=";
CHART_HIDDEN = "hidden";
CHART_HALF_VIEW = "half-view";
CHART_FULL_VIEW = "full-view";

//--- split pane support ---
var horPane = Split(['#LEFT-PANE', '#RITE-PANE'], {
    sizes: [25, 75],
    gutterSize: 4,
    minSize: 30,
    cursor: 'col-resize'
});
var vertPane = Split(['#TOP_PANE', '#BOTTOM_PANE'], {
    sizes: [40, 60],
    direction: 'vertical',
    gutterSize: 4,
    minSize: 0,
    cursor: 'row-resize'
});
//--- separate control for viewing full screen quote table
function moveSliders(left, top) {//left for horizontal, top for vertical
    horPane.setSizes([left, 100 - left]);
    vertPane.setSizes([top, 100 - top]);
}


//, "BB@tv-basicstudies" add bollinger band
//TODO somehow watch list no longer works in this piece of chart code
//TODO notify user on errors and success in a dialog instead of just debug window
//TODO plain function XYZ() can be used during startup, but not $scope.XYZ() if it's defined after startup code