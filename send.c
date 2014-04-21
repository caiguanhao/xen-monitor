#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <getopt.h>
#include <sys/time.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <arpa/inet.h>

#include "netstat.h"

#define DEFAULT_IP_ADDRESS "127.0.0.1"
#define DEFAULT_PORT 8124

char ip_address[16] = DEFAULT_IP_ADDRESS;
int port = DEFAULT_PORT;
int is_disconnected = 1;

static int verbose_flag;
static int daemon_flag;

static void help(const char *program) {
  printf(
    "Make and send statistics of XenServer virtual machines.\n"
    "Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)\n"
    "Licensed under the terms of the MIT license.\n"
    "Report bugs on http://github.com/caiguanhao/xen-monitor/issues\n\n"
    "Usage: %s [OPTION]\n"
    "  -h, --help                  display this help and exit\n"
    "  -v, --verbose               don't be silent\n"
    "  -D, --daemon                run as a daemon\n"
    "  -o, --stdout        <file>  write stdout to file\n"
    "  -e, --stderr        <file>  write stderr to file\n"
    "  -s, --sample-period <secs>  sample period, default: %u second(s)\n"
    "  -i, --ip-address    <addr>  send to this IP address, default: %s\n"
    "  -p, --port          <port>  send to this port, default: %u\n"
    "  -x, --xe-vm-list    <file>  read this file as if running `xe vm-list`\n"
    "  -d, --proc-net-dev  <file>  read this file instead of /proc/net/dev\n",
    program, DEFAULT_SAMPLE_PERIOD, DEFAULT_IP_ADDRESS, DEFAULT_PORT);
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
    perror("failed to create a socket");
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
      if (verbose_flag || is_disconnected) {
        printf("connected to %s:%u\n", ip_address, port);
        is_disconnected = 0;
      }
      if (send(sock, message, strlen(message), 0) < 0) {
        perror("failed to send data");
      } else {
        if (verbose_flag) puts("... and data has been sent.");
      }
    } else {
      fprintf(stderr, "could not connect to %s:%u\n", ip_address, port);
      is_disconnected = 1;
    }
  } else {
    fprintf(stderr, "could not connect to %s:%u\n", ip_address, port);
    is_disconnected = 1;
  }

  shutdown(sock, 2);
  close(sock);
}

int main(int argc, char *argv[]) {
  unsigned int c, i, j, p;
  int option_index = 0;

  if (strlen(xe_vm_list_command) == 0) {
    snprintf(xe_vm_list_command, sizeof xe_vm_list_command,
      "xe vm-list params=uuid,dom-id,networks 2>/dev/null");
  }
  if (strlen(proc_net_dev) == 0) {
    snprintf(proc_net_dev, sizeof proc_net_dev, "/proc/net/dev");
  }

  int stdout_to_file = 0, stderr_to_file = 0;

  while (1) {
    static struct option opts[] = {
      { "help",          no_argument,       0, 'h' },
      { "verbose",       no_argument,       0, 'v' },
      { "sample-period", required_argument, 0, 's' },
      { "ip-address",    required_argument, 0, 'i' },
      { "port",          required_argument, 0, 'p' },
      { "daemon",        required_argument, 0, 'D' },
      { "stdout",        required_argument, 0, 'o' },
      { "stderr",        required_argument, 0, 'e' },
      { "xe-vm-list",    required_argument, 0, 'x' },
      { "proc-net-dev",  required_argument, 0, 'd' },
      { 0,               0,                 0,  0  }
    };
    c = getopt_long(argc, argv, "hvs:i:p:Do:e:x:d:", opts, &option_index);
    if (c == -1) break;
    switch (c) {
    case 'v':
      verbose_flag = 1;
      break;
    case 's':
      sscanf(optarg, "%u", &sample_period);
      break;
    case 'i':
      snprintf(ip_address, sizeof ip_address, "%s", optarg);
      break;
    case 'p':
      sscanf(optarg, "%u", &port);
      break;
    case 'x': {
      char path[256];
      realpath(optarg, path);
      snprintf(xe_vm_list_command, sizeof xe_vm_list_command,
        "cat \"%s\" 2>/dev/null", path);
      break;
    }
    case 'd': {
      char path[256];
      realpath(optarg, path);
      snprintf(proc_net_dev, sizeof proc_net_dev, "%s", path);
      break;
    }
    case 'D':
      daemon_flag = 1;
      break;
    case 'o': {
      char path[256];
      realpath(optarg, path);
      freopen(path, "w", stdout);
      setvbuf(stdout, NULL, _IONBF, 0);
      stdout_to_file = 1;
      break;
    }
    case 'e': {
      char path[256];
      realpath(optarg, path);
      freopen(path, "w", stderr);
      setvbuf(stderr, NULL, _IONBF, 0);
      stderr_to_file = 1;
      break;
    }
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
    fprintf(stderr, "Error: could not get virtual machine information.\n");
    return 1;
  }

  printf("Found %u virtual machine(s).\n", vm->length - 1);

  if (daemon_flag) {
    pid_t pid, sid;
    pid = fork();
    if (pid < 0) exit(EXIT_FAILURE);
    umask(0);
    sid = setsid();
    if (sid < 0) exit(EXIT_FAILURE);
    if ((chdir("/")) < 0) exit(EXIT_FAILURE);
    if (pid > 0) {
      printf("Started daemon process %u.\n", pid);
      exit(EXIT_SUCCESS);
    }

    close(STDIN_FILENO);
    if (!stdout_to_file) close(STDOUT_FILENO);
    if (!stderr_to_file) close(STDERR_FILENO);
  }

  if (sample_period < 1) sample_period = DEFAULT_SAMPLE_PERIOD;
  if (verbose_flag) {
    printf("sample period is %u second(s)\n", sample_period);
  }

  unsigned int msgsize = 1024;
  char message[msgsize];
  unsigned long long rdiff, tdiff, rrate, trate;
  stat_samples *samples;

  while (1) {
    samples = (stat_samples *) calloc(1, sizeof(stat_samples));
    samples->before = (stat_networks *) calloc(1, sizeof(stat_networks));
    if (collect_networks_infomation(samples->before) == 0) {
      perror("failed to make before sample");
      break;
    }
    sleep(sample_period);
    samples->after = (stat_networks *) calloc(1, sizeof(stat_networks));
    if (collect_networks_infomation(samples->after) == 0) {
      perror("failed to make after sample");
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
    if (verbose_flag) {
      puts(message);
    }
    send_stats_to_server(message);
  }
  return 0;
}
