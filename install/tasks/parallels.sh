#!/bin/bash

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This file is used to be included in other bash script file."
  exit 1
}

if [[ -f undone ]]; then
  DIST="$(cat undone)"
  echo "Will process file 'undone'. Press Enter to continue."
  echo "Press Ctrl-C and then remove the file if you don't want to do this. "
else
  [[ $CONFIRMSTART == "" ]] && echo "Press Enter to start."
fi
[[ $CONFIRMSTART == "" ]] && read

[[ $PARALLEL == "" ]] && PARALLEL=20
COUNT=0

rm -f done
touch done

IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    Host="${line[0]}"
    Password="${line[1]}"
    COMMAND="${CMD//\{\{HOSTIP\}\}/$Host}"
    ((sshpass -p "${Password}" ssh -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o LogLevel=error -o PubkeyAuthentication=no \
      -n -t -t root@${Host} "$COMMAND" 2>/dev/null) && echo $origline >> done) &
    if [[ $RUNONEANDEXIT -eq 1 ]]; then
      break
    fi
    if [[ $((COUNT % $PARALLEL)) -eq $(($PARALLEL - 1)) ]]; then
      wait
    fi
    COUNT=$((COUNT+1))
  fi
done
wait

if [[ $RUNONEANDEXIT -eq 1 ]]; then
  exit
fi

sort done -o done

rm -f all
touch all

IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    echo $origline >> all
  fi
done

sort all -o all

comm -13 done all > undone

IFS=$' \t'
DONE=(`wc -l done`)
UNDONE=(`wc -l undone`)

echo There are ${DONE[0]} done and ${UNDONE[0]} undone.

if [[ ${UNDONE[0]} -eq 0 ]]; then
  rm -f all undone
fi

exit 0
