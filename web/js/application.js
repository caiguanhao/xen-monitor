var XenMonApp = angular.module('xen-mon-app', [ 'ngRoute' ]).

config(['$routeProvider', '$locationProvider', '$compileProvider',
  function($routeProvider, $locationProvider, $compileProvider) {
  $routeProvider.
  when('/', {
    templateUrl: 'main',
    controller: 'MainController'
  }).
  when('/host/:host', {
    templateUrl: 'host',
    controller: 'HostController'
  }).
  when('/host/:host/vm/:vm', {
    templateUrl: 'vm',
    controller: 'VMController'
  });
  $locationProvider.html5Mode(false);
}]).

directive('body', [function() {
  return {
    restrict: 'E',
    templateUrl: 'index'
  };
}]).

directive('totalProgressBar', [function() {
  return {
    scope: {
      VMs: '=totalProgressBar',
      ip: '='
    },
    link: function($scope, elem, attrs) {
      $scope.$on('totalProgressBarChanged', function() {
        var t = $scope.$parent.type;
        elem[0].className = 'progress-bar progress-bar-'+$scope.VMs['T' + t + 'C'];
        elem.css('width', $scope.VMs['T' + t + 'P'] + '%');
        elem.text($scope.$parent.show ? $scope.VMs['T' + t + 'T'] : $scope.ip);
      });
      $scope.$emit('totalProgressBarChanged');
    }
  };
}]).

directive('progressBar', [function() {
  return {
    scope: {
      VMs: '=progressBar',
      index: '=',
      ip: '='
    },
    link: function($scope, elem, attrs) {
      $scope.$on('progressBarChanged', function() {
        var i = $scope.index, t = $scope.$parent.type;
        elem[0].className = 'progress-bar progress-bar-'+$scope.VMs[t + 'C'][i];
        elem.css('width', $scope.VMs[t + 'P'][i] + '%');
        elem.text($scope.$parent.show ? $scope.VMs[t + 'T'][i] : $scope.ip);
      });
      $scope.$emit('progressBarChanged');
    }
  };
}]).

factory('Socket', ['$window', function($window) {
  return $window.io.connect('/');
}]).

service('LocalSettings', ['$window', function($window) {
  var lskey = 'XenMonApp.LocalSettings';
  this.getLocalSettings = function(defaultSettings) {
    var LS = defaultSettings;
    try {
      var _LS;
      _LS = angular.fromJson($window.localStorage[lskey]);
      if (_LS.type !== undefined) LS.type = _LS.type;
      if (_LS.show !== undefined) LS.show = _LS.show;
      if (_LS.range !== undefined) LS.range = _LS.range;
    } catch(e) {}
    return LS;
  };
  this.saveLocalSettings = function($scope) {
    var LS = {
      type: $scope.type, show: $scope.show, range: $scope.range
    };
    try {
      $window.localStorage[lskey] = angular.toJson(LS);
    } catch(e) {
      delete $window.localStorage[lskey];
    }
  };
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
  this.formatSize = function(size) {
    if (size > 1048576) return (size / 1048576).toFixed(2) + ' MB/s';
    return (size / 1024).toFixed(2) + ' KB/s';
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
  this.topTotalDownload = 1;
  this.updateServers = function($scope, host) {
    var VMs = this.allServers[host] || {};
    var topUpload = Math.max.apply(Math, VMs.U);
    var topDownload = Math.max.apply(Math, VMs.D);

    var totalUpload = VMs.U.reduce(function(p, c) { return p + c; }, 0);
    if (totalUpload > this.topTotalUpload) this.topTotalUpload = totalUpload;
    var TUP = Math.floor(totalUpload / this.topTotalUpload * 100);

    var totalDownload = VMs.D.reduce(function(p, c) { return p + c; }, 0);
    if (totalDownload > this.topTotalDownload) this.topTotalDownload = totalDownload;
    var TDP = Math.floor(totalDownload / this.topTotalDownload * 100);

    var VM = {
      UC: [],
      UP: [],
      UT: [],

      DC: [],
      DP: [],
      DT: [],

      TU: totalUpload,
      TUC: this.colorByPercent(TUP),
      TUT: this.formatSize(totalUpload),
      TUP: TUP,

      TD: totalDownload,
      TDC: this.colorByPercent(TDP),
      TDT: this.formatSize(totalDownload),
      TDP: TDP,

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
      VM.UT.unshift(this.formatSize(VMs.U[i]));

      var downloadPercent = Math.floor(VMs.D[i] / topDownload * 100);
      var downloadColor = this.colorBySpeed(VMs.D[i]);
      VM.DP.unshift(downloadPercent || 0);
      VM.DC.unshift(downloadColor);
      VM.DT.unshift(this.formatSize(VMs.D[i]));

      c++;
    }
    VM.W = 80 / (c < 4 ? 4 : c);
    $scope.allServers = $scope.allServers || {};
    $scope.allServers[host] = VM;
    if ((+new Date) - this.lastTimeCountServersByColor > 3000) {
      this.countServersByColor($scope);
      this.lastTimeCountServersByColor = +new Date
    }
    $scope.$apply();
  };
}]).

controller('MainController', ['$scope', 'Socket', 'Servers', 'LocalSettings',
  function($scope, Socket, Servers, LocalSettings) {
  if (Socket.$events) delete Socket.$events['Update'];
  Socket.on('Update', function(host, data) {
    if (!$scope.live) return;
    Servers.allServers[host] = angular.fromJson(data);
    Servers.updateServers($scope, host);
    $scope.$broadcast('totalProgressBarChanged');
    $scope.$broadcast('progressBarChanged');
  });
  $scope.live = true;
  $scope.$watch('range', function() {
    LocalSettings.saveLocalSettings($scope);
  });
  var onShowOrTypeChanged = function() {
    LocalSettings.saveLocalSettings($scope);
    $scope.$broadcast('totalProgressBarChanged');
    $scope.$broadcast('progressBarChanged');
  };
  $scope.$watch('show', onShowOrTypeChanged);
  $scope.$watch('type', onShowOrTypeChanged);
  angular.extend($scope, LocalSettings.getLocalSettings({
    range: 4, show: 0, type: 'U'
  }));
}]).

controller('HostController', ['$scope', '$routeParams', 'Socket', 'Servers',
  function($scope, $routeParams, Socket, Servers) {
  $scope.host = $routeParams.host;

  if (Socket.$events) delete Socket.$events['Update'];
  Socket.on('Update', function(host, data) {
    if (host !== $scope.host) return;
    var stats = angular.fromJson(data);
    stats.UT = [];
    stats.DT = [];
    stats.U.forEach(function(item) {
      stats.UT.push(Servers.formatSize(item));
    });
    stats.D.forEach(function(item) {
      stats.DT.push(Servers.formatSize(item));
    });
    $scope.VMs = stats;
    $scope.$apply();
  });
}]).

controller('VMController', ['$scope', '$routeParams', 'Socket', 'Servers',
  function($scope, $routeParams, Socket, Servers) {
  $scope.host = $routeParams.host;
  $scope.vm = $routeParams.vm;
  $scope.VM = {
    UT: 'Loading...',
    DT: 'Loading...'
  };
  $scope.command = 'FORCERESTART';
  $scope.password = '1234567890';

  if (Socket.$events) {
    delete Socket.$events['Update'];
    delete Socket.$events['CommandStatus'];
  }
  Socket.on('Update', function(host, data) {
    if (host !== $scope.host) return;
    var stats = angular.fromJson(data);
    var pos = stats.K.indexOf($scope.vm);
    if (pos === -1) return;
    $scope.VM = {
      K: stats.K[pos],
      U: stats.U[pos],
      D: stats.D[pos],
      UT: Servers.formatSize(stats.U[pos]),
      DT: Servers.formatSize(stats.D[pos])
    };
    $scope.$apply();
  });
  Socket.on('CommandStatus', function(status, host) {
    switch (status) {
    case 0:
      console.log('Command has been sent to host.');
      break;
    case 1:
      alert('Invalid format of password, command or IP addresses.');
      break;
    case 2:
      alert('Cannot connect to the host ' + host + '.');
      break;
    case 3:
      alert('Timed out connecting to host ' + host + '.');
      break;
    }
  });

  $scope.btnExecuteDisabled = function() {
    return !$scope.password || $scope.password.length < 10;
  };
  $scope.execute = function() {
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (!confirm('Are you sure you want to execute this command?')) return;
    Socket.emit('ExecuteCommand', $scope.password, $scope.command,
      $scope.host, $scope.vm);
    $scope.password = null;
  };
}]).

run([function() {

}]);
