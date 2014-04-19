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
  char *tmp;
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

  tmp = (char *)malloc( sizeof(char) );
  if (regexec (&r, line, num, matches, REG_EXTENDED) == 0){
    for (i = 1; i < num; i++) {
      /* The expression matches are empty sometimes so we need to check it
         first */
      if (matches[i].rm_eo - matches[i].rm_so > 0) {
        /* Col variable contains current id of non-empty match */
        col++;
        tmp = (char *)realloc(tmp, (matches[i].rm_eo -
              matches[i].rm_so + 1) * sizeof(char));
        for (x = matches[i].rm_so; x < matches[i].rm_eo; x++)
          tmp[x - matches[i].rm_so] = line[x];

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

        memset(tmp, 0, matches[i].rm_eo - matches[i].rm_so);
      }
    }
  }

  free(tmp);
  regfree(&r);

  return 0;
}

int collect_virtual_machines_info(virtual_machines *vm)
{
  FILE *xevmlist;
  xevmlist = popen(xe_vm_list_command, "r");
  if (xevmlist == NULL) {
    perror("error executing xe command");
    return 0;
  }
  char line[512];
  if (vm == NULL) {
    vm->length = 0;
  }

  int ret;
  int x = 0, l = 0;
  regex_t r;
  regmatch_t m[2];

  char *regex = "[ ]*([^ ]*)$";

  if ((ret = regcomp(&r, regex, REG_EXTENDED | REG_NEWLINE))) {
    regfree(&r);
    return ret;
  }

  while (fgets(line, sizeof(line), xevmlist)) {
    if (strlen(line) < 2 || regexec(&r, line, 2, m, REG_EXTENDED) != 0) {
      continue;
    }
    switch (l % 3) {
    case 0: {
      vm->length = (int)(l / 3) + 1;

      char **tmp2 = realloc(vm->uuids, vm->length * sizeof(char *));
      if (tmp2 == NULL) free(vm->uuids);
      vm->uuids = tmp2;
      vm->uuids[vm->length-1] = malloc((vmuuid_length + 1) * sizeof(char));

      for (x = 0; x < MIN(m[1].rm_eo - m[1].rm_so, vmuuid_length); x++)
        vm->uuids[vm->length-1][x] = line[m[1].rm_so + x];
      vm->uuids[vm->length-1][x] = '\0';
      break;
    }
    case 1: {
      unsigned int* tmp = realloc(vm->domids, vm->length * sizeof(unsigned int));
      if (tmp == NULL) free(vm->domids);
      vm->domids = tmp;

      char domid[6];
      for (x = 0; x < MIN(m[1].rm_eo - m[1].rm_so, 5); x++)
        domid[x] = line[m[1].rm_so + x];
      domid[x] = '\0';
      sscanf(domid, "%u", &vm->domids[vm->length-1]);
      break;
    }
    case 2: {
      char **tmp3 = realloc(vm->ips, vm->length * sizeof(char *));
      if (tmp3 == NULL) free(vm->ips);
      vm->ips = tmp3;
      vm->ips[vm->length-1] = malloc((vmip_length + 1) * sizeof(char));

      for (x = 0; x < MIN(m[1].rm_eo - m[1].rm_so, vmip_length); x++)
        vm->ips[vm->length-1][x] = line[m[1].rm_so + x];
      vm->ips[vm->length-1][x] = '\0';
      break;
    }
    }
    l++;
  }

  regfree(&r);

  if (pclose(xevmlist) != 0) return 0;

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
