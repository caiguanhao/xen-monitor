#!/usr/bin/env node

var args = process.argv.slice(2);

var VERBOSE = false;

for (var i = 0; i < args.length; i++) {
  switch (args[i]) {
  case '-v':
  case '--verbose':
    VERBOSE = true;
    break;
  }
}

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

var MAX_NUMBER_LENGTH = 9;

var server = net.createServer(function(sock) {
  if (WHITELIST.indexOf(sock.remoteAddress) === -1) {
    console.log('Blocked client ' + sock.remoteAddress);
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
      var DATA = {
        K: stats.V.map(function(x) { return x.IP || '127.0.0.1'; }),
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

server.listen(8124);
