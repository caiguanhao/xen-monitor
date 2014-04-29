#!/usr/bin/env node

var net = require('net');
var redis = require('redis');
var client = redis.createClient();

var MAX_NUMBER_LENGTH = 9;

var server = net.createServer(function(sock) {
  sock.on('data', function(data) {
    if (!data) return;
    try {
      var stats = JSON.parse(data);
      var S = {};
      var i;
      for (i = 0; i < stats.A.length; i++) {
        var A = stats.A[i];
        if (A.U.length > MAX_NUMBER_LENGTH || A.D.length > MAX_NUMBER_LENGTH) {
          continue;
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
      console.error('Error: ' + e + ' for client ' + sock.remoteAddress);
    }
  });
});

server.listen(8124);
