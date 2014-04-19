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

service('Servers', [function() {
  this.allServers = {};
  this.colorByPercent = function(percent) {
    if (percent > 66) return 'success';
    if (percent > 33) return 'warning';
    return 'danger';
  };
  this.updateServers = function($scope) {
    var servers = [];
    var top = {
      download: 0, upload: 0
    };
    for (var ipaddr in this.allServers) {
      var server = this.allServers[ipaddr];
      if (server.upload > top.upload) top.upload = server.upload;
      if (server.download > top.download) top.download = server.download;
    }
    for (var ipaddr in this.allServers) {
      var server = this.allServers[ipaddr];
      var uploadPercent = Math.floor(server.upload / top.upload * 100);
      var downloadPercent = Math.floor(server.download / top.download * 100);
      servers.push({
        IP: ipaddr,
        upload: server.upload,
        uploadText: Math.floor(server.upload / 1024) + ' KB/s',
        uploadPercent:uploadPercent ,
        uploadColor: this.colorByPercent(uploadPercent),
        download: server.download,
        downloadText: Math.floor(server.download / 1024) + ' KB/s',
        downloadPercent: downloadPercent,
        downloadColor: this.colorByPercent(downloadPercent),
        time: server.time
      });
    }
    $scope.servers = servers;
    $scope.$apply();
  };
}]).

controller('MainController', ['$scope', 'Socket', 'Servers',
  function($scope, Socket, Servers) {
  Socket.on('connect', function() {
    Socket.emit('GiveMeTheIPAddresses');
  });
  Socket.on('HereAreTheIPAddresses', function(data) {
    console.log(data);
  });
  Socket.on('Update', function(data) {
    angular.extend(Servers.allServers, data);
    Servers.updateServers($scope);
  });
}]).

run([function() {

}]);
