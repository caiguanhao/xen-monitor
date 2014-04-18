#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <getopt.h>
#include <sys/time.h>
#include <sys/socket.h>
#include <arpa/inet.h>

#include "netstat.h"

#define DEFAULT_IP_ADDRESS "127.0.0.1"
#define DEFAULT_PORT 8124

char ip_address[16] = DEFAULT_IP_ADDRESS;
int port = DEFAULT_PORT;

static int verbose_flag;

static void help(const char *program) {
  printf(
    "Make and send statistics of XenServer virtual machines.\n"
    "Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)\n"
    "Licensed under the terms of the MIT license.\n"
    "Report bugs on http://github.com/caiguanhao/xen-monitor/issues\n\n"
    "Usage: %s [OPTION]\n"
    "  -h, --help                 display this help and exit\n"
    "  -v, --verbose              don't be silent\n"
    "  -i, --ip-address   <addr>  send to this IP address, default: %s\n"
    "  -p, --port         <port>  send to this port, default: %u\n"
    "  -X, --xe-vm-list   <file>  read this file as if running `xe vm-list`\n"
    "  -D, --proc-net-dev <file>  read this file instead of /proc/net/dev\n",
    program, DEFAULT_IP_ADDRESS, DEFAULT_PORT);
  return;
}

void send_stats_to_server(char *message) {
  short int sock;
  struct sockaddr_in server;
  fd_set fdset;
  struct timeval timeout;

  server.sin_addr.s_addr = inet_addr(ip_address);
  server.sin_family = AF_INET;
  server.sin_port = htons(port);

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
      if (send(sock, message, strlen(message), 0) < 0) {
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
  close(sock);
}

int main(int argc, char *argv[]) {
  unsigned int c, i, j, p;
  int option_index = 0;

  if (xe_vm_list_command == NULL) {
    snprintf(xe_vm_list_command, sizeof xe_vm_list_command,
      "xe vm-list params=uuid,dom-id,networks 2>/dev/null");
  }
  if (proc_net_dev == NULL) {
    snprintf(proc_net_dev, sizeof proc_net_dev, "/proc/net/dev");
  }

  while (1) {
    static struct option opts[] = {
      { "help",         no_argument,       0,             'h' },
      { "verbose",      no_argument,       &verbose_flag, 'v' },
      { "ip-address",   required_argument, 0,             'i' },
      { "port",         required_argument, 0,             'p' },
      { "xe-vm-list",   required_argument, 0,             'X' },
      { "proc-net-dev", required_argument, 0,             'D' },
      { 0,              0,                 0,              0  }
    };
    c = getopt_long(argc, argv, "hvi:p:X:D:", opts, &option_index);
    if (c == -1) break;
    switch (c) {
    case 'i':
      snprintf(ip_address, sizeof ip_address, "%s", optarg);
      break;
    case 'p':
      sscanf(optarg, "%u", &port);
      break;
    case 'X':
      snprintf(xe_vm_list_command, sizeof xe_vm_list_command,
        "cat \"%s\" 2>/dev/null", optarg);
      break;
    case 'D':
      snprintf(proc_net_dev, sizeof proc_net_dev, "%s", optarg);
      break;
    case '?':
      exit(1);
    case 'h':
      help(argv[0]);
      exit(0);
    default:
      help(argv[0]);
      exit(1);
     }
  }

  virtual_machines *vm = calloc(1, sizeof(virtual_machines));

  if (collect_virtual_machines_info(vm) == 0) {
    puts("could not get virtual machine information");
    return 1;
  }

  unsigned int msgsize = 1024;
  char message[msgsize];
  unsigned long long rdiff, tdiff, rrate, trate;
  stat_samples *samples;
  while (1) {
    samples = (stat_samples *) calloc(1, sizeof(stat_samples));
    samples->before = (stat_networks *) calloc(1, sizeof(stat_networks));
    if (collect_networks_infomation(samples->before) == 0) {
      printf("failed to make before sample\n");
      break;
    }
    sleep(sample_period);
    samples->after = (stat_networks *) calloc(1, sizeof(stat_networks));
    if (collect_networks_infomation(samples->after) == 0) {
      printf("failed to make after sample\n");
      break;
    }
    p = snprintf(message, msgsize, "T:%u", (unsigned)time(NULL));
    unsigned int pos;
    for (i = 0; i < samples->after->length; i++) {
      stat_network before = samples->before->networks[i];
      stat_network after = samples->after->networks[i];

      rdiff = after.rbytes - before.rbytes;
      tdiff = after.tbytes - before.tbytes;

      rrate = rdiff / sample_period;
      trate = tdiff / sample_period;

      for (j = 0; j < vm->length; j++) {
        if (vm->domids[j] != after.domid) continue;
        p += snprintf(message + p, msgsize - p, "\n  I:%s U:%llu D:%llu",
          vm->ips[j], rrate, trate);
      }
    }
    free(samples->before);
    free(samples->after);
    free(samples);
    send_stats_to_server(message);
  }
  return 0;
}
