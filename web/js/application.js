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

run(['$interval', '$rootScope', function($interval, $rootScope) {
  $interval(function() {
    $rootScope.$broadcast('anotherSecond');
  }, 1000);
}]).

filter('cmdreplace', [function() {
  return function(src, text) {
    if (typeof src !== 'string') return src;
    return src.replace(/{}/g, text);
  };
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

directive('freezeProgressBar', [function() {
  return {
    scope: {
      freeze: '=freezeProgressBar'
    },
    link: function($scope, elem, attrs) {
      var f = $scope.freeze;
      if (f.pBarWidth) elem.css('width', f.pBarWidth + '%');
      $scope.$on('anotherSecond', function() {
        if (!f.wait) return;
        var elapsed = Math.round((+new Date - f.time) / 1000);
        var onemore = (f.wait + 1) / f.wait * 100; // delay one more second
        if (f.pBarWidth !== onemore) {
          f.pBarWidth = Math.min(elapsed / f.wait * 100, onemore);
        }
        elem.css('width', f.pBarWidth + '%');
        f.elapsed = +elapsed.toFixed(0);
        var actual = $scope.$parent.VMs[f.expectOnKey][$scope.$parent.index];
        if (f.pBarWidth === onemore) {
          if (actual === f.original) {
            f.message = 'It seems command {} was not executed successfully.'
            f.messageColor = 'danger';
          }
          f.frozen = false;
          f.elapsed = 0;
          f.wait = 0;
        }
        if (actual !== f.original) {
          elem.css('width', '100%');
          f.pBarWidth = onemore;
          f.message = 'Command {} was executed successfully.'
          f.messageColor = 'success';
        }
      });
    }
  }
}]).

directive('focus', [function() {
  return function($scope, elem, attrs) {
    $scope.$on(attrs.focus, function() {
      setTimeout(function() {
        elem[0].focus();
      }, 0);
    });
  }
}]).

directive('search', [function() {
  return {
    scope: {
      search: '='
    },
    link: function($scope, elem, attrs) {
      $scope.$on('newSearch', function() {
        var s = $scope.$parent.cached.search;
        if (!s || $scope.search.indexOf(s) > -1) {
          elem.removeClass('not-matched');
        } else {
          elem.addClass('not-matched');
        }
      });
      $scope.$emit('newSearch');
    }
  }
}]).

factory('Socket', ['$window', 'ASSETS', function($window, ASSETS) {
  var socket = $window.io.connect('/', {
    'force new connection': true,
    'reconnect': true,
    'reconnection delay': 1000,
    'reconnection limit': 5000,
    'max reconnection attempts': 10000
  });
  socket.on('CheckAssetsVersion', function(data) {
    if (typeof data !== 'object' || typeof ASSETS !== 'object') {
      return;
    }
    if (angular.equals(ASSETS, {})) return;
    if (angular.equals(data, {})) return;
    var assetsHasChanged = !angular.equals(data, ASSETS);
    if (assetsHasChanged) {
      // prevent reload loop
      var r = $window.localStorage['XenMonApp.LTRELOAD'];
      $window.localStorage['XenMonApp.LTRELOAD'] = new Date;
      if (r && (new Date() - new Date(r)) > 5000) {
        $window.location.reload();
      }
    }
  });
  return socket;
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
  this.cached = {
    live: true
  };
}]).

service('Servers', [function() {
  this.POWERSTATES = {
    U: 'Unknown',
    R: 'Running',
    H: 'Halted',
    P: 'Paused',
    S: 'Suspended'
  };
  this.COMMANDS = {
    C: [ 'FORCERESTART', 'RESTART', 'FORCESHUTDOWN', 'SHUTDOWN', 'START' ],
    T: [ 'Force Restart', 'Restart', 'Force Shutdown', 'Shutdown', 'Start' ],
    W: [ 30, 60, 10, 35, 30 ], // wait n seconds
    E: [ 'I', 'I', 'PS', 'PS', 'PS' ] // expect key to change
  };
  this.colorBySpeed = function(speed) {
    if (speed > 2048000) return 'success';
    if (speed > 1024000) return 'warning';
    if (speed < 102400) return 'dead';
    return 'danger';
  };
  this.colorByPercent = function(percent) {
    if (percent > 66) return 'success';
    if (percent > 33) return 'warning';
    if (percent < 10) return 'dead';
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
  this.freezeVMs = {};
  this.allServers = {};
  this.colorStats = {};
  this.rangeStats = {};
  this.totalStats = {};
  this.lastTimeCountServersByColor = 0;
  this.countServersByColor = function() {
    var cS = this.colorStats;
    var rS = this.rangeStats;
    var tS = this.totalStats;
    cS.success = 0; cS.warning = 0; cS.danger = 0; cS.dead = 0;
    rS['11']   = 0; rS['10']   = 0; rS['9']   = 0; rS['8'] = 0;
    rS['7']    = 0; rS['4']    = 0; rS['0']   = 0;
    tS.HC      = 0; tS.VMC     = 0; tS.U      = 0; tS.D    = 0;
    for (var host in this.allServers) {
      var VMs = this.allServers[host]
      for (var i = 0; i < VMs.UC.length; i++) {
        cS[VMs.UC[i]]++;
        rS[VMs.R]++;
        tS.VMC++;
      }
      tS.U += VMs.TU;
      tS.D += VMs.TD;
      tS.HC++;
    }
    cS.total = cS.success + cS.warning + cS.danger + cS.dead;
    cS.successPercent = +(cS.success / cS.total * 100).toFixed(2);
    cS.warningPercent = +(cS.warning / cS.total * 100).toFixed(2);
    cS.dangerPercent = +(cS.danger / cS.total * 100).toFixed(2);
    cS.deadPercent = 100 - cS.successPercent - cS.warningPercent -
      cS.dangerPercent;
    tS.UT = this.formatSize(tS.U);
    tS.UHA = this.formatSize(tS.U / tS.HC);
    tS.UVMA = this.formatSize(tS.U / tS.VMC);
    tS.DT = this.formatSize(tS.D);
    tS.DHA = this.formatSize(tS.D / tS.HC);
    tS.DVMA = this.formatSize(tS.D / tS.VMC);
  };
  this.topTotalUpload = 1;
  this.topTotalUploadTime = 0;
  this.topTotalDownload = 1;
  this.topTotalDownloadTime = 0;
  var MAXSPEED = 15728640; // 15M
  this.sum = function(p, c) {
    return p + (c > MAXSPEED ? MAXSPEED : c); // ignore insanely large number
  };
  this.updateServers = function(host, data) {
    this.allServers[host] = data;
    var VM = this.allServers[host];
    if (!VM) return;

    var topUpload = Math.max.apply(Math, VM.U);
    if (topUpload > MAXSPEED) topUpload = MAXSPEED;
    var topDownload = Math.max.apply(Math, VM.D);
    if (topDownload > MAXSPEED) topDownload = MAXSPEED;

    var totalUpload = VM.U.reduce(this.sum, 0);
    if (totalUpload > this.topTotalUpload) {
      this.topTotalUpload = totalUpload;
    }
    var TUP = Math.floor(totalUpload / this.topTotalUpload * 100);

    var totalDownload = VM.D.reduce(this.sum, 0);
    if (totalDownload > this.topTotalDownload) {
      this.topTotalDownload = totalDownload;
    }
    var TDP = Math.floor(totalDownload / this.topTotalDownload * 100);

    VM.UC  = [];
    VM.UP  = [];
    VM.UT  = [];

    VM.DC  = [];
    VM.DP  = [];
    VM.DT  = [];

    VM.PS  = [];

    VM.TU  = totalUpload;
    VM.TUC = this.colorByPercent(TUP);
    VM.TUT = this.formatSize(totalUpload);
    VM.TUP = TUP;

    VM.TD  = totalDownload;
    VM.TDC = this.colorByPercent(TDP);
    VM.TDT = this.formatSize(totalDownload);
    VM.TDP = TDP;

    VM.W   = 100;
    VM.R   = this.rangeBySpeed(totalUpload);

    var i, c = 0;
    for (i = VM.K.length - 1; i > -1 ; i--) {
      if (!/^[0-9.]+$/.test(VM.K[i])) {
        VM.K.splice(i, 1);
        VM.U.splice(i, 1);
        VM.D.splice(i, 1);
        continue;
      }

      var uploadPercent = Math.floor(VM.U[i] / topUpload * 100);
      var uploadColor = this.colorBySpeed(VM.U[i]);
      VM.UP.unshift(uploadPercent || 0);
      VM.UC.unshift(uploadColor);
      VM.UT.unshift(this.formatSize(VM.U[i]));

      var downloadPercent = Math.floor(VM.D[i] / topDownload * 100);
      var downloadColor = this.colorBySpeed(VM.D[i]);
      VM.DP.unshift(downloadPercent || 0);
      VM.DC.unshift(downloadColor);
      VM.DT.unshift(this.formatSize(VM.D[i]));

      VM.PS.unshift(this.POWERSTATES[VM.S[i]] || this.POWERSTATES.U);

      c++;
    }
    VM.W = 80 / (c < 4 ? 4 : c);

    var now = +new Date;
    if (now - this.lastTimeCountServersByColor > 3000) {
      this.countServersByColor();
      this.lastTimeCountServersByColor = now;
    }
    if (now - this.topTotalUploadTime > 20000) {
      this.topTotalUpload = 0;
      this.topTotalUploadTime = now;
    }
    if (now - this.topTotalDownloadTime > 20000) {
      this.topTotalDownload = 0;
      this.topTotalDownloadTime = now;
    }
  };
}]).

controller('MainController', ['$scope', 'Socket', 'Servers', 'LocalSettings',
  '$timeout',
  function($scope, Socket, Servers, LocalSettings, $timeout) {
  $scope.allServers = Servers.allServers;
  $scope.colorStats = Servers.colorStats;
  $scope.rangeStats = Servers.rangeStats;
  $scope.totalStats = Servers.totalStats;
  $scope.cached = LocalSettings.cached;
  $timeout(function() {
    $scope.$broadcast('newSearch');
  }, 0);

  if (Socket.$events) delete Socket.$events['Update'];
  Socket.on('Update', function(host, data) {
    if (!$scope.cached.live) return;
    Servers.updateServers(host, angular.fromJson(data));
    $scope.$apply();
    if ($scope.cached.search) $scope.$broadcast('newSearch');
    $scope.$broadcast('totalProgressBarChanged');
    $scope.$broadcast('progressBarChanged');
  });
  $scope.$watch('range', function() {
    LocalSettings.saveLocalSettings($scope);
  });
  var onShowOrTypeChanged = function() {
    LocalSettings.saveLocalSettings($scope);
    $scope.$broadcast('totalProgressBarChanged');
    $scope.$broadcast('progressBarChanged');
  };
  $scope.$watch('show', onShowOrTypeChanged);
  var TYPES = { D: 'download', U: 'upload' };
  $scope.$watch('type', function(val) {
    $scope.typetext = TYPES[val];
    onShowOrTypeChanged();
  });
  $scope.$watch('cached.search', function(val) {
    if (val === undefined) return;
    $scope.range = 'all';
    $scope.$broadcast('newSearch');
  });
  $scope.openSearch = function(val) {
    $scope.cached.opensearch = !$scope.cached.opensearch;
    if ($scope.cached.opensearch === false) {
      $scope.cached.search = null;
    } else {
      $scope.cached.live = false;
    }
    $scope.$emit('focusSearch');
  }
  angular.extend($scope, LocalSettings.getLocalSettings({
    range: 4, show: 0, type: 'U'
  }));
}]).

controller('HostController', ['$scope', '$routeParams', 'Socket', 'Servers',
  function($scope, $routeParams, Socket, Servers) {
  $scope.host = $routeParams.host;
  $scope.VMs = Servers.allServers[$scope.host];

  if (Socket.$events) delete Socket.$events['Update'];
  Socket.on('Update', function(host, data) {
    Servers.updateServers(host, angular.fromJson(data));
    if (host === $scope.host) {
      $scope.VMs = Servers.allServers[host];
      $scope.$apply();
    }
  });
}]).

controller('VMController', ['$scope', '$routeParams', 'Socket', 'Servers',
  function($scope, $routeParams, Socket, Servers) {
  $scope.host = $routeParams.host;
  $scope.vm = $routeParams.vm;
  $scope.commands = Servers.COMMANDS;
  $scope.command = 0;
  $scope.VMs = Servers.allServers[$scope.host];
  $scope.index = -1;
  if ($scope.VMs) $scope.index = $scope.VMs.K.indexOf($scope.vm);
  Servers.freezeVMs[$scope.vm] = Servers.freezeVMs[$scope.vm] || {};
  $scope.freeze = Servers.freezeVMs[$scope.vm];

  if (Socket.$events) {
    delete Socket.$events['Update'];
    delete Socket.$events['CommandStatus'];
  }
  Socket.on('Update', function(host, data) {
    Servers.updateServers(host, angular.fromJson(data));
    var stats = angular.fromJson(data);
    if (host === $scope.host) {
      var VMs = Servers.allServers[host];
      var index = VMs.K.indexOf($scope.vm);
      if (index === -1) return;
      $scope.VMs = VMs;
      $scope.index = index;
      $scope.$apply();
    }
  });
  Socket.on('CommandFailed', function(host) {
    var newfreeze = {
      message: 'Cannot connect to the host {}.'.replace(/{}/g, host),
      messageColor: 'danger'
    };
    Servers.freezeVMs[$scope.vm] = newfreeze;
    $scope.freeze = newfreeze;
    $scope.$apply();
  });

  $scope.btnExecuteDisabled = function() {
    return !$scope.password || $scope.password.length < 10;
  };
  $scope.execute = function() {
    if ($scope.index < 0) return alert('Not ready yet.');
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (!confirm('Are you sure you want to execute this command?')) return;
    var cmdindex = $scope.command;
    var command = Servers.COMMANDS.C[cmdindex];
    var commandText = Servers.COMMANDS.T[cmdindex];
    Socket.emit('ExecuteCommand', $scope.password, command,
      $scope.host, $scope.vm);
    $scope.password = null;
    $scope.freeze.time = (+new Date);
    $scope.freeze.wait = Servers.COMMANDS.W[cmdindex];
    $scope.freeze.elapsed = 0;
    $scope.freeze.frozen = true;
    $scope.freeze.pBarWidth = 0;
    $scope.freeze.commandText = commandText;
    $scope.freeze.message = 'Command {} has been sent. Please wait a moment.';
    $scope.freeze.messageColor = 'info';
    var expectOnKey = Servers.COMMANDS.E[cmdindex];
    var orignal = $scope.VMs[expectOnKey][$scope.index];
    $scope.freeze.expectOnKey = expectOnKey;
    $scope.freeze.original = orignal;
  };
}]).

run([function() {

}]);
