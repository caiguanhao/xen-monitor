#!/bin/bash

WINDOWSUSERNAME=Administrator
WINDOWSPASSWORD=ExamplePassword

case $1 in
reboot)
  xe vm-shutdown --multiple --force
  sleep 2
  reboot
  exit 0
  ;;
esac

FIND="$1"

_IFS=$IFS
IFS=$','
for VMUUID in $(xe vm-list params=uuid --minimal); do
  VMDOMID="$(xe vm-param-get param-name=dom-id uuid=${VMUUID})"
  VMNAME="$(xe vm-param-get param-name=name-label uuid=${VMUUID})"
  if [[ ${#FIND} -gt 0 ]] && [[ ${FIND} != "all" ]]; then
    if [[ ${VMNAME} != ${FIND} ]] && [[ ${VMDOMID} != ${FIND} ]]; then
      continue
    fi
  fi
  if [[ ${VMDOMID} -gt 0 ]]; then
    VNC="/usr/local/bin/python2.7 /usr/local/bin/vncdo -s localhost:"
    VNC="${VNC}$((`xenstore-read /local/domain/${VMDOMID}/console/vnc-port` - 5900))"
    break
  fi
done
IFS=$_IFS

if [[ $VNC == "" ]]; then
  echo No virtual machine found.
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

case $2 in
get)
  convert_to_vncdo_command KEYCMD "${*:3}"
  COMMAND="$VNC key super-r pause 1 type get key space $KEYCMD key enter"
  ;;
send)
  COMMAND="$VNC ${*:3}"
  ;;
login)
  convert_to_vncdo_command PASSWD "$WINDOWSPASSWORD"
  COMMAND="$VNC key space pause 1 key ctrl-alt-del pause 1 key alt-u"
  COMMAND="$COMMAND type $WINDOWSUSERNAME key alt-p $PASSWD key enter"
  ;;
*)
  echo "Unknown command."
  exit 1
  ;;
esac

eval $COMMAND
