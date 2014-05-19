#!/bin/bash

ROOT="/srv/xen-monitor"

cd $ROOT

CMD="python2.7 -m SimpleHTTPServer 54321"

until $CMD >/dev/null 2>/dev/null; do
  sleep 3
done

exit 0
