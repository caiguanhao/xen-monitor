#include <stdio.h>
#include <errno.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>

int read_from_client(int fd) {
  char buffer[512];
  int nbytes;
  nbytes = read(fd, buffer, 512);
  if (nbytes < 0) {
    perror("read");
    exit(EXIT_FAILURE);
  } else if (nbytes == 0) {
    return -1;
  } else {
    puts(buffer);
    return 0;
  }
}

int main(int argc, char *argv[]) {
  int sock;
  fd_set active_fd_set, read_fd_set;
  int i;
  struct sockaddr_in server;
  struct sockaddr_in client;

  sock = socket (PF_INET, SOCK_STREAM, 0);
  if (sock < 0) {
    perror("socket");
    exit(EXIT_FAILURE);
  }

  server.sin_family = AF_INET;
  server.sin_port = htons(3333);
  server.sin_addr.s_addr = htonl(INADDR_ANY);

  if (bind(sock, (struct sockaddr *)&server, sizeof(server)) < 0) {
    perror("bind");
    exit(EXIT_FAILURE);
  }

  if (listen(sock, 5) < 0) {
    perror("listen");
    exit(EXIT_FAILURE);
  }

  FD_ZERO(&active_fd_set);
  FD_SET(sock, &active_fd_set);

  while(1) {
    read_fd_set = active_fd_set;
    if (select(FD_SETSIZE, &read_fd_set, NULL, NULL, NULL) < 0) {
      perror("select");
      exit(EXIT_FAILURE);
    }

    for (i = 0; i < FD_SETSIZE; ++i) {
      if (!FD_ISSET(i, &read_fd_set)) continue;
      if (sock == i) {
        int new;
        unsigned int size = sizeof(client);
        new = accept(sock, (struct sockaddr *)&client, &size);
        if (new < 0) {
          perror("accept");
          exit(EXIT_FAILURE);
        }
        printf("New client: IP: %s.\n", inet_ntoa(client.sin_addr));
        FD_SET(new, &active_fd_set);
      } else {
        if (read_from_client(i) < 0) {
          close(i);
          FD_CLR(i, &active_fd_set);
        }
      }
    }
  }
}
