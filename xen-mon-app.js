var argv = require('minimist')(process.argv.slice(2));
var express = require('express');
var app = express();
var redis = require('redis');
var client = redis.createClient();
var subscribe = redis.createClient();
var DEFAULT_PORT = 23456;
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var ENVIRONMENT = process.env.NODE_ENV || 'development';
var net = require('net');
var Q = require('q');

if (argv.help || argv.h) {
  var n = console.log;
  n('Usage: node xen-mon-app.js [OPTION]');
  n('  -h, --help         Show help and exit');
  n('');
  n('  -d, --db <number>  Use nth Redis database, default is 0');
  n('  -p, --port <port>  Bind to this port, default is ' + DEFAULT_PORT);
  process.exit(0);
}

var PORT = (+argv.port || +argv.p || DEFAULT_PORT);
var DBNUM = (+argv.db || +argv.d || 0);

client.select(DBNUM);
subscribe.select(DBNUM);
server.listen(PORT);

console.log('Entering ' + ENVIRONMENT + ' mode.');
console.log('Selected Redis database ' + DBNUM + '.');
console.log('Listening on port ' + PORT + '.');

io.set('log level', 0);

app.use(express.static(__dirname + '/public'));

if (ENVIRONMENT === 'production') {
  io.disable('browser client');
}

if (ENVIRONMENT === 'development') {
  app.use(express.static(__dirname + '/web'));
}

subscribe.subscribe('update');

subscribe.on('message', function(channel, message) {
  if (channel === 'update' && message) {
    var host = message;
    client.get(host, function(err, result) {
      if (!result) return;
      io.sockets.emit('Update', host, result);
    });
  }
});

function checkIPAddress(ipaddr) {
  if (!ipaddr || !net.isIPv4(ipaddr)) return false;
  // block all reserved http://en.wikipedia.org/wiki/Reserved_IP_addresses
  if (/^(0|10|127|192\.168)\./.test(ipaddr)) return false;
  // 224.0.0.0 - 255.255.255.255:
  if (/^(2(2[4-9])|([3-4][0-9]{1})|(5[0-5]))\./.test(ipaddr)) return false;
  return true;
}

function checkCommand(command) {
  if (!command || command.length < 5 || command.length > 100) return false;
  if (!/^[\s\-\_A-Za-z0-9\.\/]+$/.test(command)) return false;
  return true;
}

function validateCommand(password, command, host, vm) {
  if (!password || password.length < 10 || password.length > 250) return false;
  if (!checkCommand(command)) return false;
  if (!checkIPAddress(host)) return false;
  if (vm instanceof Array) {
    for (var i = vm.length - 1; i > -1; i--) {
      if (!checkIPAddress(vm[i])) return false;
    }
  } else {
    if (!checkIPAddress(vm)) return false;
  }
  return true;
}

var assetsHashes = {};
try {
  assetsHashes = require('./assets.json');
} catch(e) {}

var fs = require('fs');
var LISTS = '';
try {
  LISTS = fs.readFileSync('./lists.txt').toString();
} catch(e) {}

var PASSWORD = null;
try {
  PASSWORD = fs.readFileSync('./password.txt').toString().trim();
} catch(e) {}

io.sockets.on('connection', function (socket) {
  socket.emit('CheckAssetsVersion', assetsHashes, LISTS);

  socket.on('ExecuteCommand', function(password, command, host, vm) {
    if (!validateCommand(password, command, host, vm)) {
      return;
    }
    var cmdsocket = new net.Socket();
    cmdsocket.connect(3333, host, function() {
      vm = vm instanceof Array ? vm.join('\n') : vm;
      cmdsocket.end(password + '\n' + command + '\n' + vm);
    });
    cmdsocket.on('end', function() {});
    cmdsocket.on('error', function() {
      cmdsocket.destroy();
      socket.emit('CommandFailed', host);
    });
    cmdsocket.setTimeout(5000, function() {
      cmdsocket.destroy();
    });
  });

  socket.on('ExecuteCommandMultiple', function(password, command, multiple) {
    if (!password || password.length < 10 || password.length > 250) return;
    if (!checkCommand(command)) return;
    if (typeof multiple !== 'object') return;
    for (var host in multiple) {
      if (!checkIPAddress(host)) return;
      if (!(multiple[host] instanceof Array)) return;
      if (multiple[host].length === 0) {
        delete multiple[host];
        continue;
      }
      for (var i = 0; i < multiple[host].length; i++) {
        if (!checkIPAddress(multiple[host][i])) return;
      }
    }
    Object.keys(multiple).reduce(function(prev, cur) {
      return prev.then(function() {
        var deferred = Q.defer();
        var cmdsocket = new net.Socket();
        cmdsocket.connect(3333, cur, function() {
          var vms = multiple[cur].join('\n');
          cmdsocket.end(password + '\n' + command + '\n' + vms);
        });
        cmdsocket.on('end', function() {
          deferred.resolve();
        });
        cmdsocket.on('error', function() {
          cmdsocket.destroy();
          deferred.resolve();
        });
        cmdsocket.setTimeout(5000, function() {
          cmdsocket.destroy();
          deferred.resolve();
        });
        return deferred.promise;
      });
    }, Q());
  });

  socket.on('UpdateLists', function(password, lists) {
    try {
      if (typeof PASSWORD !== 'string') throw 'password is not set';
      if (typeof password !== 'string' || !password || password.length > 100) {
        throw 'invalid password';
      }
      if (password !== PASSWORD) {
        throw 'invalid password';
      }
      if (typeof lists !== 'string' || !lists || lists.length > 10000) {
        throw 'invalid lists';
      }
      fs.writeFileSync('./lists.txt', lists);
      LISTS = lists;
      socket.emit('UpdateListsStatus', 0);
      io.sockets.emit('CheckAssetsVersion', null, LISTS);
    } catch(e) {
      socket.emit('UpdateListsStatus', 1);
    }
  });
});
