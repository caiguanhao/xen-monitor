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
  }).
  when('/edit-lists', {
    templateUrl: 'edit-lists',
    controller: 'EditListsController'
  }).
  when('/rdp', {
    templateUrl: 'rdp'
  });
  $locationProvider.html5Mode(false);
  var whiteList = /^\s*(https?|ftp|mailto|tel|file|xen-monitor-rdp):/;
  $compileProvider.aHrefSanitizationWhitelist(whiteList);
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

directive('navbarLink', ['$location', function($location) {
  return function($scope, elem, attrs) {
    $scope.$on('$routeChangeSuccess', function(event, current, previous) {
      var links = elem.find('a');
      if (links.length === 0) return;
      var href = links[0].getAttribute('href').replace(/^\/#!?/, '');
      var url = $location.url();
      if (url.substr(0, href.length) === href) {
        elem.addClass('active');
      } else {
        elem.removeClass('active');
      }
    });
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
      if (!f) return;
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
        var actual;
        if (f.expectOnKey) {
          actual = $scope.$parent.VMs[f.expectOnKey][$scope.$parent.index];
        }
        if (f.pBarWidth === onemore) {
          if (actual !== undefined && actual === f.original) {
            f.message = 'It seems command {} was not executed successfully.'
            f.messageColor = 'danger';
          } else if (actual === undefined) {
            f.message = null;
            f.messageColor = null;
          }
          f.frozen = false;
          f.elapsed = 0;
          f.wait = 0;
        }
        if (actual !== undefined && actual !== f.original) {
          elem.css('width', '100%');
          f.pBarWidth = onemore;
          f.message = 'Command {} was executed successfully.'
          f.messageColor = 'success';
        }
      });
    }
  }
}]).

directive('mlink', ['$parse', function($parse) {
  return function($scope, elem, attrs) {
    $scope.$on('changeMLink', function() {
      elem.unbind('click');
      var type = $scope.mclick
      if (type === 'rdp') {
        elem.attr('href', attrs.rdp);
      } else if (type === 'check') {
        elem.attr('href', '');
        elem.bind('click', function(e) {
          e.preventDefault();
          $parse(attrs.check)($scope);
        });
      } else {
        elem.attr('href', attrs.default);
      }
    });
    $scope.$emit('changeMLink');
  };
}]).

directive('clickToSelectAll', [function() {
  return function($scope, elem, attrs) {
    elem.on('click', function() {
      elem.attr('contenteditable', true);
      document.execCommand('selectAll', false, null);
      elem.attr('contenteditable', false);
    });
  };
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
        var match = false;
        if (s) {
          var ss = s.split(/\s+/);
          for (var i = 0; i < ss.length; i++) {
            if ($scope.search.indexOf(ss[i]) > -1) {
              match = true;
              break;
            }
          }
        }
        if (!s || match) {
          elem.removeClass('not-matched');
        } else {
          elem.addClass('not-matched');
        }
      });
      $scope.$emit('newSearch');
    }
  }
}]).

factory('Socket', ['$window', 'ASSETS', 'LocalSettings',
  function($window, ASSETS, LocalSettings) {
  var socket = $window.io.connect('/', {
    'force new connection': true,
    'reconnect': true,
    'reconnection delay': 1000,
    'reconnection limit': 5000,
    'max reconnection attempts': 10000
  });
  socket.on('CheckAssetsVersion', function(data, lists) {
    LocalSettings.parseLists(lists);
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
      if (_LS.mclick !== undefined) LS.mclick = _LS.mclick;
    } catch(e) {}
    return LS;
  };
  this.saveLocalSettings = function($scope) {
    var LS = {
      type: $scope.type, show: $scope.show, range: $scope.range,
      mclick: $scope.mclick
    };
    try {
      $window.localStorage[lskey] = angular.toJson(LS);
    } catch(e) {
      delete $window.localStorage[lskey];
    }
  };
  this.getSearch = function($scope) {
    $scope.cached.search = $window.localStorage[lskey + '.Search'];
    if ($scope.cached.search) $scope.cached.opensearch = true;
  };
  this.saveSearch = function($scope) {
    if (typeof $scope.cached.search === 'string') {
      $window.localStorage[lskey + '.Search'] = $scope.cached.search;
    } else {
      delete $window.localStorage[lskey + '.Search'];
    }
  };
  this.rawLists = '';
  this.lists = {};
  this.parseListsCallback = null;
  this.parseLists = function(lists) {
    if (typeof lists !== 'string') return;
    this.lists = {
      K: [],
      V: []
    };
    this.rawLists = lists;
    var matches = lists.split(/:$/m);
    var mi = matches.map(function(t) { return t.match(/\n(.*)$/); });
    if (matches.length > 1) {
      this.lists.K.push(matches[0].trim() || '(noname)');
      for (var i = 1; i < matches.length - 1; i++) {
        this.lists.K.push(mi[i][1].trim() || '(noname)');
        var v = matches[i].slice(0, (mi[i]||{}).index || undefined);
        this.lists.V.push(v.replace(/[\t\s\r\n]+/g, ' ').trim());
      }
      this.lists.V.push(matches[i].replace(/[\t\s\r\n]+/g, ' ').trim());
    }
    if (this.parseListsCallback) this.parseListsCallback();
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
    W: [ 35, 60, 15, 35, 30 ], // wait n seconds
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
  this.colorByPowerState = function(powerState) {
    switch (powerState) {
    case 'R': return 'success';
    case 'H': return 'danger';
    case 'P': return 'danger';
    case 'S': return 'danger';
    default:  return 'dead';
    }
  };
  this.colorTypes = function(colors, color) {
    var cT = [];
    colors = colors.toString() + ',' + color;
    if (colors.indexOf('warning') > -1) cT.push('warning');
    if (colors.indexOf('danger') > -1) cT.push('danger');
    if (colors.indexOf('dead') > -1) cT.push('dead');
    return cT;
  };
  this.rangeBySpeed = function(speed) {
    if (speed > 12582912) return 12;
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
  this.freeze = function(object, cmdindex) {
    object.time = (+new Date);
    object.wait = this.COMMANDS.W[cmdindex];
    object.elapsed = 0;
    object.frozen = true;
    object.pBarWidth = 0;
    object.commandText = this.COMMANDS.T[cmdindex];
    object.message = 'Command {} has been sent. Please wait a moment.';
    object.messageColor = 'info';
  };
  this.freezeVMs = {};
  this.freezeHosts = {};
  this.checkedVMs = {};
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
    rS['12']   = 0; rS['11']   = 0; rS['10']  = 0; rS['9'] = 0;
    rS['8']    = 0; rS['7']    = 0; rS['4']   = 0; rS['0'] = 0;
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
  var MAXSPEED = 13421772; // 12.8M
  this.updateServers = function(host, data) {
    this.allServers[host] = data;
    var VM = this.allServers[host];
    if (!VM) return;

    var length = VM.K.length;

    var i, totalUpload = 0, totalDownload = 0;
    for (i = 0; i < length; i++) {
      VM.U[i] = VM.U[i] > MAXSPEED ? MAXSPEED : VM.U[i];
      VM.D[i] = VM.D[i] > MAXSPEED ? MAXSPEED : VM.D[i];
      totalUpload += VM.U[i];
      totalDownload += VM.D[i];
    }

    if (totalUpload > this.topTotalUpload) {
      this.topTotalUpload = totalUpload;
    }
    if (totalDownload > this.topTotalDownload) {
      this.topTotalDownload = totalDownload;
    }
    var TUP = Math.floor(totalUpload / this.topTotalUpload * 100);
    var TDP = Math.floor(totalDownload / this.topTotalDownload * 100);

    var topUpload = Math.max.apply(Math, VM.U);
    var topDownload = Math.max.apply(Math, VM.D);

    VM.UC  = [];
    VM.UP  = [];
    VM.UT  = [];

    VM.SC  = '';

    VM.DC  = [];
    VM.DP  = [];
    VM.DT  = [];

    VM.PS  = [];
    VM.PSC  = [];

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
    for (i = length - 1; i > -1 ; i--) {
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

      var PS = this.POWERSTATES[VM.S[i]] ? VM.S[i] : 'U';
      VM.PS.unshift(this.POWERSTATES[PS]);
      VM.PSC.unshift(this.colorByPowerState(PS));

      c++;
    }
    VM.SC = this.colorTypes(VM.UC, VM.TUC);
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
  LocalSettings.parseListsCallback = function() {
    $scope.lists = LocalSettings.lists;
  };
  LocalSettings.parseListsCallback();
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
  $scope.$watch('mclick', function(val) {
    $scope.$broadcast('changeMLink', val);
    LocalSettings.saveLocalSettings($scope);
  });
  LocalSettings.getSearch($scope);
  $scope.$watch('cached.search', function(val) {
    if (val === undefined) return;
    $scope.range = 'all';
    $scope.$broadcast('newSearch');
    LocalSettings.saveSearch($scope);
  });
  $scope.openSearch = function(val) {
    $scope.cached.opensearch = !$scope.cached.opensearch;
    if ($scope.cached.opensearch === true) {
      $scope.cached.live = false;
    }
    $scope.$emit('focusSearch');
  };
  $scope.openMClickCheck = function() {
    if ($scope.mclick === 'check') {
      $scope.mclick = null;
    } else {
      $scope.cached.live = false;
      $scope.mclick = 'check';
    }
  };
  $scope.openMClickRDP = function() {
    if ($scope.mclick === 'rdp') {
      $scope.mclick = null;
    } else {
      $scope.mclick = 'rdp';
    }
  };
  $scope.commands = Servers.COMMANDS;
  $scope.command = 0;
  $scope.clearChecked = function() {
    $scope.cached.checked = {
      list: [],
      items: {}
    };
  };
  if (!$scope.cached.checked) $scope.clearChecked();
  $scope.mselect = function(host, vm) {
    if (vm instanceof Array) {
      if ($scope.cached.checked.items[host]) {
        $scope.cached.checked.items[host].forEach(function(item) {
          var index = $scope.cached.checked.list.indexOf(item);
          if (index > -1) {
            $scope.cached.checked.list.splice(index, 1);
          }
        });
        delete $scope.cached.checked.items[host];
      } else {
        $scope.cached.checked.items[host] = angular.copy(vm);
        $scope.cached.checked.items[host].forEach(function(item) {
          if ($scope.cached.checked.list.indexOf(item) === -1) {
            $scope.cached.checked.list.push(item);
          }
        });
      }
    } else {
      $scope.cached.checked.items[host] = $scope.cached.checked.items[host] || [];
      var index = $scope.cached.checked.items[host].indexOf(vm);
      if (index === -1) {
        $scope.cached.checked.items[host].push(vm);
      } else {
        $scope.cached.checked.items[host].splice(index, 1);
      }
      index = $scope.cached.checked.list.indexOf(vm);
      if (index === -1) {
        $scope.cached.checked.list.push(vm);
      } else {
        $scope.cached.checked.list.splice(index, 1);
      }
    }
    $scope.$apply();
  };
  $scope.btnExecuteDisabled = function() {
    return !$scope.password || $scope.password.length < 10;
  };
  $scope.execute = function() {
    if (!$scope.cached.checked) return alert('Not ready yet.');
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (!confirm('Are you sure you want to execute this command?')) return;
    var cmdindex = $scope.command;
    var command = Servers.COMMANDS.C[cmdindex];
    Socket.emit('ExecuteCommandMultiple', $scope.password, command,
      $scope.cached.checked.items);
    $scope.password = null;
  };
  angular.extend($scope, LocalSettings.getLocalSettings({
    range: 4, show: 0, type: 'U', mclick: null
  }));
}]).

controller('HostController', ['$scope', '$routeParams', 'Socket', 'Servers',
  function($scope, $routeParams, Socket, Servers) {
  $scope.host = $routeParams.host;
  $scope.VMs = Servers.allServers[$scope.host];
  Servers.freezeHosts[$scope.host] = Servers.freezeHosts[$scope.host] || {};
  $scope.freeze = Servers.freezeHosts[$scope.host];
  Servers.checkedVMs[$scope.host] = Servers.checkedVMs[$scope.host] || [];
  $scope.checked = Servers.checkedVMs[$scope.host];
  $scope.checkedVMs = null;
  $scope.commands = Servers.COMMANDS;
  $scope.command = 0;

  if (Socket.$events) delete Socket.$events['Update'];
  Socket.on('Update', function(host, data) {
    Servers.updateServers(host, angular.fromJson(data));
    if (host === $scope.host) {
      $scope.VMs = Servers.allServers[host];
      if (!$scope.checkedVMs) {
        $scope.checked = $scope.VMs.K.map(function() { return true; });
      }
      $scope.$apply();
    }
  });
  if (Socket.$events) delete Socket.$events['CommandFailed'];
  Socket.on('CommandFailed', function(host) {
    var newfreeze = {
      message: 'Cannot connect to the host {}.'.replace(/{}/g, host),
      messageColor: 'danger'
    };
    Servers.freezeHosts[$scope.host] = newfreeze;
    $scope.freeze = newfreeze;
    $scope.$apply();
  });
  $scope.$watchCollection('checked', function(val) {
    if (!$scope.VMs) return;
    if ($scope.checked.toString().indexOf('false') === -1) { // all true
      $scope.checkedall = true;
    } else if ($scope.checked.toString().indexOf('true') === -1) { // all false
      $scope.checkedall = false;
    }
    $scope.checkedVMs = $scope.VMs.K.filter(function(val, index) {
      return $scope.checked[index];
    });
  });
  $scope.$watch('checkedall', function(val) {
    if (!$scope.VMs) return;
    $scope.checked = $scope.VMs.K.map(function() { return val; });
  });
  $scope.btnExecuteDisabled = function() {
    if (!$scope.checked) return true;
    if ($scope.checked.toString().indexOf('true') === -1) { // all false
      return true;
    }
    return !$scope.password || $scope.password.length < 10;
  };
  $scope.execute = function() {
    if (!$scope.checked) return alert('Not ready yet.');
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (!confirm('Are you sure you want to execute this command?')) return;
    var cmdindex = $scope.command;
    var command = Servers.COMMANDS.C[cmdindex];
    Socket.emit('ExecuteCommand', $scope.password, command,
      $scope.host, $scope.checkedVMs);
    $scope.password = null;
    Servers.freeze($scope.freeze, cmdindex);
    $scope.checkedVMs.forEach(function(vm) {
      Servers.freezeVMs[vm] = Servers.freezeVMs[vm] || {};
      Servers.freeze(Servers.freezeVMs[vm], cmdindex);
    });
  };
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
    delete Socket.$events['CommandFailed'];
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
    Socket.emit('ExecuteCommand', $scope.password, command,
      $scope.host, $scope.vm);
    $scope.password = null;
    Servers.freeze($scope.freeze, cmdindex);
    var expectOnKey = Servers.COMMANDS.E[cmdindex];
    var orignal = $scope.VMs[expectOnKey][$scope.index];
    $scope.freeze.expectOnKey = expectOnKey;
    $scope.freeze.original = orignal;
  };
}]).

controller('EditListsController', ['$scope', 'LocalSettings', 'Socket',
  '$timeout',
  function($scope, LocalSettings, Socket, $timeout) {
  LocalSettings.parseListsCallback = function() {
    $scope.lists = LocalSettings.lists;
    $scope.rawLists = LocalSettings.rawLists;
  };
  LocalSettings.parseListsCallback();
  $scope.$watch('rawLists', function(val) {
    LocalSettings.parseLists(val);
  });
  $scope.updateText = 'Update';
  $scope.update = function() {
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (typeof $scope.password !== 'string' || $scope.password.length < 5) {
      return alert('Please input your password.');
    }
    $scope.updateDisabled = true;
    $scope.updateText = 'Updating...';
    Socket.emit('UpdateLists', $scope.password, $scope.rawLists);
    $scope.password = null;
  };
  if (Socket.$events) delete Socket.$events['UpdateListsStatus'];
  Socket.on('UpdateListsStatus', function(code) {
    switch (code) {
    case 0:
      $scope.updateText = 'Updated!';
      $scope.updateTextColor = 'text-success';
      break;
    default:
      $scope.updateText = 'Failed to update!';
      $scope.updateTextColor = 'text-danger';
    }
    $timeout(function(){
      $scope.updateText = 'Update';
      $scope.updateTextColor = null;
      $scope.updateDisabled = false;
    }, 4000);
  });
}]).

run([function() {

}]);
