#include <stdio.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <getopt.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <arpa/inet.h>

#define MAXMSGSIZE 512

#define DEFAULT_PASSWORD_FILE "/etc/listen.passwd"
#define DEFAULT_PORT 3333

int port = DEFAULT_PORT;

static int verbose_flag;
static int daemon_flag;
static int dry_run_flag;

char run_if_no_command[256];
char password[250];
char password_file[256];

static void help(const char *program) {
  printf(
    "Listen and execute xe commands.\n"
    "Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)\n"
    "Licensed under the terms of the MIT license.\n"
    "Report bugs on http://github.com/caiguanhao/xen-monitor/issues\n\n"
    "Usage: %s [OPTION]\n"
    "  -h, --help                  display this help and exit\n"
    "  -v, --verbose               don't be silent\n"
    "  -D, --daemon                run as a daemon\n"
    "  -o, --stdout        <file>  write stdout to file\n"
    "  -e, --stderr        <file>  write stderr to file\n"
    "  -r, --run           <file>  execute file when command is not found\n"
    "  -P, --password-file <file>  file or - (stdin) to read password from,\n"
    "                              default is file %s\n"
    "  -p, --port          <port>  listen to this port, default: %u\n"
    "  -n, --dry-run               show commands but don't execute them\n",
    program, DEFAULT_PASSWORD_FILE, DEFAULT_PORT);
  return;
}

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
    if (verbose_flag) {
      printf("Received:\n%s\n", buffer);
    }
    const char delim[] = "\n";
    char *pch = strtok(buffer, delim);
    if (pch == NULL) {
      return -1;
    } else {
      if (strcmp(pch, password) != 0) {     // validate password
        if (verbose_flag) {
          printf("Client entered an invalid password: %s.\n", pch);
        }
        return -1;
      }
      pch = strtok(NULL, delim);
    }
    if (pch == NULL) {
      return -1;
    } else {
      int action;
      char action_string[256] = {0};
      if (strcmp(pch, "forcerestart") == 0) {
        action = 1;
      } else if (strcmp(pch, "restart") == 0) {
        action = 2;
      } else if (strcmp(pch, "forceshutdown") == 0) {
        action = 3;
      } else if (strcmp(pch, "shutdown") == 0) {
        action = 4;
      } else if (strcmp(pch, "start") == 0) {
        action = 5;
      } else {
        action = 0;
        snprintf(action_string, 256, "%s", pch);
      }
      while ((pch = strtok(NULL, delim))) {
        unsigned int cmdsize = 512;
        char command[cmdsize];
        int x = 0;
        switch (action) {
        case 1:
          x = snprintf(command, cmdsize,
              "xe vm-reboot --force name-label=\"%s\"", pch);
          break;
        case 2:
          x = snprintf(command, cmdsize,
              "xe vm-reboot name-label=\"%s\"", pch);
          break;
        case 3:
          x = snprintf(command, cmdsize,
              "xe vm-shutdown --force name-label=\"%s\"", pch);
          break;
        case 4:
          x = snprintf(command, cmdsize,
              "xe vm-shutdown name-label=\"%s\"", pch);
          break;
        case 5:
          x = snprintf(command, cmdsize,
              "xe vm-start name-label=\"%s\"", pch);
          break;
        default:
          x = 0;
          if (strlen(run_if_no_command) > 0) {
            x = snprintf(command, cmdsize, "%s %s %s", run_if_no_command, pch,
              action_string);
          }
        }
        if (x > 0 && x < cmdsize) {
          if (verbose_flag) {
            printf("Command: %s\n", command);
          }
          int status = 0;
          if (dry_run_flag) {
            puts(command);
          } else {
            status = system(command);
          }
          if (verbose_flag) {
            printf("Returned: %d\n", status);
          }
        }
      }
    }
    return 0;
  }
}

int main(int argc, char *argv[]) {
  unsigned int c;
  int option_index = 0;
  int stdout_to_file = 0, stderr_to_file = 0;

  if (strlen(password_file) == 0) {
    snprintf(password_file, sizeof password_file, DEFAULT_PASSWORD_FILE);
  }

  while (1) {
    static struct option opts[] = {
      { "help",          no_argument,       0, 'h' },
      { "verbose",       no_argument,       0, 'v' },
      { "password-file", required_argument, 0, 'P' },
      { "port",          required_argument, 0, 'p' },
      { "daemon",        no_argument,       0, 'D' },
      { "stdout",        required_argument, 0, 'o' },
      { "stderr",        required_argument, 0, 'e' },
      { "run",           required_argument, 0, 'r' },
      { "dry-run",       no_argument      , 0, 'n' },
      { 0,               0,                 0,  0  }
    };
    c = getopt_long(argc, argv, "hvP:p:Do:e:r:n", opts, &option_index);
    if (c == -1) break;
    switch (c) {
    case 'v':
      verbose_flag = 1;
      break;
    case 'p':
      sscanf(optarg, "%u", &port);
      break;
    case 'P': {
      if (strcmp(optarg, "-") != 0) {
        realpath(optarg, password_file);
      } else {
        sprintf(password_file, "-");
      }
      break;
    }
    case 'D':
      daemon_flag = 1;
      break;
    case 'n':
      dry_run_flag = 1;
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
    case 'r': {
      char path[256];
      realpath(optarg, path);
      snprintf(run_if_no_command, sizeof run_if_no_command, "%s", path);
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

  FILE *passwdfile;
  if (strcmp(password_file, "-") == 0) {
    printf("type your password (at least 10 characters): ");
    passwdfile = stdin;
  } else {
    passwdfile = fopen(password_file, "r");
  }
  if (passwdfile == NULL) {
    fprintf(stderr, "password file %s: %s\n", password_file, strerror(errno));
    exit(EXIT_FAILURE);
  }
  if (!fgets(password, sizeof(password), passwdfile)) {
    fprintf(stderr, "error reading password file %s\n", password_file);
    exit(EXIT_FAILURE);
  }
  if (strlen(password) < 10) {
    fprintf(stderr, "password should have at least 10 characters\n");
    exit(EXIT_FAILURE);
  }
  strtok(password, " \r\n");
  fclose(passwdfile);

  int sock;
  fd_set active_fd_set, read_fd_set;
  int i;
  struct sockaddr_in server;
  struct sockaddr_in client;

  sock = socket(PF_INET, SOCK_STREAM, 0);
  if (sock < 0) {
    perror("socket");
    exit(EXIT_FAILURE);
  }

  server.sin_family = AF_INET;
  server.sin_port = htons(port);
  server.sin_addr.s_addr = htonl(INADDR_ANY);

  if (bind(sock, (struct sockaddr *)&server, sizeof(server)) < 0) {
    perror("bind");
    exit(EXIT_FAILURE);
  }

  int on = 0;
  if (setsockopt(sock, SOL_SOCKET, SO_REUSEADDR,
    (const char *)&on, sizeof(on)) < 0) {
    perror("setsockopt SO_REUSEADDR");
    exit(EXIT_FAILURE);
  }

  if (listen(sock, 5) < 0) {
    perror("listen");
    exit(EXIT_FAILURE);
  }

  FD_ZERO(&active_fd_set);
  FD_SET(sock, &active_fd_set);

  if (verbose_flag) {
    printf("Started listening on port %u.\n", port);
    if (strlen(run_if_no_command) > 0) {
      printf("%s will be executed if no matched command.\n", run_if_no_command);
    }
  }

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
        if (verbose_flag) {
          printf("New client: IP: %s.\n", inet_ntoa(client.sin_addr));
        }
        FD_SET(new, &active_fd_set);
      } else {
        if (read_from_client(i) < 0) {
          close(i);
          FD_CLR(i, &active_fd_set);
        }
      }
    }
  }

  return 0;
}
