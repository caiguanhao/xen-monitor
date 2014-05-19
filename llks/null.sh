#!/bin/bash

set -e

USERNAME=administrator
PASSWORD=ExamplePassword

LC_COLLATE=C

DOMID=$1

if [[ $DOMID == "" ]]; then
  echo Please provide domid.
  exit 1
fi

VNCPORT="`xenstore-read /local/domain/$DOMID/console/vnc-port`"
PORT=$(($VNCPORT - 5900))

PASSWD=
ISLOWER=0
for (( i=0; i<${#PASSWORD}; i++ )); do
  case ${PASSWORD:$i:1} in
    [A-Z])
      PASSWD="$PASSWD key shift-${PASSWORD:$i:1}"
      ISLOWER=0
      ;;
    [a-z0-9])
      if [[ $ISLOWER -eq 0 ]]; then
        PASSWD="$PASSWD type "
      fi
      PASSWD="$PASSWD${PASSWORD:$i:1}"
      ISLOWER=1
      ;;
  esac
done

vncdo -s localhost:$PORT key space key ctrl-alt-del \
  key alt-u type $USERNAME \
  key alt-p $PASSWD\
  key enter

sleep 5
