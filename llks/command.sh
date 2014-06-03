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

leave() {
  echo $@
  exit 1
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

detach)
  [[ $VMNAME == "" ]] && exit 1
  DISKNAME="DTP_Windows_2003_c"
  IFS=$','
  VDI=($(xe vdi-list name-label="${DISKNAME}_Pending" --minimal))
  [[ ${#VDI[@]} -ne 0 ]] && leave "Has pending disk."
  VBD=($(xe vbd-list vm-name-label="${VMNAME}" vdi-name-label="${DISKNAME}" params=userdevice --minimal) 0)
  IFS=$'\n'
  MAXDEVICE=$(echo "${VBD[*]}" | sort -nr | head -n1)
  IFS=$','
  VBD=($(xe vbd-list vm-name-label="${VMNAME}" vdi-name-label="${DISKNAME}" userdevice="${MAXDEVICE}" params=uuid --minimal))
  [[ ${#VBD[@]} -ne 1 ]] && leave "Can't find VBD."
  VDI=($(xe vbd-list vm-name-label="${VMNAME}" vdi-name-label="${DISKNAME}" userdevice="${MAXDEVICE}" params=vdi-uuid --minimal))
  [[ ${#VDI[@]} -ne 1 ]] && leave "Can't find VDI."
  VM=($(xe vbd-list vm-name-label="${VMNAME}" vdi-name-label="${DISKNAME}" userdevice="${MAXDEVICE}" params=vm-uuid --minimal))
  [[ ${#VM[@]} -ne 1 ]] && leave "Can't find VM."
  xe vbd-unplug uuid="${VBD[0]}" && xe vbd-destroy uuid="${VBD[0]}" && \
  xe vdi-param-set name-label="${DISKNAME}_Pending" uuid="${VDI[0]}"
  CODE=$?
  if [[ $CODE -eq 0 ]]; then
    echo "Done."
    exit 0
  else
    leave "Error with status code: $CODE."
  fi
  ;;

attach)
  [[ $VMNAME == "" ]] && exit 1
  DISKNAME="DTP_Windows_2003_c"
  IFS=$','
  UUID=$(xe vm-list name-label="${VMNAME}" --minimal)
  [[ $UUID == "" ]] && leave "Can't find VM."
  VDI=($(xe vdi-list name-label="${DISKNAME}_Pending" --minimal))
  [[ ${#VDI[@]} -ne 1 ]] && leave "Can't find VDI."
  NEWVBD=$(xe vbd-create vm-uuid="${UUID}" device=autodetect vdi-uuid="${VDI[0]}" bootable=false mode=RW type=Disk)
  [[ $NEWVBD == "" ]] && leave "Can't create new VBD."
  xe vbd-plug uuid="${NEWVBD}" && xe vdi-param-set name-label="${DISKNAME}" uuid="${VDI[0]}"
  if [[ $CODE -eq 0 ]]; then
    echo "Done."
    exit 0
  else
    leave "Error with status code: $CODE."
  fi
  ;;

*)
  echo "Unknown command."
  exit 1
  ;;
esac

eval $COMMAND
