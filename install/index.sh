#!/bin/bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This file is used to be included in other bash script file."
  exit 1
}

Usage() {
  echo "Usage: $0 (install|deploy|dry-run|run|connect|whitelist|check|mount)
  - install     create screens for each server and install software there
  - deploy      update configurations and restart software on each server
  - run         [all|dom-id|name-label] [get|send|login] [arguments]
                run vnc commands on each server while dry-run is for test
  - connect     create screens to log into each server or the hosts in arguments
  - whitelist   make and write whitelist file to each server
  - check       check undone servers after all screens are terminated
  - mount       mount /Media directory to D:\\Media of the first VM
"
}

UseParallels() {
  source "${DIRNAME}/tasks/parallels.sh"
}

UseScreen() {
  source "${DIRNAME}/tasks/screen.sh"
}

case $1 in

install)
VERBOSE=0
IFS=''
CMD="
cat <<'INSTALL' > /etc/xen-monitor/install.sh
$(cat ${DIRNAME}/install.sh)
INSTALL
sed -i 's/^HOSTIP=.*$/HOSTIP=\"{{HOSTIP}}\"/' \
       /etc/xen-monitor/install.sh
chmod 700 /etc/xen-monitor/install.sh
/etc/xen-monitor/install.sh
"
UseParallels
exit 0
;;


deploy)
VERBOSE=0
IFS=''
CMD="
cat <<'DEPLOY' > /etc/xen-monitor/deploy.sh
$(cat ${DIRNAME}/deploy.sh)
DEPLOY
sed -i -e 's/^LISTENPASSWD=.*$/LISTENPASSWD=\"${LISTENPASSWD}\"/' \
       -e 's/^DESTIP=.*$/DESTIP=\"${DESTIP}\"/' \
       -e 's/^DESTPORT=.*$/DESTPORT=\"${DESTPORT}\"/' \
       -e 's/^WINDOWSUSERNAME=.*$/WINDOWSUSERNAME=\"${WINDOWSUSERNAME}\"/' \
       -e 's/^WINDOWSPASSWORD=.*$/WINDOWSPASSWORD=\"${WINDOWSPASSWORD}\"/' \
       -e 's/^REMOTEHOST=.*$/REMOTEHOST=\"${REMOTEHOST}\"/' \
       -e 's/^HOSTIP=.*$/HOSTIP=\"{{HOSTIP}}\"/' \
       /etc/xen-monitor/deploy.sh
chmod 700 /etc/xen-monitor/deploy.sh
/etc/xen-monitor/deploy.sh $([[ $VERBOSE -eq 1 ]] && echo -v)
"
UseParallels
exit 0
;;


dry-run|run)
RUN="eval"
if [[ $1 == "dry-run" ]]; then
  RUN="echo"
  CONFIRMSTART=No
  PARALLEL=1
  RUNONEANDEXIT=1
fi
case $3 in
get)
  COMMAND="\${VNC} key super-r && sleep 1 && \${VNC} type get key space type $4 key enter"
  ;;
send)
  COMMAND="\${VNC} ${*:4}"
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
  COMMAND="\${VNC} key space && sleep 1 && \${VNC} key ctrl-alt-del && sleep 1 && \${VNC} key alt-u type $WINDOWSUSERNAME key alt-p $PASSWD key enter"
  ;;
*)
  echo "Unknown command."
  exit 1
  ;;
esac
CMD="
FIND=\"$2\";
IFS=$'\n';
for VM in \`xl list\`; do
  IFS=$' \t';
  VM=(\$VM);
  if [[ \${#FIND} -gt 0 ]] && [[ \${FIND} != \"all\" ]]; then
    if [[ \${VM[0]} != \${FIND} ]] && [[ \${VM[1]} != \${FIND} ]]; then
      continue;
    fi;
  fi;
  if [[ \${VM[1]} -gt 0 ]]; then
    VNC=\"vncdo -s localhost:\";
    VNC=\"\${VNC}\$((\`xenstore-read /local/domain/\${VM[1]}/console/vnc-port\` - 5900))\";
    CMD=\"$COMMAND\";
    $RUN \$CMD;
  fi;
done
"
UseParallels
exit 0
;;


connect)
CMD=
INTERACTIVE=1
_DIST=
IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    for var in ${*:2}; do
      if [[ "${line[0]}" == "$var" ]]; then
        _DIST="${_DIST}$origline
"
      fi
    done
  fi
done
if [[ $# -ge 2 ]] && [[ $_DIST == "" ]]; then
  echo "No servers matching any of ${*:2}."
  exit 1
fi
if [[ ${_DIST} != "" ]]; then
  DIST="${_DIST}"
fi
UseScreen
exit 0
;;


whitelist)
WHITELIST=
COUNT=0
IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    if [[ $WHITELIST == "" ]]; then
      WHITELIST="${line[0]}"
    else
      WHITELIST="${WHITELIST}
${line[0]}"
    fi
    COUNT=$((COUNT + 1))
  fi
done
CMD=$(cat <<SSH
cat <<CAT > $REMOTEAPPPATH/whitelist.txt
$WHITELIST
CAT
LINES=(\$(wc -l $REMOTEAPPPATH/whitelist.txt))
echo Number of lines in whitelist.txt ... \${LINES[0]}
if [[ \${LINES[0]} -eq $COUNT ]]; then
  echo -e "\033[32mSuccessfully updated $REMOTEAPPPATH/whitelist.txt.\033[0m"
else
  echo -e "\033[31mError updating $REMOTEAPPPATH/whitelist.txt.\033[0m"
fi
SSH
)
echo Writing $COUNT items to remote whitelist.txt...
ssh -t $REMOTEHOST $CMD
;;


check)
sort done -o done
sort all -o all

comm -13 done all > undone

IFS=$' \t'
DONE=(`wc -l done`)
UNDONE=(`wc -l undone`)

echo There are ${DONE[0]} done and ${UNDONE[0]} undone.

if [[ ${UNDONE[0]} -eq 0 ]]; then
  rm -f all undone
fi
;;


mount)
source "${DIRNAME}/mount.sh"
;;


*)
Usage
;;

esac
