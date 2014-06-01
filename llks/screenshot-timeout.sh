#!/bin/bash

# Take screenshot persistently
# Use Ctrl-C or `pkill -f screenshot-timeout.sh` to terminate

MAXTIME=30
MINTIME=5

DIR=$(dirname -- "$0")
SCRIPT="$DIR/screenshot.sh"

alarm() {
  perl -e 'alarm shift; exec @ARGV' "$@"
}

while :; do
  STARTTIME=$(date +%s)
  alarm $MAXTIME $SCRIPT >/dev/null 2>/dev/null
  ENDTIME=$(date +%s)
  TOSLEEP=$(($MINTIME - $ENDTIME + $STARTTIME))
  if [[ $TOSLEEP -lt 1 ]]; then
    TOSLEEP=1
  fi
  sleep $TOSLEEP
done
