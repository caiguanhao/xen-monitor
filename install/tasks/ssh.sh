#!/bin/bash

Usage() {
  echo \
"Usage: $0 [OPTION] -- [COMMAND]
Required:
       -h <host>       host to connect
       <command>       command to execute
Optional:
       -p <password>   password for the host
       -a <ssh-args>   additional ssh arguments
       -v              verbose
"
  exit 0
}

for argument in "$@"; do
  case "$argument" in
  -h) shift; HOST="$1";     shift ;;
  -p) shift; PASSWORD="$1"; shift ;;
  -a) shift; SSHARGS="$1";  shift ;;
  -v) shift; VERBOSE=1            ;;
  --) shift; break                ;;
  esac
done

COMMAND="$1"

[[ -z $HOST ]] || [[ -z $COMMAND ]] && { Usage; }
[[ ! -z $PASSWORD ]] && { SSHPASS="sshpass -p $PASSWORD"; }
[[ $VERBOSE -eq 1 ]] && {
  COMMAND="VERBOSE=1
${COMMAND}"
}

echo -n "Connecting to $HOST ... "

$SSHPASS \
  ssh \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o LogLevel=error -o PubkeyAuthentication=no \
    $SSHARGS \
    root@$HOST \
    "$COMMAND"

# exec bash
