#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));

if (argv.help || argv.h) {
  var n = console.log;
  n('Usage: receive.js [OPTION]');
  n('  -h, --help         Show help and exit');
  n('  -v, --verbose      Show more information');
  n('');
  n('  -d, --db <number>  Use nth Redis database, default is 0');
  n('  -p, --port <port>  Bind to this port, default is ' + DEFAULT_PORT);
  process.exit(0);
}

var DEFAULT_PORT = 8124;
var VERBOSE = !!(argv.verbose || argv.v);
var PORT = (+argv.port || +argv.p || DEFAULT_PORT);
var DBNUM = (+argv.db || +argv.d || 0);

console.log('Listening on port ' + PORT + '.');

var net = require('net');
var fs = require('fs');
var WHITELIST = [];
try {
  WHITELIST = fs.readFileSync('./whitelist.txt').toString().trim().split('\n');
  var lines = WHITELIST.length;
  for (var i = WHITELIST.length - 1; i > -1; i--) {
    if (!WHITELIST[i] || !net.isIPv4(WHITELIST[i])) {
      WHITELIST.splice(i, 1);
    }
  }
  if (WHITELIST.length === 0) throw 'No IP address found.';
  console.log('Read ' + WHITELIST.length + ' IP addresses while there are ' +
    lines + ' lines in whitelist.txt.');
} catch(e) {
  console.error('Error reading whitelist.txt: ' + e + '. ' +
    'All clients will be blocked.');
}

var redis = require('redis');
var client = redis.createClient();
client.select(DBNUM, function() {
  console.log('Use Redis database ' + DBNUM + '.');
});

var MAX_NUMBER_LENGTH = 9;

var server = net.createServer(function(sock) {
  if (WHITELIST.indexOf(sock.remoteAddress) === -1) {
    if (VERBOSE) console.log('Blocked client ' + sock.remoteAddress);
    sock.destroy();
    sock.end();
    return;
  }
  sock.on('error', function(error) {
    if (VERBOSE) console.error('Socket Error: ', error);
  });
  sock.on('data', function(data) {
    if (!data) return;
    try {
      var stats = JSON.parse(data);
      var S = {};
      var i;
      for (i = 0; i < stats.A.length; i++) {
        var A = stats.A[i];
        if (A.U.length > MAX_NUMBER_LENGTH) {
          throw 'unexpected large number: ' + A.U;
        }
        if (A.D.length > MAX_NUMBER_LENGTH) {
          throw 'unexpected large number: ' + A.D;
        }
        S[A.I] = { U: +A.U, D: +A.D };
      }
      stats.V.sort(function(a, b) {
        a.IP = a.IP || '127.0.0.1';
        b.IP = b.IP || '127.0.0.1';
        var ipa = a.IP.split('.');
        var ipb = b.IP.split('.');
        return +ipa[3] > +ipb[3] ? 1 : -1;
      });
      var DATA = {
        K: stats.V.map(function(x) { return x.IP; }),
        U: stats.V.map(function(x) { return S[x.I] ? S[x.I].U : 0; }),
        D: stats.V.map(function(x) { return S[x.I] ? S[x.I].D : 0; }),
        S: stats.V.map(function(x) { return x.PS || 'U'; }),
        I: stats.V.map(function(x) { return x.I || '0'; })
      };
      var DATAstr = JSON.stringify(DATA);
      client.multi().
        set(stats.I, DATAstr).
        sadd('keys', stats.I).
        publish('update', stats.I).
        exec();
    } catch(e) {
      if (VERBOSE) {
        console.error('Error: ' + e + ' for client ' + sock.remoteAddress);
      }
    }
  });
});

server.listen(PORT);
