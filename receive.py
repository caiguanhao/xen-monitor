#!/usr/bin/env python
import os
import re
import sys, getopt
import socket
import redis
import json

E_MAX = 100
R_ADDR = '127.0.0.1'
R_PORT = 6379
R_DB = 0
B_ADDR = '127.0.0.1'
B_PORT = 8124
REDIS = None
verbose = 0
MAX_NUMBER_LENGTH = 9     # prevent insanely large number

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

if __name__ == "__main__":
  daemon = 0
  bind = B_ADDR
  port = B_PORT
  redishost = R_ADDR
  redisport = R_PORT
  redisdb = R_DB
  stdout_to_file = 0
  stderr_to_file = 0
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
      stdout_to_file = 1
      sys.stdout = open(os.path.realpath(a), 'w', 0)
    elif o in ("-e", "--stderr"):
      stderr_to_file = 1
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
      sys.stderr.write("failed to fork: %d (%s)\n" % (e.errno, e.strerror))
      sys.exit(1)
    os.chdir("/")
    os.setsid()
    os.umask(0)
    sys.stdin.close()
    if not stdout_to_file: sys.stdout.close()
    if not stderr_to_file: sys.stderr.close()

  while 1:
    try:
      connection, address = sock.accept()
      data = connection.recv(1024)
      if verbose: print "Received %u bytes from %s:%u" % (len(data), address[0],
        address[1])
      stats = json.loads(data)

      S = {}
      for A in stats["A"]:
        if len(A["U"]) > MAX_NUMBER_LENGTH or len(A["D"]) > MAX_NUMBER_LENGTH:
          S = {}
          break
        if A["I"] in stats["V"]:
          S[stats["V"][A["I"]]["IP"]] = {
            "U": int(A["U"]),
            "D": int(A["D"]),
            "S": stats["V"][A["I"]]["PS"] or "U"
          }

      if not S: continue

      DATA = { "K": [], "U": [], "D": [], "S": [] }
      for key in sorted(S):
        DATA["K"].append(key)
        DATA["U"].append(S[key]["U"])
        DATA["D"].append(S[key]["D"])
        DATA["S"].append(S[key]["S"])

      pipe = REDIS.pipeline()
      pipe.set(stats["I"], json.dumps(DATA))
      pipe.sadd('keys', stats["I"])
      pipe.publish('update', stats["I"])
      ret = pipe.execute()
      if verbose: print "Executed %u Redis commands" % len(ret)
    except Exception, e:
      sys.stderr.write("Error: %s\nData:%s\n" % (e, data))
