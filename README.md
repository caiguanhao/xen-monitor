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

Deploy
------

Here are some steps help you deploy a new app in your Ubuntu server.

```
sudo apt-get install build-essential git redis-server nginx curl
```

Install nvm, node.js and npm:

```
curl https://raw.githubusercontent.com/creationix/nvm/v0.7.0/install.sh | sh
nvm install 0.10
nvm alias default 0.10
nvm use default
```

NPM install:

```
npm -g i grunt-cli
git clone https://github.com/caiguanhao/xen-monitor.git /srv/xen-monitor
cd /srv/xen-monitor
npm install
sudo make install-receive
```

Then, you can start a `screen` with two sessions running `./service` and
`receive`.

Run `./nginx.sh` to generate a nginx config for your app.

Developers
----------

* caiguanhao &lt;caiguanhao@gmail.com&gt;
