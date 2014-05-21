#!/bin/bash

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This file is used to be included in other bash script file."
  exit 1
}

SSHARGS="-t -t"
if [[ $INTERACTIVE -eq 1 ]]; then
  SSHARGS=""
fi

IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    if [[ $COUNT -eq 0 ]]; then
      SCREENARGS="-d -m -t ${line[0]}"
    else
      SCREENARGS="-X screen -t ${line[0]}"
    fi
    screen -S install $SCREENARGS sshpass -p "${line[1]}" ssh -v \
      -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o LogLevel=error -o PubkeyAuthentication=no \
      $SSHARGS root@${line[0]} $CMD
    COUNT=$((COUNT + 1))
  fi
done

if [[ $COUNT -gt 0 ]]; then
  screen -r install
fi

exit 0
