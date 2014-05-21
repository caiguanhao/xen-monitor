#!/bin/bash

yum --enablerepo=base -y install gcc make zlib-devel openssl-devel bzip2-devel freetype-devel pcre-devel

test -f /usr/local/bin/python2.7 || {
  echo Installing Python 2.7.6...
  curl -L# https://www.python.org/ftp/python/2.7.6/Python-2.7.6.tgz -o /opt/Python-2.7.6.tgz
  tar xfz /opt/Python-2.7.6.tgz -C /opt
  cd /opt/Python-2.7.6
  ./configure
  make
  make install
}

test -f /usr/local/bin/pip || {
  curl -Ls https://bootstrap.pypa.io/get-pip.py | /usr/local/bin/python2.7
}

/usr/local/bin/pip install PIL --allow-external PIL --allow-unverified PIL
/usr/local/bin/pip install vncdotool

test -f /usr/local/nginx/sbin/nginx || {
  curl -L# http://nginx.org/download/nginx-1.6.0.tar.gz -o /opt/nginx-1.6.0.tar.gz
  tar xfz /opt/nginx-1.6.0.tar.gz -C /opt
  cd /opt/nginx-1.6.0
  ./configure
  make
  make install
}

rm -rf /opt/xen-monitor-master
curl -L# https://github.com/caiguanhao/xen-monitor/archive/master.tar.gz -o /opt/xen-monitor.tar.gz
tar xfz /opt/xen-monitor.tar.gz -C /opt
cd /opt/xen-monitor-master
make install

echo Done.
