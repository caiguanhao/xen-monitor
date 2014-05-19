#!/bin/bash

ROOT="/srv/xen-monitor"

cd $ROOT
rm -f $ROOT/images/*.json $ROOT/images/*.png

until (
cat <<PY | python2.7 -
import SimpleHTTPServer
import SocketServer
class CustomServer(SocketServer.TCPServer):
  allow_reuse_address = True
class CustomHTTPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
  def end_headers(self):
    self.send_header("Access-Control-Allow-Origin", "*")
    SimpleHTTPServer.SimpleHTTPRequestHandler.end_headers(self)
httpd = CustomServer(('', 54321), CustomHTTPRequestHandler)
httpd.serve_forever()
PY
) >/dev/null 2>/dev/null; do
  sleep 3
done

exit 0
