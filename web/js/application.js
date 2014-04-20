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
  this.colorBySpeed = function(speed) {
    if (speed > 2000000) return 'success';
    if (speed > 1000000) return 'warning';
    return 'danger';
  };
  this.colorByPercent = function(percent) {
    if (percent > 66) return 'success';
    if (percent > 33) return 'warning';
    return 'danger';
  };
  this.groupByIPAddress = function(data) {
    var names = Object.keys(data);
    names.sort();
    var last = names[0].lastIndexOf('.');
    if (last > 0) {
      return names[0].slice(0, last + 1) + (+names[0].slice(last + 1) - 1);
    }
    return names[0];
  };
  this.allServers = {};
  this.allServersByColor = {};
  this.lastTimeCountServersByColor = 0;
  this.countServersByColor = function($scope) {
    var cS = { success: 0, warning: 0, danger: 0 };
    for (var group_name in this.allServersByColor) {
      cS.success += this.allServersByColor[group_name].success || 0;
      cS.warning += this.allServersByColor[group_name].warning || 0;
      cS.danger += this.allServersByColor[group_name].danger || 0;
    }
    cS.total = cS.success + cS.warning + cS.danger;
    cS.successPercent = Math.floor(cS.success / cS.total * 100);
    cS.warningPercent = Math.floor(cS.warning / cS.total * 100);
    cS.dangerPercent = 100 - cS.successPercent - cS.warningPercent;
    $scope.colorStats = cS;
  };
  this.updateServers = function($scope, group_name) {
    var groupServers = this.allServers[group_name] || {};
    var servers = [];
    var top = { download: 0, upload: 0 };
    for (var ipaddr in groupServers) {
      var server = groupServers[ipaddr];
      if (server.upload > top.upload) top.upload = server.upload;
      if (server.download > top.download) top.download = server.download;
    }
    var byColor = {};
    for (var ipaddr in groupServers) {
      var server = groupServers[ipaddr];
      var uploadPercent = Math.floor(server.upload / top.upload * 100);
      var downloadPercent = Math.floor(server.download / top.download * 100);
      var uploadColor = this.colorBySpeed(server.upload);
      byColor[uploadColor] = byColor[uploadColor] || 0;
      byColor[uploadColor]++;
      servers.push({
        IP: ipaddr,
        upload: server.upload,
        uploadText: Math.floor(server.upload / 1024) + ' KB/s',
        uploadPercent: uploadPercent,
        uploadColor: uploadColor,
        download: server.download,
        downloadText: Math.floor(server.download / 1024) + ' KB/s',
        downloadPercent: downloadPercent,
        downloadColor: this.colorByPercent(downloadPercent),
        time: server.time
      });
    }
    servers.sort(function(a, b) {
      return a.IP > b.IP ? 1 : -1;
    });
    $scope.allServers = $scope.allServers || {};
    $scope.allServers[group_name] = servers;
    this.allServersByColor[group_name] = byColor;
    if ((+new Date) - this.lastTimeCountServersByColor > 3000) {
      this.countServersByColor($scope);
      this.lastTimeCountServersByColor = +new Date
    }
    $scope.$apply();
  };
}]).

controller('MainController', ['$scope', 'Socket', 'Servers',
  function($scope, Socket, Servers) {
  Socket.on('connect', function() {
    Socket.emit('GiveMeTheIPAddresses');
  });
  Socket.on('HereAreTheIPAddresses', function(data) {
    // console.log(data);
  });
  Socket.on('Update', function(data) {
    var group = Servers.groupByIPAddress(data);
    Servers.allServers[group] = data;
    Servers.updateServers($scope, group);
  });
}]).

run([function() {

}]);
