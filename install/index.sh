#!/bin/bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This file is used to be included in other bash script file."
  exit 1
}

case $1 in

install)
CMD="
yum --enablerepo=base -y install gcc make zlib-devel openssl-devel bzip2-devel freetype-devel pcre-devel;

test -f /usr/local/bin/python2.7 || {
  echo Installing Python 2.7.6...;
  curl -L# https://www.python.org/ftp/python/2.7.6/Python-2.7.6.tgz -o /opt/Python-2.7.6.tgz;
  tar xfz /opt/Python-2.7.6.tgz -C /opt;
  cd /opt/Python-2.7.6;
  ./configure;
  make;
  make install;
};

test -f /usr/local/bin/pip || {
  curl -Ls https://bootstrap.pypa.io/get-pip.py | /usr/local/bin/python2.7;
};

/usr/local/bin/pip install PIL --allow-external PIL --allow-unverified PIL;
/usr/local/bin/pip install vncdotool;

test -f /usr/local/nginx/sbin/nginx || {
  curl -L# http://nginx.org/download/nginx-1.6.0.tar.gz -o /opt/nginx-1.6.0.tar.gz;
  tar xfz /opt/nginx-1.6.0.tar.gz -C /opt;
  cd /opt/nginx-1.6.0;
  ./configure;
  make;
  make install;
};

rm -rf /opt/xen-monitor-master;
curl -L# https://github.com/caiguanhao/xen-monitor/archive/master.tar.gz -o /opt/xen-monitor.tar.gz;
tar xfz /opt/xen-monitor.tar.gz -C /opt;
cd /opt/xen-monitor-master;
make install;

echo Done.;
"
source "${DIRNAME}/tasks/install.sh"
exit 0
;;


deploy)
CMD="
echo ${LISTENPASSWD} > /etc/listen.passwd;

mkdir -p /etc/xen-monitor;
curl -Ls https://github.com/caiguanhao/xen-monitor/raw/master/llks/null.sh -o /etc/xen-monitor/null.sh;
chmod +x /etc/xen-monitor/null.sh;
curl -Ls https://github.com/caiguanhao/xen-monitor/raw/master/llks/screenshot.sh -o /etc/xen-monitor/screenshot.sh;
chmod +x /etc/xen-monitor/screenshot.sh;
curl -Ls https://github.com/caiguanhao/xen-monitor/raw/master/llks/nginx.conf -o /etc/xen-monitor/nginx.conf;
curl -Ls https://github.com/caiguanhao/xen-monitor/raw/master/llks/Ubuntu-L.ttf -o /etc/xen-monitor/Ubuntu-L.ttf;

sed -i -e 's/^USERNAME=.*$/USERNAME=${WINDOWSUSERNAME}/' \
       -e 's/^PASSWORD=.*$/PASSWORD=${WINDOWSPASSWORD}/' \
       /etc/xen-monitor/null.sh;
sed -i 's#^FONTFILE=.*\$#FONTFILE=\"/etc/xen-monitor/Ubuntu-L.ttf\"#' \
       /etc/xen-monitor/screenshot.sh;

pkill listen;
pkill send;
pkill nginx;

listen -D;
send -i ${DESTIP} -p ${DESTPORT} -s 5 -n /etc/xen-monitor/null.sh -b /etc/xen-monitor/screenshot.sh -D;
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


*)
echo "Usage: $0 (install|deploy|run)"
exit 0
;;

esac
