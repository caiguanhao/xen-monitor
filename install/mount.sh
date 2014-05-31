#!/bin/bash

SSH="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=error -o PubkeyAuthentication=no"

IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    echo Processing ${line[0]}...
    CMD="
if mount | grep /Media >/dev/null; then
  echo -e \"\033[32mAlready mounted.\033[0m\"
else
  mkdir -p /Media
  echo Mounting...
  mount -t cifs \
    -o username=${WINDOWSUSERNAME},password=${WINDOWSPASSWORD} \
    //${line[0]%.*}.$((${line[0]##*.} + 1))/Media /Media
  echo Mounted.
fi
"
    sshpass -p "${line[1]}" $SSH root@${line[0]} "$CMD"
    CODE=$?
    if [[ $CODE -ne 0 ]]; then
      echo -e "\033[31mError with return code $CODE.\033[0m"
    fi
    echo
  fi
done
