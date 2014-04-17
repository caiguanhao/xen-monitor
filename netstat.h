#ifndef NETSTAT_H
#define NETSTAT_H

#define sample_period 2
#define vmuuid_length 36
#define vmname_length 64

#define MIN(a,b) (((a)<(b))?(a):(b))

char xl_list_vm_command[128];
char proc_net_dev[128];

typedef struct virtual_machines virtual_machines;
typedef struct stat_samples stat_samples;
typedef struct stat_networks stat_networks;
typedef struct stat_network stat_network;

struct virtual_machines {
  unsigned int length;
  unsigned int *domids;
  char **uuids;
  char **names;
};

struct stat_samples {
  stat_networks *before;
  stat_networks *after;
};

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

int collect_virtual_machines_info(virtual_machines *vm);
int collect_networks_infomation(stat_networks *networks);

#endif
