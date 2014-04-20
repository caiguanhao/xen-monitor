#!/usr/bin/env python
import os
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
MAX_NUMBER_LENGTH = 10     # prevent insanely large number

def help():
  print (
    "Receive and save statistics of XenServer virtual machines.\n"
    "Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)\n"
    "Licensed under the terms of the MIT license.\n"
    "Report bugs on http://github.com/caiguanhao/xen-monitor/issues\n\n"
    "Usage: %s [OPTION]\n"
    "  -h, --help                Show help and exit\n"
    "  -v, --verbose             Don't be silent\n"
    "  -D, --daemon              Run as a daemon\n"
    "  -o, --stdout <file>       Write stdout to file\n"
    "  -e, --stderr <file>       Write stderr to file\n"
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
  for line in lines:
    I = re.search('I:([0-9\.]{7,15})', line)  # easy check
    if not I: continue
    D = re.search('D:([0-9]+)', line)
    U = re.search('U:([0-9]+)', line)
    stats.append((
      I.group(1),
      D.group(1) if D else 0,
      U.group(1) if U else 0))

  return stats

def store(stats):
  pipe = REDIS.pipeline()
  update = []
  for stat in stats:
    if len(stat[1]) > MAX_NUMBER_LENGTH or len(stat[2]) > MAX_NUMBER_LENGTH:
      return
    pipe.sadd('keys', stat[0])
    pipe.set(stat[0] + ':D', stat[1])
    pipe.set(stat[0] + ':U', stat[2])
    update.append(stat[0])
  if update:
    pipe.publish('update', ','.join(update))
    ret = pipe.execute()
    if verbose: print "Executed %u Redis commands" % len(ret)

if __name__ == "__main__":
  daemon = 0
  bind = B_ADDR
  port = B_PORT
  redishost = R_ADDR
  redisport = R_PORT
  redisdb = R_DB
  try:
    opts, args = getopt.getopt(sys.argv[1:], "hDo:e:b:p:vr:t:n:", [
      "help", "daemon", "stdout", "stderr", "bind", "port", "verbose",
      "redis", "redis-port", "redis-db" ])
  except getopt.GetoptError as err:
    help()
  for o, a in opts:
    if o in ("-h", "--help"):     help()
    elif o in ("-D", "--daemon"): daemon = 1
    elif o in ("-o", "--stdout"):
      sys.stdout = open(os.path.realpath(a), 'w', 0)
    elif o in ("-e", "--stderr"):
      sys.stderr = open(os.path.realpath(a), 'w', 0)
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

  sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  # prevent 'address already in use' after re-start:
  sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
  sock.bind((bind, port))
  sock.listen(5)
  if verbose: print "Listening on %s, port %u" % (bind, port)

  if daemon:
    try:
      pid = os.fork()
      if pid > 0: sys.exit(0)
    except OSError, e:
      sys.stderr.write("failed to fork: %d (%s)" % (e.errno, e.strerror))
      sys.exit(1)
    os.chdir("/")
    os.setsid()
    os.umask(0)

  while 1:
    connection, address = sock.accept()
    data = connection.recv(1024)
    if verbose: print "Received %u bytes from %s:%u" % (len(data), address[0],
      address[1])
    stats = parse(data)
    store(stats)
