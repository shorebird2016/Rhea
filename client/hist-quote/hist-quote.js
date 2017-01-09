//----- controller code for historical quotes tab -----
angular.module('stkApp')
    .controller('histQuoteCtrl', ['$scope', '$http', '$q', '$window', function ($scope, $http, $q, $window) {
        //-- visual helpers --
        $scope.deleteNone = true;//initially nothing to delete
        //if any checkbox is checked, enable button, othwerwise disable button
        $scope.enableDelete = function () {
            $scope.deleteNone = true;
            for (var idx in $scope.histQuoteSummary) {
                if ($scope.histQuoteSummary[idx].toDelete) {
                    $scope.deleteNone = false;
                    return;
                }
            }
        };
        $scope.createQuotes = function () {
            var syms = $scope.quoteSymbolEntry.toUpperCase();//comma separated list
            //split into array of symbols, and check errors
            var sym_list = syms.split(/[\s,]/);
            var promises = [];
            for (var idx in sym_list)
                promises.push($http.post('/hist-quote/' + sym_list[idx]));
            $q.all(promises).then(function (payload) {
                console.log("[Ok] Created quotes for "+ syms);
                console.dir(payload.data);
            }, function (err) {
                throw err;//TODO
            }).then(function (syms) {
                retrieveSymbols();//refresh the symbol list
                $scope.quoteSymbolEntry = "";
            });
        };
        function retrieveSymbols() {
            $http.get('/hist-quote').then(function (payload) {
                console.log("[Ok] Retrieved " + payload.data.length + " symbols");
                payload.data.sort();
                $scope.histQuoteSummary = [];
                for (var idx in payload.data)
                    $scope.histQuoteSummary.push({symbol: payload.data[idx], count: 0, recentDate: "", toDelete: false});
                return payload.data;//for next "then"
            }, function (err) {
                if (err) throw err;//TODO combine into 1 catch at end
            }).then(function (symbol_list) {
                //use an array of promises to track queries from all symbols
                var query_promises = [];
                for (var idx in symbol_list) {
                    var prms = $http.get('/hist-quote/doc-count/' + symbol_list[idx]);
                    query_promises.push(prms);
                }
                //wait for all counts to be filled from DB request
                $q.all(query_promises).then(function (payload) {//contains an array of counts in string format
                    for (var idx in payload) {
                        var rec_cnt = parseInt(payload[idx].data);
                        $scope.histQuoteSummary[idx].count = rec_cnt;
                    }
                    console.log(payload);
                    return symbol_list;
                }, function (err) {
                    throw err;//TODO combine into 1 catch at end
                }).then(function (symbol_list) {//from prev stage
                    var query_promises = [];
                    for (var idx in symbol_list) {
                        var prms = $http.get('/hist-quote/recent-date/' + symbol_list[idx]);
                        query_promises.push(prms);
                    }
                    $q.all(query_promises).then(function (payload) {//array of dates returned
                        for (var idx in payload) {
                            $scope.histQuoteSummary[idx].recentDate = payload[idx].data;
                        }
                        console.dir(payload);
                        retrieveQuotes(symbol_list[0]);//use first symbol in the list
                    })
                })
            })
        }
        function handleResize() {
            //--- resize column container heights to match browser height
            var ht = $window.innerHeight - 55 - 55;//TODO determine percise values
            angular.element('#QUOTE-SYMBOLS-PANE').css('height', ht + 'px');
            angular.element('#CHART-QUOTE-PANE').css('height', ht + 'px');
        }

        //---------- RESTful API ---------
        //-- R (of C R U D) quotes for given symbol (2 year back)//TODO variable query size
        function retrieveQuotes(symbol) {
            $http.get('/hist-quote/' + symbol).then(function (payload) {
                var size = payload.data.length;
                console.log("[Ok] Got " + size + " quotes for " + symbol);
                //save last 10 quotes for table
                $scope.histQuotes = [];
                for (idx = size-1; idx > size-11; idx--)
                    $scope.histQuotes.push(payload.data[idx]);
                //payload.data contains array of EOD quotes
                //convert date from YYYY-MM-DD to msec since 1970 in [ [date, close], []...] format
                var hc_data = [];
                for (idx = 0; idx < size; idx++) {
                    var hc_elem = [];
                    hc_elem.push(Date.parse(payload.data[idx].tradingDay));
                    hc_elem.push(payload.data[idx].close);
                    hc_data.push(hc_elem);
                }
//TODO for candle chart, volume not working
                //prepare data to display - date, open, high, low, close, volume
                // var ohlc_data = [], vol_data = [];//array of arrays for highstock
                // for (idx = 0; idx < size; idx++) {
                //     var ohlc = [];
                //     ohlc.push(Date.parse(payload.data[idx].tradingDay));
                //     ohlc.push(payload.data[idx].open);
                //     ohlc.push(payload.data[idx].high);
                //     ohlc.push(payload.data[idx].low);
                //     ohlc.push(payload.data[idx].close);
                //     ohlc_data.push(ohlc);
                //     var vol = [];
                //     vol.push(Date.parse(payload.data[idx].tradingDay));
                //     vol.push(payload.data[idx].volume);
                //     vol_data.push(vol);
                // }
                // var gunit = [['week', [1]], ['month', [1,2,3,4,5]] ];

                //plot on chart
                Highcharts.stockChart('HICHART-CANVAS', {
                    rangeSelector: {enabled: true},
                    scrollbar: {enabled: 1},
                    title: {text: symbol + " (daily)"}, navigator: {enabled: false},
                    xAxis: {labels: {enabled: true}},
                    exporting: {enabled: true},
                    tooltip: {enabled: true},
//TODO for candle chart, volume not working
                    /*                   series: [ {//first set - candle bars
                     name: symbol,
                     type: 'candlestick',
                     tooltip: {valueDecimals: 2},
                     data: ohlc_data
                     }/!*, {//second series - volume bars
                     type: 'column',
                     name: 'Volume',
                     data: vol_data
                     }*!/]
                     */
                    series: [{
                        name: symbol,
                        data: hc_data,
                        tooltip: {valueDecimals: 2}
                    }]
                });
            })
        }
        $scope.findQuoteSymbol = function () {
            for (var idx in $scope.histQuotes) {
                var sym = $scope.quoteSymbolSearchEntry;
                if ($scope.histQuotes[idx].symbol == sym) {
//TODO scroll the row into view, highlight the row
                }
            }
        };
        $scope.updateQuotes = function () {
            //for each symbol, perform a PUT request, keep results in promises
            var promises = [];
            for (var idx in $scope.histQuoteSummary)
                promises.push($http.put('/hist-quote/' + $scope.histQuoteSummary[idx].symbol
                    + "/" + $scope.histQuoteSummary[idx].recentDate));
            $q.all(promises).then(function (payload) {
                for (var idx in payload) {
                    console.log(payload[idx].data);
                }
//TODO refresh quote symbol table and quote table
            }, function (err) {
                throw err;
            })
        };
        $scope.refreshChart = function (row_index) {//for line chart on quote manager tab
            retrieveQuotes($scope.histQuoteSummary[row_index].symbol);
            $scope.selectedQuoteSymbolIndex = row_index;
        };
        $scope.deleteSymbols = function () {
            var symbol_list = [];
            for (var idx1 in $scope.histQuoteSummary) {
                if ($scope.histQuoteSummary[idx1].toDelete)
                    symbol_list.push($scope.histQuoteSummary[idx1].symbol);
            }
            var promises = [];
            for (var idx in symbol_list) {
                var sym = symbol_list[idx];
                promises.push($http.delete('/hist-quote/' + sym));
            }
            $q.all(promises).then(function (payload) {
                console.log(payload.data);
                retrieveSymbols();//refresh list
            }, function (err) {
                throw err;
            })
        };

        //-- browser related actions --
        //browser resizing - NOTE multiple handler is allowed
        angular.element($window).bind('resize', function () {
            // console.log("----RESIZING QUOTE MGR----");
            handleResize();
        });

        //-- startup code --
        retrieveSymbols(); handleResize();
    }]);
