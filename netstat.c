/*
 * Part of this file comes from:
 * libxenstat: statistics-collection library for Xen
 *
 * Copyright (C) International Business Machines Corp., 2005
 * Authors: Josh Triplett <josh@kernel.org>
 *          Judy Fischbach <jfisch@cs.pdx.edu>
 *          David Hendricks <cro_marmot@comcast.net>
 * Copyright 2007 Sun Microsystems, Inc.  All rights reserved.
 * Use is subject to license terms.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <unistd.h>
#include <regex.h>

#include "netstat.h"

int parseNetDevLine(char *line, char *iface,
    unsigned long long *rxBytes,   unsigned long long *rxPackets,
    unsigned long long *rxErrs,    unsigned long long *rxDrops,
    unsigned long long *rxFifo,    unsigned long long *rxFrames,
    unsigned long long *rxComp,    unsigned long long *rxMcast,
    unsigned long long *txBytes,   unsigned long long *txPackets,
    unsigned long long *txErrs,    unsigned long long *txDrops,
    unsigned long long *txFifo,    unsigned long long *txColls,
    unsigned long long *txCarrier, unsigned long long *txComp)
{
  /* Temporary/helper variables */
  int ret;
  int i = 0, x = 0, col = 0;
  regex_t r;
  regmatch_t matches[19];
  int num = 19;

  /* Regular exception to parse all the information from /proc/net/dev line */
  char *regex = "([^:]*):([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)"
      "[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*"
      "([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)[ ]*([^ ]*)";

  /* Initialize all variables called has passed as non-NULL to zeros */
  if (iface     != NULL) memset(iface, 0, sizeof(*iface));
  if (rxBytes   != NULL) *rxBytes    = 0;
  if (rxPackets != NULL) *rxPackets  = 0;
  if (rxErrs    != NULL) *rxErrs     = 0;
  if (rxDrops   != NULL) *rxDrops    = 0;
  if (rxFifo    != NULL) *rxFifo     = 0;
  if (rxFrames  != NULL) *rxFrames   = 0;
  if (rxPackets != NULL) *rxPackets  = 0;
  if (rxComp    != NULL) *rxComp     = 0;
  if (txBytes   != NULL) *txBytes    = 0;
  if (txPackets != NULL) *txPackets  = 0;
  if (txErrs    != NULL) *txErrs     = 0;
  if (txDrops   != NULL) *txDrops    = 0;
  if (txFifo    != NULL) *txFifo     = 0;
  if (txColls   != NULL) *txColls    = 0;
  if (txCarrier != NULL) *txCarrier  = 0;
  if (txComp    != NULL) *txComp     = 0;

  if ((ret = regcomp(&r, regex, REG_EXTENDED))) {
    regfree(&r);
    return ret;
  }

  if (regexec (&r, line, num, matches, REG_EXTENDED) == 0) {
    for (i = 1; i < num; i++) {
      /* The expression matches are empty sometimes so we need to check it
         first */
      if (matches[i].rm_eo - matches[i].rm_so > 0) {
        /* Col variable contains current id of non-empty match */
        col++;
        char *tmp = malloc(matches[i].rm_eo - matches[i].rm_so + 1);
        for (x = 0; x < matches[i].rm_eo - matches[i].rm_so; x++)
          tmp[x] = line[matches[i].rm_so + x];
        tmp[x] = '\0';

        /* We populate all the fields from /proc/net/dev line */
        if (i > 1) {
          unsigned long long ullTmp = strtoull(tmp, NULL, 10);

          switch (col) {
            case 2:  if (rxBytes   != NULL) *rxBytes   = ullTmp; break;
            case 3:  if (rxPackets != NULL) *rxPackets = ullTmp; break;
            case 4:  if (rxErrs    != NULL) *rxErrs    = ullTmp; break;
            case 5:  if (rxDrops   != NULL) *rxDrops   = ullTmp; break;
            case 6:  if (rxFifo    != NULL) *rxFifo    = ullTmp; break;
            case 7:  if (rxFrames  != NULL) *rxFrames  = ullTmp; break;
            case 8:  if (rxComp    != NULL) *rxComp    = ullTmp; break;
            case 9:  if (rxMcast   != NULL) *rxMcast   = ullTmp; break;
            case 10: if (txBytes   != NULL) *txBytes   = ullTmp; break;
            case 11: if (txPackets != NULL) *txPackets = ullTmp; break;
            case 12: if (txErrs    != NULL) *txErrs    = ullTmp; break;
            case 13: if (txDrops   != NULL) *txDrops   = ullTmp; break;
            case 14: if (txFifo    != NULL) *txFifo    = ullTmp; break;
            case 15: if (txColls   != NULL) *txColls   = ullTmp; break;
            case 16: if (txCarrier != NULL) *txCarrier = ullTmp; break;
            case 17: if (txComp    != NULL) *txComp    = ullTmp; break;
          }
        } else {
          if (iface != NULL) strcpy(iface, tmp);
        }
        free(tmp);
      }
    }
  }

  regfree(&r);

  return 0;
}

int is_domid(const char *str)
{
  if (*str == '-') ++str;
  if (!*str) return 0;
  for (; *str; ++str)
    if (!isdigit(*str))
      return 0;
  return 1;
}

int is_ip_address(const char *str)
{
  if (!*str) return 0;
  for (; *str; ++str)
    if (!isdigit(*str) && *str != '.')
      return 0;
  return 1;
}

int collect_virtual_machines_info(char *vm, unsigned int *vmlength)
{
  FILE *xevmlist;
  xevmlist = popen(xe_vm_list_command, "r");
  if (xevmlist == NULL) {
    perror("error executing xe command");
    return 0;
  }
  char line[512];
  unsigned int offset = 23, datasize = 0, p = 0, i = 0;
  char *data = NULL, *tmp = NULL;

  while (fgets(line, sizeof(line), xevmlist)) {
    if (datasize <= p) {
      datasize += 512;
      tmp = realloc(data, datasize);
      if (!tmp) {
        free(data);
        data = NULL;
        return 0;
      }
      data = tmp;
    }
    if (strcmp(line, "\n") == 0) {
      data[p++] = ' ';
      data[p++] = '\r';
      data[p++] = ' ';
    }
    if (strlen(line) < offset) {
      continue;
    }
    if (strncmp(line, "name-label", 10) == 0) {
      data[p++] = '"';
    }
    for (i = offset; i < strlen(line); i++) {
      data[p++] = line[i];
    }
  }

  if (pclose(xevmlist) != 0) return 0;

  if (p == 0) return 0;

  data[p++] = '\r';
  data[p] = 0;

  const char *delim = " ;\n";
  const char states[] = "URHPS";
  char *pch = strtok(data, delim);
  int powerstate = 0;
  char domid[10] = {0};
  char ip[16] = {0};
  char name[100] = {0};
  p = 0;
  do {
    if (is_domid(pch)) {
      snprintf(domid, sizeof domid, "%s", pch);
    } else if (is_ip_address(pch)) {
      snprintf(ip, sizeof ip, "%s", pch);
    } else if (strncmp(pch, "\"", 1) == 0) {
      snprintf(name, sizeof name, "%s", ++pch);
    } else if (strcmp(pch, "running") == 0) {
      powerstate = 1;
    } else if (strcmp(pch, "halted") == 0) {
      powerstate = 2;
    } else if (strcmp(pch, "paused") == 0) {
      powerstate = 3;
    } else if (strcmp(pch, "suspended") == 0) {
      powerstate = 4;
    }
    if (strcmp(pch, "\r") == 0) {
      // if the VM has not installed XenServer Tools, then no IP address is
      // found, so use its name label as its IP
      if (strlen(domid) > 0 && (strlen(ip) > 0 || strlen(name) > 0) &&
        strcmp(domid, "0") != 0) {
        p += snprintf(vm + p, 1024 - p,
          "{\"I\":\"%s\",\"PS\":\"%c\",\"IP\":\"%s\"},",
          domid, states[powerstate], strlen(ip) ? ip : name);
        if (vmlength != NULL) (*vmlength)++;
        powerstate = 0;
        bzero(domid, sizeof domid);
        bzero(ip, sizeof ip);
        bzero(name, sizeof name);
      }
    }
  } while ((pch = strtok(NULL, delim)));

  // remove possible trailing comma
  if (strlen(vm) > 0) vm[strlen(vm) - 1] = 0;

  free(data);
  free(pch);

  return 1;
}

static const char PROCNETDEV_HEADER[] =
    "Inter-|   Receive                                                |"
    "  Transmit\n"
    " face |bytes    packets errs drop fifo frame compressed multicast|"
    "bytes    packets errs drop fifo colls carrier compressed\n";

int collect_networks_infomation(stat_networks *networks)
{
  /* Helper variables for parseNetDevLine() function defined above */
  int i;
  char line[512] = { 0 }, iface[16] = { 0 };
  unsigned long long rxBytes, rxPackets, rxErrs, rxDrops, txBytes, txPackets,
    txErrs, txDrops;

  FILE *procnetdev;

  char header[sizeof(PROCNETDEV_HEADER)];
  procnetdev = fopen(proc_net_dev, "r");
  if (procnetdev == NULL) {
    perror("Error opening /proc/net/dev");
    return 0;
  }

  /* Validate the format of /proc/net/dev */
  if (fread(header, sizeof(PROCNETDEV_HEADER) - 1, 1, procnetdev) != 1) {
    perror("Error reading /proc/net/dev header");
    fclose(procnetdev);
    return 0;
  }
  header[sizeof(PROCNETDEV_HEADER) - 1] = '\0';
  if (strcmp(header, PROCNETDEV_HEADER) != 0) {
    fprintf(stderr, "Unexpected /proc/net/dev format\n");
    fclose(procnetdev);
    return 0;
  }

  fseek(procnetdev, sizeof(PROCNETDEV_HEADER) - 1, SEEK_SET);

  while (fgets(line, 512, procnetdev)) {
    stat_network net;
    unsigned int domid, netid;
    parseNetDevLine(line, iface, &rxBytes, &rxPackets, &rxErrs, &rxDrops,
      NULL, NULL, NULL, NULL, &txBytes, &txPackets, &txErrs, &txDrops,
      NULL, NULL, NULL, NULL);
    if (strstr(iface, "vif") != NULL) {
      sscanf(iface, "vif%u.%u", &domid, &netid);
      net.domid = domid;
      net.netid = netid;
      net.tbytes = txBytes;
      net.tpackets = txPackets;
      net.terrs = txErrs;
      net.tdrop = txDrops;
      net.rbytes = rxBytes;
      net.rpackets = rxPackets;
      net.rerrs = rxErrs;
      net.rdrop = rxDrops;

      if (networks->networks == NULL) {
        networks->length = 1;
        networks->networks = malloc(sizeof(stat_network));
      } else {
        networks->length++;
        struct stat_network *tmp;
        tmp = realloc(networks->networks, networks->length * sizeof(stat_network));
        if (tmp == NULL) free(networks->networks);
        networks->networks = tmp;
      }
      if (networks->networks == NULL) return 0;
      networks->networks[networks->length - 1] = net;
    }
  }

  if (fclose(procnetdev) != 0) return 0;

  return 1;
}

void get_host_ip(char *host_ip_address)
{
  FILE *hipaddr;
  hipaddr = popen("xe host-param-get uuid=$(xe pool-param-get uuid=`"
    "xe pool-list --minimal 2>/dev/null` param-name=master 2>/dev/null) "
    "param-name=address 2>/dev/null", "r");
  unsigned int x = 0;
  if (hipaddr != NULL) {
    char line[512];
    if (fgets(line, sizeof(line), hipaddr)) {
      for (x = 0; x < MIN(strlen(line), vmip_length); x++) {
        if (isspace(line[x])) break;
        host_ip_address[x] = line[x];
      }
    }
  }
  host_ip_address[x] = '\0';
  pclose(hipaddr);
  if (strlen(host_ip_address) == 0) {
    snprintf(host_ip_address, vmip_length, "127.0.0.1");
  }
}

void get_extra_data_of_vm(unsigned int domid, char *extra_data, unsigned int extra_data_size)
{
  bzero(extra_data, extra_data_size);
  FILE *ed;
  char command[60];
  sprintf(command, "xenstore-read /local/domain/%u/extradata 2>/dev/null", domid);
  ed = popen(command, "r");
  if (ed != NULL) {
    fgets(extra_data, extra_data_size, ed);
    unsigned int l = strlen(extra_data);
    if (l > 0) extra_data[l - 1] = '\0'; // remove newline
  }
  pclose(ed);
}
