import re
import socket

def parse(content):
  lines = content.splitlines()
  stats = []
  time = 0
  for line in lines:
    T = re.search('T:(\d+)', line)
    if T: time = T.group(1)

    I = re.search('I:([a-f0-9\-]+)', line)
    if not I: continue
    N = re.search('N:([^ ]+)', line)
    D = re.search('D:([0-9]+)', line)
    U = re.search('U:([0-9]+)', line)

    stats.append((
      int(time),
      I.group(1),
      N.group(1) if N else None,
      int(D.group(1)) if D else 0,
      int(U.group(1)) if U else 0))

  return stats

if __name__ == "__main__":
  sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM);
  sock.bind(('127.0.0.1', 8124));
  sock.listen(5);
  while 1:
    connection, address = sock.accept()
    data = connection.recv(1024)
    stats = parse(data)
    print stats[0][0]
