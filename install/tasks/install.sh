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
  echo "Press Enter to start."
fi
read

PARALLEL=10
COUNT=0

rm -f done
touch done

IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    ((sshpass -p "${line[1]}" ssh -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o LogLevel=error -o PubkeyAuthentication=no \
      -n -t -t root@${line[0]} $CMD && echo $origline >> done) ;\
      echo ... ${line[0]} ; echo) &
    if [[ $((COUNT % $PARALLEL)) -eq $(($PARALLEL - 1)) ]]; then
      wait
    fi
    COUNT=$((COUNT+1))
  fi
done
wait

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
