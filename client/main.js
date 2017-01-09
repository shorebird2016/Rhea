//--- AngularJS portion ---
var app = angular.module('stkApp', [])
    .controller('stkCtrl', function ($scope, $http, $q, $window, $timeout) {
        //---data structures---
        // $scope.chartUrl = "chart1.html";
        // $scope.quoteCollection = [];//for actvie watch list symbols
        // $scope.cacheQuotes = [];//duplicate for quoteCollection used by filtering
        // $scope.percentClass = "percent-green";
        $scope.filterPhase = "Any Phase";
        $scope.filterMA = "None";
        $scope.filterRange = "";
        $scope.chartVisible = true;
        $scope.watchListHeight = $window.innerHeight;// * 5 / 10;//watched by upper list/table
        $scope.sortType = "symbol"; $scope.sortDir = true;
        $scope.dataProvider = "yql";
        $scope.allSymbolMode = false;
        $scope.symbolTableTitle = "";
        $scope.tempSymbol = "";//used for edit stock symbol
        $scope.activeWatchlist = null;
        $scope.chartMode = CHART_HALF_VIEW;
        $scope.contentHeight = $window.innerHeight - 55;//exclude navbar
        $scope.histSymbols = [];
    })//---END controller---
;//---END module---

//--- jQuery portion ---
$(document).ready(function() {
    //click new row removes highlight on previous row, and highlight current row via "active" class
    // $('.list-group-item').click(function() {
    //     $('.list-group').find('.active').removeClass('active');//remove highlight from last active watch list
    //     $(this).addClass('active');//set new one active
    // });
    //tooltip
    $('body').tooltip( {
        selector: "[data-tooltip = tooltip]",  container: "body"
    });
});
