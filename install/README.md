Install
-------

## Update xen-monitor app on server

Fill your server information in `remote-deploy.sh`, and then
run `./remote-deploy.sh` to update all web apps on your servers.

## Install xen-monitor software on your Xen servers

You can create a bash shell script file in this folder with this command:

```
vim example.com.sh
```

and with this template:

```shell
#!/bin/bash

REMOTEHOST="example.com"
REMOTEAPPPATH="/srv/xen-monitor"
DESTIP="107.107.107.107"
DESTPORT="8124"
LISTENPASSWD="MyPasswordHere"
WINDOWSUSERNAME="administrator"
WINDOWSPASSWORD="MyPasswordHere"
DIST="
192.168.1.106       MyPasswordHere
192.168.1.107       MyPasswordHere
192.168.1.108       MyPasswordHere
"

source ./index.sh
```

And then make this file as an executable file:

```
chmod +x ./example.com.sh
```

If you run this file, you will see help information.

```
Usage: ./example.com.sh (install|deploy|dry-run|run|connect|whitelist)
  - install     create screens for each server and install software there
  - deploy      update configurations and restart software on each server
  - run         [all|dom-id|name-label] [get|send|login] [arguments]
                run vnc commands on each server while dry-run is for test
  - connect     create screens to log into each server
  - whitelist   make and write whitelist file to each server
```

Make sure you have installed `screen`. If you wan to process more than 30
servers at the same time, you must [download the GNU screen source
code](http://ftp.gnu.org/gnu/screen/) and increase the value of `MAXWIN`
in the config file and then compile and use the software.
