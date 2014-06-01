#!/bin/bash

TIMEOUT=20
DIR=$(dirname -- "$0")
SCRIPT="$DIR/null.sh"

alarm() {
  perl -e 'alarm shift; exec @ARGV' "$@";
}

alarm $TIMEOUT $SCRIPT "$@"
