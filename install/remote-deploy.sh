#!/bin/bash

# host     session name   app path           app port   redis-db   receive port
NODES="
x.cgh.io   XdotCGHdotIO   /srv/xen-monitor   23456      0          8124
x1.cgh.io  X1dotCGHdotIO  /srv/xen-monitor2  23457      1          8125
x2.cgh.io  X2dotCGHdotIO  /srv/xen-monitor   23456      0          8124
x3.cgh.io  X3dotCGHdotIO  /srv/xen-monitor2  23457      1          8125
x4.cgh.io  X4dotCGHdotIO  /srv/xen-monitor   23456      0          8124
x5.cgh.io  X5dotCGHdotIO  /srv/xen-monitor2  23457      1          8125
"

# comment this or set this nothing if you don't want confirmation
INTERACTIVE=1

COUNT=0
IFS=$'\n'
for node in $NODES; do
  IFS=$' \t'
  line=($node)

  if [[ ${line[0]} == "#" ]] || [[ ${#line[@]} -ne 6 ]]; then
    continue
  fi

  Host="${line[0]}"
  SessionName="${line[1]}"
  AppPath="${line[2]}"
  AppPort="${line[3]}"
  RedisDB="${line[4]}"
  ReceivePort="${line[5]}"

  if [[ ! -z $INTERACTIVE ]]; then
    SKIP=0
    while :; do
      read -n 1 -p "Deploy app to $Host? Ctrl-C to exit. [Y/n] " a
      echo
      [[ $a == "Y" ]] || [[ $a == "y" ]] || [[ $a == "" ]] && break
      [[ $a == "N" ]] || [[ $a == "n" ]] && { SKIP=1; break; }
    done
    if [[ $SKIP -eq 1 ]]; then
      continue
    fi
  fi

  CMD=$(cat <<SSH
function test_last_command {
  CODE=\$?;  [[ \$CODE -eq 0 ]] && echo -e "\\033[32mOK\\033[0m" || {
             echo -e "\\033[31mFAIL\\033[0m" && exit \$CODE;        }
}
cd $AppPath
test_last_command
printf "Updating app ... "
git fetch --all >/dev/null 2>/dev/null
git reset --hard origin/master >/dev/null 2>/dev/null
npm install >/dev/null 2>/dev/null
test_last_command
echo "Current HEAD ... $(git log --pretty=format:'%Cgreen%h %s%Creset' -n 1)"
printf "Flushing Redis database $RedisDB ... "
redis-cli -n $RedisDB flushdb >/dev/null 2>/dev/null
test_last_command
printf "Quitting existing screen ... "
screen -S $SessionName -X quit >/dev/null 2>/dev/null
echo OK
sleep 1
printf "Starting app ... "
screen -dmS $SessionName -t app ./service -p $AppPort -d $RedisDB \
  >/dev/null 2>/dev/null
test_last_command
sleep 1
printf "Starting receive ... "
screen -S $SessionName -X screen -t receive ./receive -p $ReceivePort \
  -d $RedisDB >/dev/null 2>/dev/null
test_last_command
printf "Checking web app status code ... "
sleep 5
CODE=\$(curl http://$Host/socket.io/1/ -sLo /dev/null -w "%{http_code}" \
  --max-time 10)
if [[ \$CODE -eq 200 ]]; then
echo -e "\\033[32m\$CODE"
echo -e "It seems everything works fine.\\033[0m"
else
echo -e "\\033[31m\$CODE"
echo -e "It seems something went wrong.\\033[0m"
exit \$CODE
fi
SSH
)
  printf "Connecting to $Host ... "
  ssh -t $Host $CMD 2>/dev/null
  CODE=$?
  if [[ $CODE -gt 0 ]]; then
    echo -e "\033[31mFAIL\033[0m"
    exit $CODE
  fi
  COUNT=$((COUNT + 1))
  echo
done

if [[ $COUNT -eq 0 ]]; then
  echo "Nothing to do."
fi
