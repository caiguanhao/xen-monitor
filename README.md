XEN-MONITOR
===========

Monitor XenServer in Choi-Goon-Ho way.

Commands
--------

**send**: Send statistics to server for a period of time.

```
Usage: send [OPTION]
  -h, --help                  display this help and exit
  -v, --verbose               don't be silent
  -D, --daemon                run as a daemon
  -o, --stdout        <file>  write stdout to file
  -e, --stderr        <file>  write stderr to file
  -s, --sample-period <secs>  sample period, default: 2 second(s)
  -i, --ip-address    <addr>  send to this IP address, default: 127.0.0.1
  -p, --port          <port>  send to this port, default: 8124
  -x, --xe-vm-list    <file>  read this file as if running `xe vm-list`
  -d, --proc-net-dev  <file>  read this file instead of /proc/net/dev
```

**receive**: Receive statistics and put them into Redis database.

```
Usage: /usr/bin/receive.py [OPTION]
  -h, --help                Show help and exit
  -v, --verbose             Don't be silent
  -D, --daemon              Run as a daemon
  -o, --stdout <file>       Write stdout to file
  -e, --stderr <file>       Write stderr to file
  -b, --bind  <ip-address>  Bind to this IP address, default: 127.0.0.1
  -p, --port  <port>        Bind to this port, default: 8124
  -r, --redis <ip-address>  Connect to Redis with this IP, default: 127.0.0.1
  -t, --redis-port  <port>  Connect to Redis with this port, default: 6379
  -n, --redis-db  <number>  Database number to connect, default: 0
```

**listen**: Listen for commands.

```
Usage: listen [OPTION]
  -h, --help                  display this help and exit
  -v, --verbose               don't be silent
  -D, --daemon                run as a daemon
  -o, --stdout        <file>  write stdout to file
  -e, --stderr        <file>  write stderr to file
  -P, --password-file <file>  file or - (stdin) to read password from,
                              default is file /etc/listen.passwd
  -p, --port          <port>  listen to this port, default: 3333
  -n, --dry-run               show commands but don't execute them
```

Web
---

![xen monitor](https://cloud.githubusercontent.com/assets/1284703/2809618/3ef12fe2-cd79-11e3-9f30-d668345a7503.png)

Nginx
-----

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

Developers
----------

* caiguanhao &lt;caiguanhao@gmail.com&gt;
