var XenMonApp = angular.module('xen-mon-app', [ 'ngRoute', 'cfp.hotkeys' ]).

config(['$routeProvider', '$locationProvider', '$compileProvider', 'PRODUCTION',
  function($routeProvider, $locationProvider, $compileProvider, PRODUCTION) {
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
  $locationProvider.html5Mode(!!PRODUCTION);
  var whiteList = /^\s*(https?|ftp|mailto|tel|file|xen-monitor-rdp):/;
  $compileProvider.aHrefSanitizationWhitelist(whiteList);
}]).

run(['$interval', '$rootScope', function($interval, $rootScope) {
  $interval(function() {
    $rootScope.$broadcast('anotherSecond');
  }, 1000);
  $interval(function() {
    $rootScope.$broadcast('anotherFiveSeconds');
  }, 5000);
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
        if (!$scope.VMs) return;
        var t = $scope.$parent.saved.type;
        elem[0].className = 'progress-bar progress-bar-'+$scope.VMs['T' + t + 'C'];
        elem.css('width', $scope.VMs['T' + t + 'P'] + '%');
        elem.text($scope.$parent.saved.show ? $scope.VMs['T' + t + 'T'] : $scope.ip);
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
        var i = $scope.index, t = $scope.$parent.saved.type;
        elem[0].className = 'progress-bar progress-bar-'+$scope.VMs[t + 'C'][i];
        elem.css('width', $scope.VMs[t + 'P'][i] + '%');
        elem.text($scope.$parent.saved.show ? $scope.VMs[t + 'T'][i] : $scope.ip);
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
      var mclick = $scope.saved.mclick
      if (mclick === 'rdp') {
        elem.attr('href', attrs.rdp);
      } else if (mclick === 'check') {
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
        var s = $scope.$parent.saved.search;
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

directive('screenshot', [function() {
  return {
    scope: {
      screenshot: '='
    },
    link: function($scope, elem, attrs) {
      var parent = elem.parent().parent();
      if (!parent.hasClass('screenshot')) parent = parent.parent();
      elem.attr('src', $scope.screenshot);
      elem.on('load', function() {
        parent.removeClass('loading error').addClass('loaded');
      });
      elem.on('error', function() {
        parent.removeClass('loading loaded').addClass('error');
      });
      if (!angular.isUndefined(attrs.interactive)) {
        elem.on('mousemove', function(e) {
          var ratio = elem[0].naturalWidth / elem[0].offsetWidth;
          var x = Math.round(e.offsetX * ratio);
          var y = Math.round(e.offsetY * ratio);
          if (!$scope.$parent.shouldUpdateCoordinates) {
            $scope.$parent.$emit('updateCoordinates', x, y);
          }
        });
        elem.css('cursor', 'crosshair');
        elem.on('click', function() {
          var p = $scope.$parent;
          if (p.shouldUpdateCoordinates) {
            p.shouldUpdateCoordinates = false;
            elem.css('cursor', 'crosshair');
          } else {
            p.shouldUpdateCoordinates = true;
            elem.css('cursor', 'pointer');
          }
        });
      }
      $scope.$on('anotherFiveSeconds', function() {
        elem.attr('src', $scope.screenshot);
      });
    }
  };
}]).

directive('statsCollection', [function() {
  return {
    link: function($scope, elem, attrs) {
      $scope.$on('findVisible', function() {
        var visible = [];
        var children = elem[0].querySelectorAll('.stats');
        for (var i = 0; i < children.length; i++) {
          if (children[i].offsetParent) {
            visible.push(children[i].getAttribute('data-host'))
          }
        }
        $scope.$broadcast('returnVisible', visible);
      });
    }
  };
}]).

factory('Socket', ['$window', 'ASSETS', 'LocalSettings', 'Servers', '$location',
  function($window, ASSETS, LocalSettings, Servers, $location) {
  var socket = $window.io.connect('/', {
    'force new connection': true,
    'reconnect': true,
    'reconnection delay': 1000,
    'reconnection limit': 5000,
    'max reconnection attempts': 10000,
    'query': 'page=' + $location.path()
  });
  socket.on('CheckAssetsVersion', function(data, lists, whitelist) {
    LocalSettings.parseLists(lists);
    if (angular.isArray(whitelist)) {
      Servers.whitelist = whitelist;
    }
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
  var saved = null;
  try {
    saved = angular.fromJson($window.localStorage[lskey]);
  } catch(e) {}

  this.cached = {
    live: true,
    password: '',
    cmdindex: 0
  };
  this.saved = angular.extend({
    range: 'all',
    show: 0,
    type: 'U',
    mclick: null,
    search: '',
    opensearch: false,
    hostview: 'simple',
    screenImageFormat: 'webp',
    columns: 2
  }, saved);

  this.giveSavedToScope = function($scope) {
    $scope.saved = this.saved;
    $scope.$watch('saved', function(newval, oldval) {
      try {
        $window.localStorage[lskey] = angular.toJson($scope.saved);
      } catch(e) {
        delete $window.localStorage[lskey];
      }
    }, true);
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
}]).

service('Servers', ['$filter', function($filter) {
  this.POWERSTATES = {
    U: 'Unknown',
    R: 'Running',
    H: 'Halted',
    P: 'Paused',
    S: 'Suspended'
  };
  this.COMMANDS = [
    {
      group:   'Key',
      command: 'send key f1',
      text:    'F1 - Disable speed limit',
      short:   'F1'
    }, {
      group:   'Key',
      command: 'send key f2',
      text:    'F2 - Set limit to 20000',
      short:   'F2'
    }, {
      group:   'Key',
      command: 'send key f3',
      text:    'F3 - Set limit to 26000',
      short:   'F3'
    }, {
      group:   'Key',
      command: 'send key f4',
      text:    'F4 - Open TCP-Z',
      short:   'F4'
    }, {
      group:   'Key',
      command: 'send key f5',
      text:    'F5 - Open LLKS',
      short:   'F5'
    }, {
      group:   'Key',
      command: 'send key f6',
      text:    'F6 - Open KTJ',
      short:   'F6'
    }, {
      group:   'Key',
      command: 'send key f7',
      text:    'F7 - View statistics',
      short:   'F7'
    }, {
      group:   'Key',
      command: 'send key enter',
      text:    'Enter',
      short:   'Enter'
    }, {
      group:   'Key',
      command: 'send key esc',
      text:    'Escape',
      short:   'ESC'
    }, {
      group:   'Key',
      command: 'send key alt-f4',
      text:    'Alt-F4'
    }, {
      group:   'Mouse',
      template:'send move {{x}} {{y}}',
      command: '',
      custom:  true,
      text:    'Move mouse',
      short:   'Move',
      hideInSelect: true,
      glyphicon: 'move'
    }, {
      group:   'Mouse',
      template:'send move {{x}} {{y}} click 1',
      command: '',
      custom:  true,
      text:    'Left click',
      short:   'Click',
      hideInSelect: true,
      glyphicon: 'hand-up'
    }, {
      group:   'Mouse',
      template:'send move {{x}} {{y}} click 1 click 1',
      command: '',
      custom:  true,
      text:    'Double click',
      short:   'DblClick',
      hideInSelect: true
    }, {
      group:   'Mouse',
      template:'send move {{x}} {{y}} click 3',
      command: '',
      custom:  true,
      text:    'Right click',
      short:   'RClick',
      hideInSelect: true
    }, {
      group:   'Power',
      command: 'forcerestart',
      text:    'Force Restart',
      wait:    35,
      expect:  'I',
      short:   'Restart',
      glyphicon: 'repeat'
    }, {
      group:   'Power',
      command: 'restart',
      text:    'Restart',
      wait:    60,
      expect:  'I',
      hideIfButton: true
    }, {
      group:   'Power',
      command: 'forceshutdown',
      text:    'Force Shutdown',
      wait:    15,
      expect:  'PS',
      short:   'Shutdown',
      glyphicon: 'off'
    }, {
      group:   'Power',
      command: 'shutdown',
      text:    'Shutdown',
      wait:    35,
      expect:  'PS',
      hideIfButton: true
    }, {
      group:   'Power',
      command: 'start',
      text:    'Start',
      wait:    30,
      expect:  'PS'
    }, {
      group:   'Power',
      command: 'reboot',
      text:    'Reboot Server',
      wait:    30,
      short:   'Reboot',
      hostOnly: true
    }, {
      group:   'Combination',
      command: 'login',
      text:    'Log into Windows',
      short:   'Windows Login',
      glyphicon: 'log-in'
    }, {
      group:   'Combination',
      command: '',
      custom:  true,
      text:    'Custom command',
      short:   'Custom',
      glyphicon: 'edit'
    }
  ];
  this.COMMANDGroups = [ 'Key', 'Mouse', 'Power', 'Combination' ];
  this.findCommandByShortName = function(name) {
    var ret = $filter('filter')(this.COMMANDS, { short: name }, true);
    return ret ? ret[0] : null;
  };
  this.colorBySpeed = function(speed) {
    if (speed > 2048000) return 'success';
    if (speed > 1024000) return 'warning';
    if (speed < 102400) return 'dead';
    return 'danger';
  };
  this.colorByLLKSSpeed = function(speed) {
    if (speed > 1024000) return 'success';
    if (speed > 512000) return 'warning';
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
    if (speed > 10485760) return 10;
    if (speed > 7340032) return 7;
    if (speed > 4194304) return 4;
    return 0;
  };
  this.formatExtraData = function(str) {
    var val = parseFloat(str) || 0;
    if (val <= 0) return 0;
    val *= 1024;
    if (str.indexOf('M') > -1) {
      val += +(Math.random() * 90 + 10).toFixed(3);
      val *= 1024;
    }
    return val;
  };
  this.formatSize = function(size) {
    if (size > 1048576) return (size / 1048576).toFixed(2) + ' MB/s';
    return (size / 1024).toFixed(2) + ' KB/s';
  };
  this.freeze = function(object, command) {
    object.time = (+new Date);
    object.wait = command.wait || 1;
    object.elapsed = 0;
    object.frozen = true;
    object.pBarWidth = 0;
    object.commandText = command.text || '';
    object.message = 'Command {} has been sent. Please wait a moment.';
    object.messageColor = 'info';
  };
  this.addHost = function(host) {
    var i = 0;
    for (; this.allServerHosts[i] <= host; i++) {
      if (this.allServerHosts[i] === host) return;
    }
    this.allServerHosts.splice(i, 0, host);
  };
  this.hostNavigation = function(host) {
    var index = this.allServerHosts.indexOf(host);
    var navigation = {};
    if (index > 0) {
      navigation.previous = this.allServerHosts[index - 1];
    }
    if (index < this.allServerHosts.length - 1) {
      navigation.next = this.allServerHosts[index + 1];
    }
    return navigation;
  };
  this.vmNavigation = function(vms, index) {
    if (index < 0) return {};
    var navigation = {};
    if (index > 0) {
      navigation.previous = vms[index - 1];
    }
    if (index < vms.length - 1) {
      navigation.next = vms[index + 1];
    }
    return navigation;
  };
  this.freezeVMs = {};
  this.freezeHosts = {};
  this.checkedVMs = {};
  this.allServers = {};
  this.allServerHosts = [];
  this.whitelist = [];
  this.serversLoaded = {};
  this.colorStats = {};
  this.rangeStats = {};
  this.totalStats = {};
  this.lastTimeCountServersByColor = 0;
  this.removeServerIfNoUpdatesFor = 30000; // ms
  this.countServersByColor = function() {
    var cS = this.colorStats;
    var rS = this.rangeStats;
    var tS = this.totalStats;
    cS.success = 0; cS.warning = 0; cS.danger = 0; cS.dead = 0;
    rS['12']   = 0; rS['10']  = 0;
    rS['7']    = 0; rS['4']    = 0; rS['0']   = 0;
    tS.HC      = 0; tS.VMC     = 0; tS.L      = 0; tS.U      = 0; tS.D    = 0;
    var now = +new Date;
    for (var host in this.allServers) {
      var VMs = this.allServers[host];
      if (VMs.$time && now - VMs.$time > this.removeServerIfNoUpdatesFor) {
        var index = this.allServerHosts.indexOf(host);
        if (index > -1) {
          this.allServerHosts.splice(index, 1);
          delete this.allServers[host];
        }
        continue;
      }
      for (var i = 0; i < VMs.UC.length; i++) {
        cS[VMs.UC[i]]++;
        rS[VMs.R]++;
        tS.VMC++;
      }
      tS.L += VMs.TL;
      tS.U += VMs.TU;
      tS.D += VMs.TD;
      tS.HC++;
    }
    cS.total = cS.success + cS.warning + cS.danger + cS.dead;
    cS.successPercent = cS.success / cS.total * 100;
    cS.warningPercent = cS.warning / cS.total * 100;
    cS.dangerPercent = cS.danger / cS.total * 100;
    cS.deadPercent = Math.max(0, 100 - cS.successPercent - cS.warningPercent -
      cS.dangerPercent);
    tS.LT = this.formatSize(tS.L);
    tS.LHA = this.formatSize(tS.L / tS.HC);
    tS.LVMA = this.formatSize(tS.L / tS.VMC);
    tS.UT = this.formatSize(tS.U);
    tS.UHA = this.formatSize(tS.U / tS.HC);
    tS.UVMA = this.formatSize(tS.U / tS.VMC);
    tS.DT = this.formatSize(tS.D);
    tS.DHA = this.formatSize(tS.D / tS.HC);
    tS.DVMA = this.formatSize(tS.D / tS.VMC);
  };
  this.topTotalLLKSUpload = 1;
  this.topTotalLLKSUploadTime = 0;
  this.topTotalUpload = 1;
  this.topTotalUploadTime = 0;
  this.topTotalDownload = 1;
  this.topTotalDownloadTime = 0;
  var MAXSPEED = 13421772; // 12.8M
  this.updateServers = function(host, data) {
    this.addHost(host);
    this.allServers[host] = data;
    var VM = this.allServers[host];
    if (!VM) return;

    var length = VM.K.length;

    VM.L = [];

    var i, totalLLKSUpload = 0, totalUpload = 0, totalDownload = 0;
    for (i = 0; i < length; i++) {
      VM.L[i] = VM.E ? this.formatExtraData(VM.E[i]) : 0;
      VM.U[i] = VM.U[i] > MAXSPEED ? MAXSPEED : VM.U[i];
      VM.D[i] = VM.D[i] > MAXSPEED ? MAXSPEED : VM.D[i];
      totalLLKSUpload += VM.L[i];
      totalUpload += VM.U[i];
      totalDownload += VM.D[i];
    }

    if (totalLLKSUpload > this.topTotalLLKSUpload) {
      this.topTotalLLKSUpload = totalLLKSUpload;
    }
    if (totalUpload > this.topTotalUpload) {
      this.topTotalUpload = totalUpload;
    }
    if (totalDownload > this.topTotalDownload) {
      this.topTotalDownload = totalDownload;
    }
    var TLP = Math.floor(totalLLKSUpload / this.topTotalLLKSUpload * 100);
    var TUP = Math.floor(totalUpload / this.topTotalUpload * 100);
    var TDP = Math.floor(totalDownload / this.topTotalDownload * 100);

    var topLLKSUpload = Math.max.apply(Math, VM.L);
    var topUpload = Math.max.apply(Math, VM.U);
    var topDownload = Math.max.apply(Math, VM.D);

    VM.LC  = [];
    VM.LP  = [];
    VM.LT  = [];

    VM.UC  = [];
    VM.UP  = [];
    VM.UT  = [];

    VM.SC  = '';

    VM.DC  = [];
    VM.DP  = [];
    VM.DT  = [];

    VM.PS  = [];
    VM.PSC  = [];

    VM.TL  = totalLLKSUpload;
    VM.TLC = this.colorByPercent(TLP);
    VM.TLT = this.formatSize(totalLLKSUpload);
    VM.TLP = TLP;

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
      var llksPercent = Math.floor(VM.L[i] / topLLKSUpload * 100);
      var llksColor = this.colorByLLKSSpeed(VM.L[i]);
      VM.LP.unshift(llksPercent || 0);
      VM.LC.unshift(llksColor);
      VM.LT.unshift(this.formatSize(VM.L[i]));

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
    if (now - this.topTotalLLKSUploadTime > 20000) {
      this.topTotalLLKSUpload = 0;
      this.topTotalLLKSUploadTime = now;
    }
    if (now - this.topTotalUploadTime > 20000) {
      this.topTotalUpload = 0;
      this.topTotalUploadTime = now;
    }
    if (now - this.topTotalDownloadTime > 20000) {
      this.topTotalDownload = 0;
      this.topTotalDownloadTime = now;
    }

    this.allServers[host].$time = now;

    var that = this;
    this.serversLoaded.notLoaded = this.whitelist.filter(function(s) {
      return angular.isUndefined(that.allServers[s]);
    });
    var loaded = 100 - this.serversLoaded.notLoaded.length / this.whitelist.length * 100;
    this.serversLoaded.loaded = Math.min(Math.round(loaded), 100);
  };
  this.updateTimeOnly = function(host) {
    var server = this.allServers[host];
    if (!angular.isUndefined(server)) {
      var now = +new Date;
      server.$time = now;
    }
  };
}]).

service('MainControllerHotKeys', ['hotkeys', function(hotkeys) {
  this.ranges = [
    [ '1',  0, '0-4M'   ],
    [ '2',  4, '4-7M'   ],
    [ '3',  7, '7-10M'  ],
    [ '4', 10, '10-12M' ],
    [ '5', 12, '12M+'   ]
  ];
  this.unapply = function() {
    [ 'p', 'i', 'u', 'm', 'r', 's', '`' ].forEach(function(key) {
      hotkeys.del(key);
    });
    this.ranges.forEach(function(range) {
      hotkeys.del(range[0]);
    });
  };
  this.apply = function($scope) {
    this.unapply();
    hotkeys.add({
      combo: 'p', description: 'Live / Pause',
      callback: function() { $scope.cached.live = !$scope.cached.live; }
    });
    hotkeys.add({
      combo: 'i', description: 'Show IP address / Speed text',
      callback: function() { $scope.saved.show = $scope.saved.show === 0 ? 1 : 0; }
    });
    hotkeys.add({
      combo: 'u', description: 'Show LLKS / Upload / Download speed',
      callback: function() {
        var types = [ 'L', 'U', 'D' ];
        var i = types.indexOf($scope.saved.type) + 1;
        $scope.saved.type = types[i + 1 > types.length ? 0 : i];
      }
    });
    hotkeys.add({
      combo: 'm', description: 'Enable / Disable multiple selections',
      callback: function() {
        $scope.saved.mclick = $scope.saved.mclick === 'check' ? null : 'check';
      }
    });
    hotkeys.add({
      combo: 'r', description: 'Enable / Disable RDP links',
      callback: function() {
        $scope.saved.mclick = $scope.saved.mclick === 'rdp' ? null : 'rdp';
      }
    });
    hotkeys.add({
      combo: 's', description: 'Enable / Disable search',
      callback: function() {
        $scope.saved.opensearch = !$scope.saved.opensearch;
      }
    });
    hotkeys.add({
      combo: '`', description: 'Show all VMs',
      callback: function() { $scope.saved.range = 'all'; }
    });
    this.ranges.forEach(function(range) {
      hotkeys.add({
        combo: range[0], description: 'Show VMs with ' + range[2] + ' upload speed',
        callback: function() { $scope.saved.range = range[1]; }
      });
    });
  };
}]).

controller('NavBarController', ['$scope', 'Servers', 'LocalSettings',
  function($scope, Servers, LocalSettings) {
  $scope.colorStats = Servers.colorStats;
  $scope.cached = LocalSettings.cached;
}]).

controller('MainController', ['$scope', 'Socket', 'Servers', 'LocalSettings',
  '$timeout', 'MainControllerHotKeys',
  function($scope, Socket, Servers, LocalSettings, $timeout,
    MainControllerHotKeys) {
  $scope.allServers = Servers.allServers;
  $scope.allServerHosts = Servers.allServerHosts;
  $scope.colorStats = Servers.colorStats;
  $scope.rangeStats = Servers.rangeStats;
  $scope.totalStats = Servers.totalStats;
  LocalSettings.parseListsCallback = function() {
    $scope.lists = LocalSettings.lists;
  };
  LocalSettings.parseListsCallback();
  LocalSettings.giveSavedToScope($scope);
  $scope.cached = LocalSettings.cached;
  $timeout(function() {
    $scope.$broadcast('newSearch');
  }, 0);

  $scope.loaded = Servers.serversLoaded;
  MainControllerHotKeys.apply($scope);

  if (Socket.$events) delete Socket.$events['Update'];
  Socket.on('Update', function(host, data) {
    Servers.updateTimeOnly(host);
    if (!$scope.cached.live) return;
    Servers.updateServers(host, angular.fromJson(data));
    $scope.$apply();
    if ($scope.saved.search) $scope.$broadcast('newSearch');
    $scope.$broadcast('totalProgressBarChanged');
    $scope.$broadcast('progressBarChanged');
  });
  var onShowOrTypeChanged = function() {
    $scope.$broadcast('totalProgressBarChanged');
    $scope.$broadcast('progressBarChanged');
  };
  $scope.$watch('saved.show', onShowOrTypeChanged);
  var TYPES = { D: 'download', U: 'upload', L: 'llks upload' };
  $scope.$watch('saved.type', function(val) {
    $scope.typetext = TYPES[val];
    onShowOrTypeChanged();
  });
  $scope.$watch('saved.mclick', function(val) {
    $scope.$broadcast('changeMLink', val);
  });
  $scope.$watch('saved.search', function(val, oldval) {
    if (val === undefined || val === oldval) return;
    $scope.saved.range = 'all';
    $scope.$broadcast('newSearch');
  });
  $scope.openSearch = function(val) {
    $scope.saved.opensearch = !$scope.saved.opensearch;
    if ($scope.saved.opensearch === true) {
      $scope.cached.live = false;
    }
    $scope.$emit('focusSearch');
  };
  $scope.openMClickCheck = function() {
    if ($scope.saved.mclick === 'check') {
      $scope.saved.mclick = null;
    } else {
      $scope.cached.live = false;
      $scope.saved.mclick = 'check';
    }
  };
  $scope.openMClickRDP = function() {
    if ($scope.saved.mclick === 'rdp') {
      $scope.saved.mclick = null;
    } else {
      $scope.saved.mclick = 'rdp';
    }
  };
  $scope.commands = Servers.COMMANDS;
  $scope.command = $scope.commands[$scope.cached.cmdindex];
  if ($scope.command && $scope.command.hideInSelect) {
    $scope.command = $scope.commands[0];
  }
  $scope.clearChecked = function() {
    $scope.cached.checked = {
      list: [],
      items: {}
    };
  };
  if (!$scope.cached.checked) $scope.clearChecked();
  $scope.selectVisible = function() {
    $scope.$broadcast('findVisible');
  };
  $scope.$on('returnVisible', function(e, visible) {
    for (var i = 0; i < visible.length; i++) {
      var host = visible[i];
      $scope.cached.checked.items[host] = angular.copy($scope.allServers[host].K);
      $scope.cached.checked.items[host].forEach(function(item) {
        if ($scope.cached.checked.list.indexOf(item) === -1) {
          $scope.cached.checked.list.push(item);
        }
      });
    }
  });
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
    return !$scope.cached.password || $scope.cached.password.length < 10;
  };
  $scope.execute = function(command) {
    if (!$scope.cached.checked) return alert('Not ready yet.');
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (!confirm('Are you sure you want to execute this command?')) return;
    var targets = angular.copy($scope.cached.checked.items)
    if (command.hostOnly) {
      for (var target in targets) {
        targets[target] = ' ';
      }
    }
    Socket.emit('ExecuteCommandMultiple', $scope.cached.password,
      command.command, targets);
  };
}]).

controller('HostController', ['$scope', '$routeParams', 'Socket', 'Servers',
  'LocalSettings',
  function($scope, $routeParams, Socket, Servers, LocalSettings) {
  LocalSettings.giveSavedToScope($scope);
  $scope.cached = LocalSettings.cached;
  $scope.host = $routeParams.host;
  $scope.VMs = Servers.allServers[$scope.host];
  $scope.navigation = Servers.hostNavigation($scope.host);
  Servers.freezeHosts[$scope.host] = Servers.freezeHosts[$scope.host] || {};
  $scope.freeze = Servers.freezeHosts[$scope.host];
  Servers.checkedVMs[$scope.host] = Servers.checkedVMs[$scope.host] || [];
  $scope.checked = Servers.checkedVMs[$scope.host];
  $scope.checkedVMs = null;
  $scope.commands = Servers.COMMANDS;
  $scope.command = $scope.commands[$scope.cached.cmdindex];
  if ($scope.command && $scope.command.hideInSelect) {
    $scope.command = $scope.commands[0];
  }

  if (Socket.$events) delete Socket.$events['Update'];
  Socket.on('Update', function(host, data) {
    Servers.updateServers(host, angular.fromJson(data));
    if (host === $scope.host) {
      $scope.VMs = Servers.allServers[host];
      $scope.navigation = Servers.hostNavigation(host);
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
    return !$scope.cached.password || $scope.cached.password.length < 10;
  };
  $scope.execute = function(command) {
    if (!$scope.checked) return alert('Not ready yet.');
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (!confirm('Are you sure you want to execute this command?')) return;
    var targets = ' ';
    if (!command.hostOnly) {
      targets = $scope.checkedVMs;
    }
    Socket.emit('ExecuteCommand', $scope.cached.password, command.command,
      $scope.host, targets);
    Servers.freeze($scope.freeze, command);
    if (!command.hostOnly) {
      $scope.checkedVMs.forEach(function(vm) {
        Servers.freezeVMs[vm] = Servers.freezeVMs[vm] || {};
        Servers.freeze(Servers.freezeVMs[vm], command);
      });
    }
  };
  $scope.Custom = function(action) {
    $scope.checked = $scope.VMs.K.map(function(val, index) {
      if (action === 1) {
        return $scope.VMs.U[index] > 2.8 * 1024 * 1024;
      } else if (action === 2) {
        return $scope.VMs.U[index] < 3 * 1024 * 1024;
      }
      return false;
    });
    var command;
    if (action === 1) {
      command = Servers.findCommandByShortName('F2');
    } else if (action === 2) {
      command = Servers.findCommandByShortName('F3');
    }
    if (command) {
      $scope.command = command;
      setTimeout(function() {
        if (!$scope.btnExecuteDisabled()) {
          $scope.execute($scope.command);
        }
      }, 300);
    }
  };

  $scope.montage = 'http://' + $scope.host + ':54321/images/montage.png';
  $scope.screenshotUrl = function(vm) {
    return 'http://' + $scope.host + ':54321/images/' + vm + '-full.' +
      $scope.saved.screenImageFormat;
  };
}]).

controller('VMController', ['$scope', '$routeParams', 'Socket', 'Servers',
  'LocalSettings', '$interpolate',
  function($scope, $routeParams, Socket, Servers, LocalSettings, $interpolate) {
  LocalSettings.giveSavedToScope($scope);
  $scope.cached = LocalSettings.cached;
  $scope.host = $routeParams.host;
  $scope.vm = $routeParams.vm;
  $scope.commands = Servers.COMMANDS;
  $scope.cmdgroups = Servers.COMMANDGroups;
  $scope.command = $scope.commands[$scope.cached.cmdindex];
  if ($scope.command && $scope.command.hideIfButton) {
    $scope.command = $scope.commands[0];
  }
  $scope.VMs = Servers.allServers[$scope.host];
  $scope.index = -1;
  if ($scope.VMs) {
    $scope.index = $scope.VMs.K.indexOf($scope.vm);
    $scope.navigation = Servers.vmNavigation($scope.VMs.K, $scope.index);
  }
  Servers.freezeVMs[$scope.vm] = Servers.freezeVMs[$scope.vm] || {};
  $scope.freeze = Servers.freezeVMs[$scope.vm];

  var cX = 0, cY = 0;
  $scope.$watch('cached.cmdindex', function() {
    $scope.$emit('updateCoordinates', cX, cY);
  });
  $scope.$on('updateCoordinates', function(e, x, y) {
    var tpl = $scope.command.template;
    if (tpl) {
      cX = x; cY = y;
      $scope.command.command = $interpolate(tpl)({ x: x, y: y });
      if (!$scope.$$phase) $scope.$apply();
    }
  });

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
      $scope.navigation = Servers.vmNavigation(VMs.K, index);
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
    return !$scope.cached.password || $scope.cached.password.length < 10;
  };
  $scope.execute = function(command) {
    if ($scope.index < 0) return alert('Not ready yet.');
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    var target = ' ';
    if (!command.hostOnly) {
      target = $scope.vm;
    }
    Socket.emit('ExecuteCommand', $scope.cached.password, command.command,
      $scope.host, target);
    Servers.freeze($scope.freeze, command);
    var expectOnKey = command.expect;
    if (!command.hostOnly && expectOnKey) {
      var orignal = $scope.VMs[expectOnKey][$scope.index];
      $scope.freeze.expectOnKey = expectOnKey;
      $scope.freeze.original = orignal;
    }
  };

  $scope.screenshot = 'http://' + $scope.host + ':54321/images/' +
    $scope.vm + '-full.' + $scope.saved.screenImageFormat;
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
  $scope.cached = LocalSettings.cached;
  $scope.updateText = 'Update';
  $scope.update = function() {
    if (!Socket.socket.connected) {
      return alert('It seems you\'re not connected! Aborted!');
    }
    if (typeof $scope.cached.password !== 'string' || $scope.cached.password.length < 5) {
      return alert('Please input your password.');
    }
    $scope.updateDisabled = true;
    $scope.updateText = 'Updating...';
    Socket.emit('UpdateLists', $scope.cached.password, $scope.rawLists);
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

controller('FooterController', ['$scope', 'Socket', '$location', function($scope, Socket, $location) {
  if (Socket.$events) delete Socket.$events['WhoIsOnline'];
  var rCS;
  Socket.on('WhoIsOnline', function(clients) {
    var p = $location.path(), same = 0;
    for (var i = 0; i < clients.length; i++) {
      if (clients[i].page === p) {
        same++;
      }
      if (clients[i].id === Socket.socket.sessionid) {
        clients[i].info += ' (You)';
      }
    }
    clients.unshift({
      info: clients.length + ' online, ' + (same - 1) + ' others on this page',
    });
    $scope.clients = clients;
    $scope.selectedClient = $scope.clients[0];
    $scope.$apply();

    $scope.$watch('selectedClient', function(client) {
      if (client.page) {
        $scope.selectedClient = $scope.clients[0];
        $location.path(client.page)
      }
    });

    if (angular.isFunction(rCS)) rCS();
    rCS = $scope.$on('$routeChangeStart', function() {
      Socket.emit('IAmOnPage', $location.path());
    });
  });
}]).

run([function() {

}]);
