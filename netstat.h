#ifndef NETSTAT_H
#define NETSTAT_H

typedef struct stat_networks stat_networks;
typedef struct stat_network stat_network;

struct stat_networks {
  unsigned int length;
  stat_network *networks;
};

struct stat_network {
  unsigned int domid;
  unsigned int netid;
  /* Received */
  unsigned long long rbytes;
  unsigned long long rpackets;
  unsigned long long rerrs;
  unsigned long long rdrop;
  /* Transmitted */
  unsigned long long tbytes;
  unsigned long long tpackets;
  unsigned long long terrs;
  unsigned long long tdrop;
};

int collect_networks_infomation(stat_networks *networks);

#endif
