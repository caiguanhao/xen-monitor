XEN-MONITOR
===========

Monitor XenServer in Choi-Goon-Ho way.

```
upstream XenMonitorApp {
  server 127.0.0.1:23456;
}

server {
  server_name <SERVER_NAME>;
  listen 80;
  client_max_body_size 1m;
  keepalive_timeout 5;
  root /srv/xen-monitor/public;
  gzip_static on;
  error_page 500 502 503 504 /500.html;
  location = /500.html {
    root /srv/xen-monitor/public;
  }
  try_files $uri/index.html $uri.html $uri @app;
  location @app {
    proxy_intercept_errors on;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_redirect off;
    proxy_pass http://XenMonitorApp;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```
