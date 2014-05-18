#ifndef NETSTAT_H
#define NETSTAT_H

#define DEFAULT_SAMPLE_PERIOD 2
#define vmuuid_length 36
#define vmip_length 15

#define MIN(a,b) (((a)<(b))?(a):(b))

char xe_vm_list_command[256];
char proc_net_dev[256];

unsigned int sample_period;

typedef struct stat_samples stat_samples;
typedef struct stat_networks stat_networks;
typedef struct stat_network stat_network;

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

int collect_virtual_machines_info(char *vm, unsigned int *vmlength);
int collect_networks_infomation(stat_networks *networks);
void get_host_ip(char *host_ip_address);
void get_extra_data_of_vm(unsigned int domid, char *extra_data);

#endif
