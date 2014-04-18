var express = require('express');
var app = express();
var redis = require('redis');
var client = redis.createClient();
var subscribe = redis.createClient();
var io;
var PORT = 23456;

app.use(express.static(__dirname + '/web'));

var server = require('http').createServer(app)

server.listen(PORT);

subscribe.subscribe('update');
subscribe.on('message', function(channel, message) {
  if (channel === 'update') {
    var ipaddrs = message.split(',');
    ipaddrs.reduce(function(prev, cur) {
      return prev.lindex(cur + ':T', 0)
                 .lindex(cur + ':D', 0)
                 .lindex(cur + ':U', 0);
    }, client.multi()).exec(function(err, results) {
      var bundle = {};
      for (var i = 0; i < ipaddrs.length; i++) {
        bundle[ipaddrs[i]] = {
          time: results[i * 3],
          download: results[i * 3 + 1],
          upload: results[i * 3 + 2]
        }
      }
      io.sockets.emit('Update', bundle);
    });
  }
});

io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
  socket.on('GiveMeTheIPAddresses', function() {
    client.smembers('keys', function(err, keys) {
      socket.emit('HereAreTheIPAddresses', keys);
    });
  })
});
