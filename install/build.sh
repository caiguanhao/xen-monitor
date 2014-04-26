#!/bin/bash

help() {
  echo "Usage: $0 <build-host> [build-password] [download-server]"
  echo "  Build host should be a XenServer."
  echo "  If you don't want to provide password, leave it empty (\"\")."
}

for argument in "$@"; do
  case "$argument" in
  -h|--help|-\?|help|h|\?) help; exit 0;;
  esac
done

if [[ ${#@} -lt 1 ]]; then
  echo Error: insufficient option.
  echo
  help
  exit 1
fi

set -e

CMD="
echo Connected.;
cd /opt;

echo Downloading source files...;
curl -L# https://github.com/caiguanhao/xen-monitor/archive/master.tar.gz \
  -o xen-monitor.tar.gz;
tar xfz xen-monitor.tar.gz;
cd /opt/xen-monitor-master;

echo Installing build tools...;
yum --enablerepo=base -y install gcc make;

echo Building...;
make install;

echo Packaging...;
tar cvfz send.tar.gz send;
tar cvfz listen.tar.gz listen;

echo Done.;
"

SSHPASS=
if [[ $2 != "" ]]; then
  SSHPASS=sshpass\ -p\ "$2"
fi

echo Connecting...
$SSHPASS ssh -o LogLevel=error -o PubkeyAuthentication=no \
  -n -t -t $1 $CMD

echo Downloading packages...
$SSHPASS scp -o LogLevel=error -o PubkeyAuthentication=no \
  $1:/opt/xen-monitor-master/*.tar.gz .

if [[ $3 != "" ]]; then
  echo Uploading packages...
  scp *.tar.gz $3:/srv/downloads
fi

echo All done.

exit 0
