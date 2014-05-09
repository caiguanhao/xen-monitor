#!/bin/bash

SERVER=x.cgh.io
DIR=/srv/xen-monitor
PORT=23456

read -p "Host name to serve [$SERVER]: " _SERVER
if [[ $_SERVER != "" ]]; then SERVER="$_SERVER"; fi

while [[ ! -d $_DIR ]]; do
  if [[ $_DIR != "" ]]; then
    echo $_DIR does not exist. Please try another directory.
  fi
  read -p "Node.js application directory [$DIR]: " _DIR
  if [[ $_DIR == "" ]]; then break; fi
done
if [[ $_DIR != "" ]]; then DIR="$_DIR"; fi

read -p "Node.js application listens to port [$PORT]: " _PORT
if [[ $_PORT != "" ]]; then PORT="$_PORT"; fi

echo "upstream XenMonitorApp${PORT} {
  server 127.0.0.1:${PORT};
}

server {
  server_name ${SERVER};
  listen 80;
  client_max_body_size 1m;
  keepalive_timeout 5;
  root ${DIR}/public;
  gzip_static on;
  error_page 500 502 503 504 /500.html;
  location = /500.html {
    root ${DIR}/public;
  }
  try_files \$uri \$uri/ @app;
  location @app {
    proxy_intercept_errors on;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header Host \$http_host;
    proxy_redirect off;
    proxy_pass http://XenMonitorApp${PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \"upgrade\";
    error_page 404 =200 /index.html;
  }
}"
