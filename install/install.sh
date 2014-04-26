#!/bin/bash

help() {
  echo "Usage: $0 <list-file> <dest-ip> <dest-port> [listen-password]"
  echo "  Put each <host> <password> on each line in <list-file>."
  echo "  Destination IP address <dest-ip> and port number <dest-port>."
  echo "  [listen-password] should have at least 10 characters."
}

for argument in "$@"; do
  case "$argument" in
  -h|--help|-\?|help|h|\?) help; exit 0;;
  esac
done

if [[ ${#@} -lt 3 ]]; then
  echo Error: insufficient option.
  echo
  help
  exit 1
fi

if [[ ! -f $1 ]]; then
  echo File $1 does not exist.
  exit 1
fi

DESTIP="$2"
DESTPORT="$3"

LISTENPASSWD="$4"
if [[ $LISTENPASSWD == "" ]]; then
  echo "Enter password for /etc/listen.passwd (at least 10 characters): "
  while IFS= read -p "$prompt" -r -s -n 1 char; do
    if [[ $char == $'\0' ]] ; then
      break
    fi
    if [[ $char == $'\177' ]] ; then
      prompt=$'\b \b'
      LISTENPASSWD="${LISTENPASSWD%?}"
    else
      prompt='*'
      LISTENPASSWD="$LISTENPASSWD$char"
    fi
  done
  echo
fi

if [[ ${#LISTENPASSWD} -lt 10 ]]; then
  echo "Password should have at least 10 characters."
  exit 1
fi

set -e

CMD="
curl -Ls http://d.cgh.io/send.tar.gz | tar xfz - --directory /usr/bin;
curl -Ls http://d.cgh.io/listen.tar.gz | tar xfz - --directory /usr/bin;

echo ${LISTENPASSWD} > /etc/listen.passwd;
sed -i '/dport 3333/d' /etc/sysconfig/iptables;
sed -i '/dport 80/a -A RH-Firewall-1-INPUT -m state --state NEW -m tcp \
-p tcp --dport 3333 -j ACCEPT' /etc/sysconfig/iptables;
/etc/init.d/iptables restart > /dev/null;

pkill listen; listen -D;
pkill send; send -i ${DESTIP} -p ${DESTPORT} -s 5 -D;
"

PARALLEL=10

echo -n > done

COUNT=0
while read origline; do
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    ((sshpass -p "${line[1]}" ssh -o LogLevel=error -o PubkeyAuthentication=no \
      -n -t -t root@${line[0]} $CMD && echo $origline >> done) ;\
      echo ... ${line[0]} ; echo) &
    if [[ $((COUNT % $PARALLEL)) -eq $(($PARALLEL - 1)) ]]; then
      wait
    fi
    COUNT=$((COUNT+1))
  fi
done < $1
wait

sort done -o done

echo -n > all
while read origline; do
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    echo $origline >> all
  fi
done < $1

sort all -o all

comm -13 done all > undone

DONE=(`wc -l done`)
UNDONE=(`wc -l undone`)

echo There are ${DONE[0]} done and ${UNDONE[0]} undone.

exit 0
