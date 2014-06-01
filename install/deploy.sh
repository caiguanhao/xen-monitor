#!/bin/bash

LISTENPASSWD="ExamplePassword"
DESTIP="127.0.0.1"
DESTPORT="8124"
WINDOWSUSERNAME="administrator"
WINDOWSPASSWORD="ExamplePassword"

for argument in "$@"; do
  case "$argument" in
  -v) shift; VERBOSE=1 ;;
  esac
done

set -e

test_last_command() {
  CODE=$?
  if [[ $VERBOSE -ne 1 ]]; then
    if [[ $CODE -eq 0 ]]; then
      echo -e "\033[32mOK\033[0m"
    else
      echo -e "\033[31mFAIL\033[0m"
      exit $CODE
    fi
  else
    echo
    if [[ $CODE -gt 0 ]]; then
      exit $CODE
    fi
  fi
}

test_last_command_no_exit() {
  CODE=$?
  if [[ $VERBOSE -ne 1 ]]; then
    if [[ $CODE -eq 0 ]]; then
      echo -e "\033[32mOK\033[0m"
    else
      echo -e "\033[31mFAIL\033[0m"
    fi
  else
    echo
  fi
}

status() {
  if [[ $VERBOSE -ne 1 ]]; then
    printf "$@"
  else
    echo -e "\033[36m$@\033[0m"
  fi
}

kill_shell_script() {
  ps -A -o pid,cmd | awk '($2 ~ /bash/ && $3 ~ /'$1'/) || $2 ~ /'$1'/ { print $1 }' | xargs --no-run-if-empty kill
}

if [[ $VERBOSE -eq 1 ]]; then
  echo
  echo Connected.
  echo
  STDOUT=/dev/stdout
  STDERR=/dev/stderr
else
  echo -e "\033[32mOK\033[0m"
  STDOUT=/dev/null
  STDERR=/dev/null
fi

status "Downloading xen-monitor source ... "
rm -rf /opt/xen-monitor-master
curl -L# https://github.com/caiguanhao/xen-monitor/archive/master.tar.gz \
  -o /opt/xen-monitor.tar.gz 1>$STDOUT 2>$STDERR
tar xfvz /opt/xen-monitor.tar.gz -C /opt 1>$STDOUT 2>$STDERR
cd /opt/xen-monitor-master
test_last_command

status "Installing xen-monitor ... "
make install 1>$STDOUT 2>$STDERR
test_last_command

set +e

status "Stopping screenshot ... "
kill_shell_script screenshot.sh
kill_shell_script screenshot-timeout.sh
test_last_command_no_exit

kill_shell_script null.sh
kill_shell_script null-timeout.sh

status "Stopping listen ... "
pkill listen 1>$STDOUT 2>$STDERR
test_last_command_no_exit

status "Stopping send ... "
pkill send 1>$STDOUT 2>$STDERR
test_last_command_no_exit

status "Stopping nginx ... "
pkill nginx 1>$STDOUT 2>$STDERR
test_last_command_no_exit

set -e

status "Writing scripts and configurations ... "
echo $LISTENPASSWD > /etc/listen.passwd
mkdir -p /etc/xen-monitor
cp -f /opt/xen-monitor-master/llks/null.sh /etc/xen-monitor/null.sh
cp -f /opt/xen-monitor-master/llks/null-timeout.sh /etc/xen-monitor/null-timeout.sh
cp -f /opt/xen-monitor-master/llks/screenshot.sh /etc/xen-monitor/screenshot.sh
cp -f /opt/xen-monitor-master/llks/screenshot-timeout.sh /etc/xen-monitor/screenshot-timeout.sh
cp -f /opt/xen-monitor-master/llks/command.sh /etc/xen-monitor/command.sh
chmod 700 /etc/xen-monitor/null.sh \
          /etc/xen-monitor/null-timeout.sh \
          /etc/xen-monitor/screenshot.sh \
          /etc/xen-monitor/screenshot-timeout.sh \
          /etc/xen-monitor/command.sh

cp -f /opt/xen-monitor-master/llks/nginx.conf /etc/xen-monitor/nginx.conf
cp -f /opt/xen-monitor-master/llks/Ubuntu-L.ttf /etc/xen-monitor/Ubuntu-L.ttf

sed -i -e "s/^USERNAME=.*$/USERNAME=\"${WINDOWSUSERNAME}\"/" \
       -e "s/^PASSWORD=.*$/PASSWORD=\"${WINDOWSPASSWORD}\"/" \
       /etc/xen-monitor/null.sh
sed -i 's#^FONTFILE=.*$#FONTFILE=\"/etc/xen-monitor/Ubuntu-L.ttf\"#' \
       /etc/xen-monitor/screenshot.sh
sed -i -e "s/^WINDOWSUSERNAME=.*$/WINDOWSUSERNAME=\"${WINDOWSUSERNAME}\"/" \
       -e "s/^WINDOWSPASSWORD=.*$/WINDOWSPASSWORD=\"${WINDOWSPASSWORD}\"/" \
       /etc/xen-monitor/command.sh
test_last_command

status "Starting nginx ... "
/usr/local/nginx/sbin/nginx -c /etc/xen-monitor/nginx.conf 1>$STDOUT 2>$STDERR
test_last_command

status "Starting send ... "
send -i $DESTIP -p $DESTPORT -s 5 -n /etc/xen-monitor/null-timeout.sh -D 1>$STDOUT 2>$STDERR
test_last_command

status "Starting listen ... "
listen -r /etc/xen-monitor/command.sh -D 1>$STDOUT 2>$STDERR
test_last_command

status "Starting screenshot ... "
/etc/xen-monitor/screenshot-timeout.sh 1>$STDOUT 2>$STDERR &
test_last_command

status "Updating iptables ... "
sed -i -e '/dport 3333/d' -e '/dport 54321/d' \
  -e '/dport 80/a -A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 3333 -j ACCEPT' \
  -e '/dport 80/a -A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 54321 -j ACCEPT' \
  /etc/sysconfig/iptables
/etc/init.d/iptables restart 1>$STDOUT 2>$STDERR
test_last_command

echo -e "\033[32mDone.\033[0m"
