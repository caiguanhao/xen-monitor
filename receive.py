import re
import socket
import redis

E_MAX = 100

REDIS = redis.StrictRedis(host='localhost', port=6379, db=0)

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
  pipe.execute();

if __name__ == "__main__":
  sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM);
  sock.bind(('127.0.0.1', 8124));
  sock.listen(5);
  while 1:
    connection, address = sock.accept()
    data = connection.recv(1024)
    stats = parse(data)
    store(stats)
