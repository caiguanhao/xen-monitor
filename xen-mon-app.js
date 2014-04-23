var express = require('express');
var app = express();
var redis = require('redis');
var client = redis.createClient();
var subscribe = redis.createClient();
var PORT = 23456;
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var ENVIRONMENT = process.env.NODE_ENV || 'development';

console.log('Entering ' + ENVIRONMENT + ' mode.');

server.listen(PORT);

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
