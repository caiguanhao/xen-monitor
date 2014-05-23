#!/bin/bash

WINDOWSUSERNAME=Administrator
WINDOWSPASSWORD=ExamplePassword

FIND="$1"
IFS=$'\n'
for VM in `xl list`; do
  IFS=$' \t'
  VM=($VM)
  if [[ ${#FIND} -gt 0 ]] && [[ ${FIND} != "all" ]]; then
    if [[ ${VM[0]} != ${FIND} ]] && [[ ${VM[1]} != ${FIND} ]]; then
      continue
    fi
  fi
  if [[ ${VM[1]} -gt 0 ]]; then
    VNC="vncdo -s localhost:"
    VNC="${VNC}$((`xenstore-read /local/domain/${VM[1]}/console/vnc-port` - 5900))"
    break
  fi
done

if [[ $VNC == "" ]]; then
  echo No virtual machine found.
  exit 1
fi

case $2 in
get)
  COMMAND="$VNC key super-r && sleep 1 && $VNC type get key space type $4 key enter"
  ;;
send)
  COMMAND="$VNC ${*:3}"
  ;;
login)
  PASSWD=
  ISLOWER=0
  for (( i=0; i<${#WINDOWSPASSWORD}; i++ )); do
    case ${WINDOWSPASSWORD:$i:1} in
      [A-Z])
        PASSWD="$PASSWD key shift-${WINDOWSPASSWORD:$i:1}"
        ISLOWER=0
        ;;
      [a-z0-9])
        if [[ $ISLOWER -eq 0 ]]; then
          PASSWD="$PASSWD type "
        fi
        PASSWD="$PASSWD${WINDOWSPASSWORD:$i:1}"
        ISLOWER=1
        ;;
    esac
  done
  COMMAND="$VNC key space && sleep 1 && $VNC key ctrl-alt-del && sleep 1 && $VNC key alt-u type $WINDOWSUSERNAME key alt-p $PASSWD key enter"
  ;;
*)
  echo "Unknown command."
  exit 1
  ;;
esac

$COMMAND
