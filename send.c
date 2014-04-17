#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/time.h>
#include <sys/socket.h>
#include <arpa/inet.h>

#include "netstat.h"

void send_stats_to_server() {
  short int sock;
  struct sockaddr_in server;
  char ip_address[16];
  fd_set fdset;
  struct timeval timeout;

  strcpy(ip_address, "127.0.0.1");

  server.sin_addr.s_addr = inet_addr(ip_address);
  server.sin_family = AF_INET;
  server.sin_port = htons(8124);

  timeout.tv_sec = 3;
  timeout.tv_usec = 0;

  sock = socket(AF_INET, SOCK_STREAM, 0);
  if (sock == -1) {
    puts("failed to create a socket");
    return;
  }

  fcntl(sock, F_SETFL, O_NONBLOCK);

  connect(sock, (struct sockaddr *)&server, sizeof(server));

  FD_ZERO(&fdset);
  FD_SET(sock, &fdset);

  if (select(sock + 1, NULL, &fdset, NULL, &timeout) == 1) {
    int so_error;
    socklen_t len = sizeof so_error;
    getsockopt(sock, SOL_SOCKET, SO_ERROR, &so_error, &len);
    if (so_error == 0) {
      printf("connected... ");
      char *data = "Hello world!";
      if (send(sock, data, strlen(data), 0) < 0) {
        puts("failed to send data");
      } else {
        puts("data has been sent.");
      }
    } else {
      printf("could not connect to %s\n", ip_address);
    }
  } else {
    printf("could not connect to %s\n", ip_address);
  }

  shutdown(sock, 2);
}

int main(int argc, char *argv[]) {
  unsigned int i;
  stat_networks *networks;
  while (1) {
    networks = (stat_networks *) calloc(1, sizeof(stat_networks));
    if (collect_networks_infomation(networks)) {
      for (i = 0; i < networks->length; i++) {
        stat_network net = networks->networks[i];
        printf("%u %llu %llu\n", net.domid, net.rbytes, net.tbytes);
      }
    }
    free(networks);
    // send_stats_to_server();
    sleep(1);
  }
  return 0;
}
