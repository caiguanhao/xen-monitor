#!/bin/bash

help() {
  echo "Usage: $0 <list-file>"
  echo "  Put each <host> <password> on each line in <list-file>."
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

if [[ ! -f $1 ]]; then
  echo File $1 does not exist.
  exit 1
fi

set -e

CMD="
rm -f /usr/bin/send /usr/bin/listen /etc/listen.passwd;

sed -i '/dport 3333/d' /etc/sysconfig/iptables;
/etc/init.d/iptables restart > /dev/null;

pkill listen;
pkill send;
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
