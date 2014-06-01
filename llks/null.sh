#!/bin/bash

set -e

USERNAME=administrator
PASSWORD=ExamplePassword

DOMID=$1

if [[ $DOMID == "" ]]; then
  echo Please provide domid.
  exit 1
fi

convert_to_vncdo_command() {
  VAR=$1
  STR=$2
  LC_COLLATE=C
  ISLOWER=0
  OUT=
  for (( i=0; i<${#STR}; i++ )); do
    case ${STR:$i:1} in
      [A-Z])
        OUT="$OUT key shift-${STR:$i:1}"
        ISLOWER=0
        ;;
      [a-z0-9])
        if [[ $ISLOWER -eq 0 ]]; then
          OUT="$OUT type "
        fi
        OUT="$OUT${STR:$i:1}"
        ISLOWER=1
        ;;
      " ")
        OUT="$OUT key space "
        ISLOWER=0
        ;;
    esac
  done
  eval $VAR=\$OUT
}

VNCPORT=$(xenstore-read /local/domain/$DOMID/console/vnc-port)
PORT=$(($VNCPORT - 5900))

convert_to_vncdo_command PASSWD "$PASSWORD"

/usr/local/bin/python2.7 /usr/local/bin/vncdo -s localhost:$PORT \
  key space pause 1 key ctrl-alt-del pause 1 \
  key alt-u type $USERNAME \
  key alt-p $PASSWD\
  key enter

sleep 5
