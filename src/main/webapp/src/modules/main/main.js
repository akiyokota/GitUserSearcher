/**
 * Created by ayokota on 11/17/17.
 */
var app = angular.module('main', [
    'ui.router',
    'angular-loading-bar',
    'httpCaller',
    'objectFactory'
]);

app.config(['$httpProvider', function ($httpProvider) {
    //initialize get if not there
    if (!$httpProvider.defaults.headers.get) {
        $httpProvider.defaults.headers.get = {};
    }

    //disable IE ajax request caching
    $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
    // extra
    $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
    $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';
}]);

app.constant('mainConstant', {
    colRespositoryName: "repoName",
    colRepositoryUrl: "repoUrl",
    colOwnerName: "ownerName",
    colOwnerAvatar: "ownerAvatar",

    searchCriteriaUsers : "users",
    searchCriteriaRepos : "repositories",
    searchCriteriaNumStars : "numStars",

    numPagePortals : 5,

    pagePortalLeftShift : "<",
    pagePortalRightShift : ">",
    pagePortalInit : "init",

    languageList: [
        "JavaScript",
        "Python",
        "Java",
        "Ruby",
        "PHP",
        "C++",
        "CSS",
        "C#",
        "GO",
        "C",
        "TypeScript",
        "Shell",
        "Swift",
        "Scala"
    ]
});

app.controller('mainController', ['$scope', '$http', 'GitUserSearchRequest', 'httpCallerFactory', '$window', 'mainConstant'
    , function ($scope, $http, GitUserSearchRequest, httpCallerFactory, $window, mainConstant ) {

        /*** variables ***/
        $scope.userInput;
        $scope.gitRepos = [];
        $scope.constants = mainConstant;
        $scope.sortType = $scope.constants.colRespositoryName;
        $scope.sortReverse = false;
        $scope.currentPage = 0;
        $scope.orderPerPage = 5;
        $scope.numPages = 0;
        $scope.searchCriterias = [$scope.constants.searchCriteriaUsers,
            $scope.constants.searchCriteriaRepos,
            $scope.constants.searchCriteriaNumStars];
        $scope.searchCriteria = $scope.searchCriterias[0];
        $scope.pagePortals = [];
        $scope.numPagePortals = $scope.constants.numPagePortals;
        $scope.gitUserSearchRequest = undefined;
        $scope.hideAdvancedConfiguration = true;
        $scope.languageFilterList = [];
        $scope.fromNumStars = 0;
        $scope.toNumStars = 0;
        $scope.queryWithRange = false;
        /*** functions ***/

        /**
         * This is attached to search button on the main page, this function triggers
         * the call to back end and retrieve the git repository search information
         *
         * @param userInput : the input from the user on the main page
         *
         * @return callback : None, but it will populate gitRepos (list of repositories)
         *                    calculate total number of pages and set to numPages
         *                    reinitialize current page to 1
         *                    initialize page portals.
         *
         *                    In case of error from back end server, this will pop an
         *                    message with error message on it.
         */
        $scope.search = function(userInput) {
            if((userInput==undefined || userInput==null || userInput=="") &&
                !($scope.searchCriteria === $scope.constants.searchCriteriaNumStars && $scope.queryWithRange == true)) {
                alert("The input box cannot be empty!");
                return;
            }

            var input;
            if(userInput!=undefined && userInput!=null)
                input = userInput.trim();

            if($scope.searchCriteria === $scope.constants.searchCriteriaNumStars && parseInt(userInput) != userInput) {
                alert("You must type in an integer when searching with number of stars");
                return;
            }

            if($scope.searchCriteria === $scope.constants.searchCriteriaNumStars && $scope.queryWithRange == true) {
                input = $scope.fromNumStars + ".." + $scope.toNumStars;
            }

            $scope.gitUserSearchRequest = new GitUserSearchRequest(input, $scope.searchCriteria,
                                                                    1, $scope.orderPerPage, $scope.languageFilterList );
            httpCallerFactory.getUserRepoInfo($scope.gitUserSearchRequest, function(response) {
               //alert(JSON.stringify(response));
                if(response.status==200 && response.data !=null && response.data.status==="SUCCESS") {
                    var res = response.data;
                    //alert(JSON.stringify(res.gitRepos));
                    $scope.gitRepos = res.gitRepos;
                    $scope.numPages = Math.ceil(res.repoCount / $scope.orderPerPage) ;
                    $scope.currentPage = 1;
                    $scope.generatePagePortals($scope.constants.pagePortalInit);
                } else {
                    if(response.data !=null) {
                        alert(response.data.msg);
                    } else {
                        alert("An error has been returned from server with status:" + response.status);
                    }
                }

            });
        };

        /**
         * This function is attached to every git repository link from the result.
         * When user click on the link, it will ask them if they like to open the page
         * in another browser. In case of yes, the browser will open another tab and
         * display the page with the url.
         *
         * @param userInput : The url of the page that will be open
         *
         */
        $scope.openLink = function (linkUrl) {
            if ($window.confirm("Would you like to open up "
                    + linkUrl
                    + " in a new window?")) {
                $window.open(linkUrl);
            }
        };

        /**
         * This function is a soft reset for search result and configs.
         * However, this does not reset advanced results.
         */
        $scope.clear = function () {
            $scope.gitRepos=[];
            $scope.userInput='';
            $scope.currentPage = 0;
            $scope.numPages = 0;
            $scope.fromNumStars = 0;
            $scope.toNumStars = 0;
        };

        /**
         * This function generates pagination and portals
         *
         * @param shift : this determines to ship pageination portals to left right or initialization
         *
         * @return none : This function simply populates $scope.pagePortals with paging portals
         *
         */
        $scope.generatePagePortals = function (shift) {
            var newPagePortals = [];
            if(shift===$scope.constants.pagePortalInit) {
                for (var i = 1; i <= Math.min($scope.numPages, $scope.numPagePortals); i++) {
                    newPagePortals.push(i);
                }
            } else if (shift === $scope.constants.pagePortalLeftShift) {
                for(var i = 0; i < $scope.pagePortals.length; i++) {
                    var newPageNumber = $scope.pagePortals[i] - $scope.numPagePortals;
                    newPagePortals.push(newPageNumber);
                }
                if(newPagePortals.length < $scope.numPagePortals) {
                    var numMissingPagePortals = $scope.numPagePortals - newPagePortals.length;
                    for(var i = 0; i < numMissingPagePortals; i++) {
                        newPagePortals.push(newPagePortals[newPagePortals.length-1] + 1);
                    }
                }
            } else if (shift === $scope.constants.pagePortalRightShift) {
                for(var i = 0; i < $scope.pagePortals.length; i++) {
                    var newPageNumber = $scope.pagePortals[i] + $scope.numPagePortals;
                    if(newPageNumber > $scope.numPages)
                        break;
                    newPagePortals.push(newPageNumber);
                }
            }
            $scope.pagePortals = newPagePortals;
        };

        /**
         * This function goes to a page from the search result
         *
         * @param page : the page user intends to go to.
         *
         */
        $scope.goToPage = function (page) {
            if(page*$scope.orderPerPage > 1000) {
                alert("Git only allow to retrieve first 1000 search results :(");
                return;
            }

            $scope.gitUserSearchRequest.setPage(page);
            httpCallerFactory.getUserRepoInfo($scope.gitUserSearchRequest, function(response) {
                //alert(JSON.stringify(response));
                if(response.status==200 && response.data !=null && response.data.status==="SUCCESS") {
                    var res = response.data;
                    //alert(JSON.stringify(res.gitRepos));
                    $scope.gitRepos = res.gitRepos;
                    $scope.currentPage = page;
                } else {
                    if(response.data !=null) {
                        alert(response.data.msg);
                    } else {
                        alert("An error has been returned from server with status:" + response.status);
                    }
                }

            });
        };

        /**
         * This function modifies language filter configurations for searching
         *
         * @param language : the string representation of name of the language
         * @param languageValue : This determins to turn off or on depending on the value
         */
        $scope.modifyLanguageFilter = function (language, languageValue) {
            if(languageValue==true) {
                $scope.languageFilterList.push(language);
            } else {
                var index = $scope.languageFilterList.indexOf(language);
                if(index!== -1) {
                    $scope.languageFilterList.splice(index, 1);
                }
            }
        };

        // styles related
        $scope.addStyleToSelectedPage = function (pageNumber) {
            if(pageNumber === $scope.currentPage)
                return "#FF0000";
            else
                return "#000000";
        };


    }]);



app.filter('resultFilter', [ function () {
    return function (input, filterKeyword) {
        if(input == undefined || input == null || input == ""
            || filterKeyword==undefined || filterKeyword==null || filterKeyword=="")
            return input;

        var filterKeywordLower = filterKeyword.toLowerCase();
        var result = [];

        for(var i = 0; i < input.length; i++) {
            var record = input[i];

            if(record.name.toLowerCase().indexOf(filterKeywordLower) !== -1) {
                result.push(record);
            }
            else if(record.html_url.toLowerCase().indexOf(filterKeywordLower) !== -1) {
                result.push(record);
            }
            else if(record.owner.login.toLowerCase().indexOf(filterKeywordLower) !== -1) {
                result.push(record);
            }

        }
        return result;
    };
}]);

app.directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 13) {
                scope.$apply(function(){
                    scope.$eval(attrs.ngEnter, {'event': event});
                });

                event.preventDefault();
            }
        });
    };
});