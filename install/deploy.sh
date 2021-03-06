#!/bin/bash

LISTENPASSWD="ExamplePassword"
DESTIP="127.0.0.1"
DESTPORT="8124"
WINDOWSUSERNAME="administrator"
WINDOWSPASSWORD="ExamplePassword"
REMOTEHOST="127.0.0.1"
HOSTIP="127.0.0.1"

HOSTIPTEXT="$HOSTIP"
O=$((15 - ${#HOSTIPTEXT}))
[[ $O -gt 0 ]] && HOSTIPTEXT="$HOSTIPTEXT$(printf '.%.0s' $(seq 1 1 $O))"

for argument in "$@"; do
  case "$argument" in
  -v) shift; VERBOSE=1 ;;
  esac
done

set -e

test_last_command() {
  CODE=$?
  if [[ $VERBOSE -ne 1 ]]; then
    echo -ne "\033[36m[$HOSTIPTEXT] \033[0m"
    if [[ $CODE -eq 0 ]]; then
      echo -e "${CURRENTSTATUS}\033[32mOK\033[0m"
    else
      echo -e "${CURRENTSTATUS}\033[31mFAIL\033[0m"
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
    echo -ne "\033[36m[$HOSTIPTEXT] \033[0m"
    if [[ $CODE -eq 0 ]]; then
      echo -e "${CURRENTSTATUS}\033[32mOK\033[0m"
    else
      echo -e "${CURRENTSTATUS}\033[31mFAIL\033[0m"
    fi
  else
    echo
  fi
}

CURRENTSTATUS=

status() {
  CURRENTSTATUS="$@"
  if [[ $VERBOSE -ne 1 ]]; then
    echo -ne "\033[36m[$HOSTIPTEXT] \033[0m"
    echo "$CURRENTSTATUS"
  else
    echo -e "\033[36m$CURRENTSTATUS\033[0m"
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
  # echo -e "\033[32mOK\033[0m"
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

status "Terminating screen ... "
screen -S XenMonitor -X quit 1>$STDOUT 2>$STDERR
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
screen -S XenMonitor -d -m -t send send -i $DESTIP -p $DESTPORT -s 5 -n /etc/xen-monitor/null-timeout.sh 1>$STDOUT 2>$STDERR
test_last_command

status "Starting listen ... "
screen -S XenMonitor -X screen -t listen listen -r /etc/xen-monitor/command.sh 1>$STDOUT 2>$STDERR
test_last_command

status "Starting screenshot ... "
screen -S XenMonitor -X screen -t screenshot /etc/xen-monitor/screenshot-timeout.sh 1>$STDOUT 2>$STDERR
test_last_command

status "Updating iptables ... "
sed -i -e '/dport 3333/d' -e '/dport 54321/d' \
  -e '/dport 80/a -A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 3333 -j ACCEPT' \
  -e '/dport 80/a -A RH-Firewall-1-INPUT -m state --state NEW -m tcp -p tcp --dport 54321 -j ACCEPT' \
  /etc/sysconfig/iptables
/etc/init.d/iptables restart 1>$STDOUT 2>$STDERR
test_last_command

status "Allowing virtual machines to auto-start ... "
IFS=$','
for UUID in $(xe pool-list --minimal); do
  xe pool-param-set uuid=$UUID other-config:auto_poweron=true
done
for UUID in $(xe vm-list --minimal); do
  xe vm-param-set uuid=$UUID other-config:auto_poweron=true
done
test_last_command

status "Making startup script ... "
echo "#!/bin/bash
/etc/xen-monitor/deploy.sh" > /etc/xen-monitor/start.sh
chmod +x /etc/xen-monitor/start.sh
sed -i '/# run xen-monitor - start/,/# run xen-monitor - end/d' /etc/rc.local
echo "# run xen-monitor - start
/etc/xen-monitor/start.sh
# run xen-monitor - end" >> /etc/rc.local
test_last_command

status "Writing index.html ... "
test -f /opt/xensource/www/XenCenter.iso && {
  mv /opt/xensource/www /opt/xensource/www-old 1>$STDOUT 2>$STDERR
}
mkdir -p /opt/xensource/www 1>$STDOUT 2>$STDERR
URL="http://${REMOTEHOST}/host/${HOSTIP}"
echo "<html>
  <title>${HOSTIP}</title>
  <meta http-equiv=\"refresh\" content=\"0; url=$URL\">
<head>
</head>
<body>
  <p>Redirecting to <a href=\"$URL\">$URL</a>.</p>
</body>
</html>" > /opt/xensource/www/index.html
test_last_command

echo -ne "\033[36m[$HOSTIPTEXT] \033[0m"
echo -e "\033[32mDone.\033[0m"
