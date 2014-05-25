#!/bin/bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This file is used to be included in other bash script file."
  exit 1
}

case $1 in

install)
CMD="
curl -Ls https://github.com/caiguanhao/xen-monitor/raw/master/install/install.sh | bash;
exec bash
"
source "${DIRNAME}/tasks/screen.sh"
exit 0
;;


deploy)
CMD="
rm -rf /opt/xen-monitor-master;
curl -Ls https://github.com/caiguanhao/xen-monitor/archive/master.tar.gz -o /opt/xen-monitor.tar.gz;
tar xfz /opt/xen-monitor.tar.gz -C /opt;
cd /opt/xen-monitor-master;
make install >/dev/null;

echo ${LISTENPASSWD} > /etc/listen.passwd;

mkdir -p /etc/xen-monitor;
cp -f /opt/xen-monitor-master/llks/null.sh /etc/xen-monitor/null.sh;
cp -f /opt/xen-monitor-master/llks/screenshot.sh /etc/xen-monitor/screenshot.sh;
cp -f /opt/xen-monitor-master/llks/screenshot-timeout.sh /etc/xen-monitor/screenshot-timeout.sh;
cp -f /opt/xen-monitor-master/llks/command.sh /etc/xen-monitor/command.sh;
chmod 700 /etc/xen-monitor/null.sh \
          /etc/xen-monitor/screenshot.sh \
          /etc/xen-monitor/screenshot-timeout.sh \
          /etc/xen-monitor/command.sh;

cp -f /opt/xen-monitor-master/llks/nginx.conf /etc/xen-monitor/nginx.conf;
cp -f /opt/xen-monitor-master/llks/Ubuntu-L.ttf /etc/xen-monitor/Ubuntu-L.ttf;

sed -i -e 's/^USERNAME=.*$/USERNAME=${WINDOWSUSERNAME}/' \
       -e 's/^PASSWORD=.*$/PASSWORD=${WINDOWSPASSWORD}/' \
       /etc/xen-monitor/null.sh;
sed -i 's#^FONTFILE=.*\$#FONTFILE=\"/etc/xen-monitor/Ubuntu-L.ttf\"#' \
       /etc/xen-monitor/screenshot.sh;
sed -i -e 's/^WINDOWSUSERNAME=.*$/WINDOWSUSERNAME=${WINDOWSUSERNAME}/' \
       -e 's/^WINDOWSPASSWORD=.*$/WINDOWSPASSWORD=${WINDOWSPASSWORD}/' \
       /etc/xen-monitor/command.sh;

pkill listen;
pkill send;
pkill nginx;

listen -r /etc/xen-monitor/command.sh -D;
send -i ${DESTIP} -p ${DESTPORT} -s 5 -n /etc/xen-monitor/null.sh \
  -b /etc/xen-monitor/screenshot-timeout.sh -D;
/usr/local/nginx/sbin/nginx -c /etc/xen-monitor/nginx.conf;

sed -i -e '/dport 3333/d' -e '/dport 54321/d' \
  -e '/dport 80/a -A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 3333 -j ACCEPT' \
  -e '/dport 80/a -A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 54321 -j ACCEPT' \
  /etc/sysconfig/iptables;

/etc/init.d/iptables restart >/dev/null;
"
source "${DIRNAME}/tasks/install.sh"
exit 0
;;


dry-run|run)
echo "Usage: $0 [dry-run|run] [all|dom-id|name-label] [get|send|login] [arguments]"
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
source "${DIRNAME}/tasks/install.sh"
exit 0
;;


connect)
COUNT=0
INTERACTIVE=1
source "${DIRNAME}/tasks/screen.sh"
exit 0
;;


*)
echo "Usage: $0 (install|deploy|dry-run|run|connect)"
exit 0
;;

esac
