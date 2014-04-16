import socket

if __name__ == "__main__":
  sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM);
  sock.bind(('127.0.0.1', 8124));
  sock.listen(5);
  while 1:
    connection, address = sock.accept()
    data = ''
    while 1:
      buf = connection.recv(64)
      if not buf: break
      data += buf
    print data
