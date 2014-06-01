#!/bin/bash

# Take screenshot persistently
# Use Ctrl-C or `kill -f screenshot-timeout.sh` to terminate

TIMEOUT=30
DIR=$(dirname -- "$0")
SCRIPT="$DIR/screenshot.sh"

alarm() {
  perl -e 'alarm shift; exec @ARGV' "$@";
}

while :; do
  alarm $TIMEOUT $SCRIPT
  sleep 1
done
