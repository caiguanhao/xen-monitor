#!/bin/bash

ROOT="/srv/xen-monitor"

cd $ROOT

pkill nginx

echo "
worker_processes                1;
events {
  worker_connections            1024;
}
http {
  include                       /usr/local/nginx/conf/mime.types;
  default_type                  application/octet-stream;
  client_body_buffer_size       10K;
  client_header_buffer_size     1k;
  client_max_body_size          1m;
  large_client_header_buffers   2 1k;
  client_body_timeout           12;
  client_header_timeout         12;
  keepalive_timeout             15;
  send_timeout                  10;
  access_log                    off;
  server {
    listen                      54321;
    root                        /srv/xen-monitor;
    autoindex                   on;
  }
}
" > /root/nginx.conf

/usr/local/nginx/sbin/nginx -c /root/nginx.conf

exit 0
