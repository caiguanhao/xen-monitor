#!/bin/bash

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This file is used to be included in other bash script file."
  exit 1
}

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

SSHARGS="-t -t"
if [[ $INTERACTIVE -eq 1 ]]; then
  SSHARGS=""
fi

if [[ ! -z $VERBOSE ]]; then
  ARGS="-v"
  # SSHARGS="${SSHARGS} -v"
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
    Host="${line[0]}"
    Password="${line[1]}"
    screen -S install $SCREENARGS \
      $DIRNAME/ssh.sh \
        -h "$Host" \
        -p "$Password" \
        -a "$SSHARGS" \
        $ARGS "$CMD"
    COUNT=$((COUNT + 1))
  fi
done

if [[ $COUNT -gt 0 ]]; then
  screen -r install
fi

exit 0
