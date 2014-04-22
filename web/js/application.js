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
  this.rangeBySpeed = function(speed) {
    if (speed > 11534336) return 11;
    if (speed > 10485760) return 10;
    if (speed > 9437184) return 9;
    if (speed > 8388608) return 8;
    if (speed > 7340032) return 7;
    if (speed > 4194304) return 4;
    return 0;
  };
  this.allServers = {};
  this.lastTimeCountServersByColor = 0;
  this.countServersByColor = function($scope) {
    var cS = { success: 0, warning: 0, danger: 0 };
    var rS = { 11: 0, 10: 0, 9: 0, 8: 0, 7: 0, 4: 0, 0: 0 };
    for (var host in $scope.allServers) {
      var VMs = $scope.allServers[host]
      for (var i = 0; i < VMs.UC.length; i++) {
        cS[VMs.UC[i]]++;
        rS[VMs.R]++;
      }
    }
    cS.total = cS.success + cS.warning + cS.danger;
    cS.successPercent = Math.floor(cS.success / cS.total * 100);
    cS.warningPercent = Math.floor(cS.warning / cS.total * 100);
    cS.dangerPercent = 100 - cS.successPercent - cS.warningPercent;
    $scope.colorStats = cS;
    $scope.rangeStats = rS;
  };
  this.topTotalUpload = 1;
  this.updateServers = function($scope, host) {
    var VMs = this.allServers[host] || {};
    var topUpload = Math.max.apply(Math, VMs.U);
    var totalUpload = VMs.U.reduce(function(p, c) { return p + c; }, 0);
    if (totalUpload > this.topTotalUpload) this.topTotalUpload = totalUpload;
    var TUP = Math.floor(totalUpload / this.topTotalUpload * 100);
    var VM = {
      UC: [],
      UP: [],
      TU: totalUpload,
      TUC: this.colorByPercent(TUP),
      TUP: TUP,
      K: VMs.K,
      W: 100,
      R: this.rangeBySpeed(totalUpload)
    };
    var i, c = 0;
    for (i = VMs.K.length - 1; i > -1 ; i--) {
      if (!/^[0-9.]+$/.test(VMs.K[i])) {
        VMs.K.splice(i, 1);
        VMs.U.splice(i, 1);
        VMs.D.splice(i, 1);
        continue;
      }
      var uploadPercent = Math.floor(VMs.U[i] / topUpload * 100);
      var uploadColor = this.colorBySpeed(VMs.U[i]);
      VM.UP.unshift(uploadPercent || 0);
      VM.UC.unshift(uploadColor);
      c++;
    }
    VM.W = 100 / (c + 1);
    $scope.allServers = $scope.allServers || {};
    $scope.allServers[host] = VM;
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
  Socket.on('Update', function(host, data) {
    if (!$scope.live) return;
    Servers.allServers[host] = JSON.parse(data);
    Servers.updateServers($scope, host);
  });
  $scope.range = 4;
  $scope.live = true;
}]).

run([function() {

}]);
