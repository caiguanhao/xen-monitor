#!/bin/bash

help() {
  echo "Usage: $0 <list-file> [target-host]"
  echo "  Put each <host> on each line in <list-file>."
  echo "  Space and content after that on each line will be striped."
  echo "  Then secure-copy whitelist.txt to target host."
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

echo -n > whitelist.txt

COUNT=0
while read origline; do
  line=($origline)
  if [[ ${#line[0]} -gt 6 && ${#line[0]} -lt 16 ]]; then
    echo ${line[0]} >> whitelist.txt
    COUNT=$((COUNT+1))
  fi
done < $1

echo $COUNT IP addresses written to whitelist.txt.

if [[ $2 != "" ]]; then
  scp whitelist.txt $2
fi

exit 0
