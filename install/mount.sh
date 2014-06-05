#!/bin/bash

SSH="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=error -o PubkeyAuthentication=no"

NUM=$2

IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    echo Processing ${line[0]}...
    CMD="
IP=${line[0]%.*}.$((${line[0]##*.} + $NUM))
mount | grep //\$IP | awk '{ print \$3 }' | xargs --no-run-if-empty umount
mkdir -p /Windows/${NUM}
mount -t cifs \
  -o username=${WINDOWSUSERNAME},password=${WINDOWSPASSWORD} \
  //\$IP/Media /Windows/${NUM}
mount | grep //\$IP
"
    sshpass -p "${line[1]}" $SSH root@${line[0]} "$CMD"
    CODE=$?
    if [[ $CODE -ne 0 ]]; then
      echo -e "\033[31mError with return code $CODE.\033[0m"
    fi
    echo
  fi
done
