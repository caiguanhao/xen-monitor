#!/bin/bash

TIMEOUT=5
DIR=$(dirname -- "$0")
SCRIPT="$DIR/screenshot.sh"

alarm() {
  perl -e 'alarm shift; exec @ARGV' "$@";
}

alarm $TIMEOUT $SCRIPT
