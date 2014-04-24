#include <stdio.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>

#define MAXMSGSIZE 512

int read_from_client(int fd) {
  char buffer[MAXMSGSIZE];
  bzero(buffer, MAXMSGSIZE);
  int nbytes;
  nbytes = read(fd, buffer, MAXMSGSIZE - 1);
  if (nbytes < 0) {
    perror("read");
    exit(EXIT_FAILURE);
  } else if (nbytes == 0) {
    return -1;
  } else {
    char *pch = strtok(buffer, " ");
    if (pch != NULL) {
      if (strcmp(pch, "1234567890") != 0) return -1;    // validate password
      pch = strtok(NULL, " ");
    }
    if (pch != NULL) {
      int action;
      if (strcmp(pch, "FORCERESTART") == 0) {
        action = 1;
      } else if (strcmp(pch, "RESTART") == 0) {
        action = 2;
      } else if (strcmp(pch, "FORCESHUTDOWN") == 0) {
        action = 3;
      } else if (strcmp(pch, "SHUTDOWN") == 0) {
        action = 4;
      } else if (strcmp(pch, "START") == 0) {
        action = 5;
      } else {
        return 0;
      }
      while ((pch = strtok(NULL, " "))) {
        unsigned int cmdsize = 512;
        char command[cmdsize];
        int x = 0;
        switch (action) {
        case 1:
          x = snprintf(command, cmdsize,
              "xe vm-reboot --force name-label=\"%s\" > /dev/null", pch);
          break;
        case 2:
          x = snprintf(command, cmdsize,
              "xe vm-reboot name-label=\"%s\" > /dev/null", pch);
          break;
        case 3:
          x = snprintf(command, cmdsize,
              "xe vm-shutdown --force name-label=\"%s\" > /dev/null", pch);
          break;
        case 4:
          x = snprintf(command, cmdsize,
              "xe vm-shutdown name-label=\"%s\" > /dev/null", pch);
          break;
        case 5:
          x = snprintf(command, cmdsize,
              "xe vm-start name-label=\"%s\" > /dev/null", pch);
          break;
        }
        if (x > 0 && x < cmdsize) {
          system(command);
        }
      }
    }
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
