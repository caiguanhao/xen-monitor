#!/usr/bin/env python

import re
import sys, getopt
import socket
import redis

E_MAX = 100
R_ADDR = '127.0.0.1'
R_PORT = 6379
R_DB = 0
B_ADDR = '127.0.0.1'
B_PORT = 8124
REDIS = None
verbose = 0

def help():
  print (
    "Usage: %s [OPTION]\n"
    "  -h, --help                Show help and exit\n"
    "  -v, --verbose             Don't be silent\n"
    "  -b, --bind  <ip-address>  Bind to this IP address, default: %s\n"
    "  -p, --port  <port>        Bind to this port, default: %u\n"
    "  -r, --redis <ip-address>  Connect to Redis with this IP, default: %s\n"
    "  -t, --redis-port  <port>  Connect to Redis with this port, default: %u\n"
    "  -n, --redis-db  <number>  Database number to connect, default: %u\n"
  ) % (sys.argv[0], B_ADDR, B_PORT, R_ADDR, R_PORT, R_DB)
  sys.exit()

def parse(content):
  lines = content.splitlines()
  stats = []
  time = 0
  for line in lines:
    T = re.search('T:(\d+)', line)
    if T: time = T.group(1)

    I = re.search('I:(([0-9]{1,3}\.){3}[0-9]{1,3})', line)
    if not I: continue
    D = re.search('D:([0-9]+)', line)
    U = re.search('U:([0-9]+)', line)

    stats.append((
      int(time),
      I.group(1),
      int(D.group(1)) if D else 0,
      int(U.group(1)) if U else 0))

  return stats

def store(stats):
  pipe = REDIS.pipeline();
  update = []
  for stat in stats:
    pipe.sadd('keys', stat[1]);
    pipe.lpush(stat[1] + ':T', stat[0]).ltrim(stat[1] + ':T', 0, E_MAX - 1);
    pipe.lpush(stat[1] + ':D', stat[2]).ltrim(stat[1] + ':D', 0, E_MAX - 1);
    pipe.lpush(stat[1] + ':U', stat[3]).ltrim(stat[1] + ':U', 0, E_MAX - 1);
    update.append(stat[1])
  pipe.publish('update', ','.join(update));
  ret = pipe.execute()
  if verbose: print "Executed %u Redis commands" % len(ret)

if __name__ == "__main__":
  bind = B_ADDR
  port = B_PORT
  redishost = R_ADDR
  redisport = R_PORT
  redisdb = R_DB
  try:
    opts, args = getopt.getopt(sys.argv[1:], "hb:p:vr:t:n:", [
      "help", "bind", "port", "verbose", "redis", "redis-port", "redis-db" ])
  except getopt.GetoptError as err:
    help()
  for o, a in opts:
    if o in ("-h", "--help"):     help()
    elif o in ("-b", "--bind"):   bind = a
    elif o in ("-p", "--port"):
      try: port = int(a)
      except: pass
    elif o in ("-r", "--redis"):  redishost = a
    elif o in ("-t", "--redis-port"):
      try: redisport = int(a)
      except: pass
    elif o in ("-n", "--redis-db"):
      try: redisdb = int(a)
      except: pass
    elif o in ("-v", "--verbose"): verbose = 1

  if verbose: print "Connecting to Redis %s, port %u, number %u" % (redishost,
    redisport, redisdb)
  REDIS = redis.StrictRedis(host=redishost, port=redisport, db=redisdb)

  sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM);
  sock.bind((bind, port));
  sock.listen(5);
  if verbose: print "Listening on %s, port %u" % (bind, port)
  while 1:
    connection, address = sock.accept()
    data = connection.recv(1024)
    if verbose: print "Received %u bytes from %s:%u" % (len(data), address[0],
      address[1])
    stats = parse(data)
    store(stats)
