var XenMonApp = angular.module('xen-mon-app', [ 'ngRoute' ]).

config(['$routeProvider', '$locationProvider', '$compileProvider',
  function($routeProvider, $locationProvider, $compileProvider) {
  $routeProvider.
  when('/', {
    templateUrl: 'main',
    controller: 'MainController'
  });
  $locationProvider.html5Mode(true);
}]).

directive('body', [function() {
  return {
    restrict: 'E',
    templateUrl: 'index'
  };
}]).

factory('Socket', ['$window', function($window) {
  return $window.io.connect('/');
}]).

controller('MainController', ['$scope', 'Socket', function($scope, Socket) {
  $scope.servers = {};

  Socket.on('connect', function() {
    Socket.emit('GiveMeTheIPAddresses');
  });
  Socket.on('HereAreTheIPAddresses', function(data) {
    console.log(data);
  });
  Socket.on('Update', function(data) {
    angular.extend($scope.servers, data);
    $scope.$apply();
  });
}]).

run([function() {

}]);
