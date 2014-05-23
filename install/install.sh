#!/bin/bash

echo Installing dependencies...
yum --enablerepo=base -y install gcc make zlib-devel openssl-devel bzip2-devel freetype-devel pcre-devel

test -f /usr/local/bin/python2.7 || {
  echo Installing Python 2.7.6...
  curl -L# https://www.python.org/ftp/python/2.7.6/Python-2.7.6.tgz -o /opt/Python-2.7.6.tgz
  echo Extracting archive...
  tar xfz /opt/Python-2.7.6.tgz -C /opt
  cd /opt/Python-2.7.6
  ./configure
  make
  make install
}

test -f /usr/local/bin/cwebp || {
  echo Installing libpng...
  curl -L# http://sourceforge.net/projects/libpng/files/libpng16/1.6.10/libpng-1.6.10.tar.gz -o /opt/libpng-1.6.10.tar.gz
  tar xfz /opt/libpng-1.6.10.tar.gz -C /opt
  cd /opt/libpng-1.6.10
  ./configure
  make
  make install
  echo Installing libwebp...
  curl -L# https://webp.googlecode.com/files/libwebp-0.4.0.tar.gz -o /opt/libwebp-0.4.0.tar.gz
  tar xfz /opt/libwebp-0.4.0.tar.gz -C /opt
  cd /opt/libwebp-0.4.0
  ./configure
  make
  make install
}

test -f /usr/local/bin/pip || {
  echo Installing pip...
  curl -Ls https://bootstrap.pypa.io/get-pip.py | /usr/local/bin/python2.7
}

echo Installing PIL...
/usr/local/bin/pip install PIL --allow-external PIL --allow-unverified PIL

echo Installing vncdotool...
/usr/local/bin/pip install vncdotool

test -f /usr/local/nginx/sbin/nginx || {
  echo Installing nginx...
  curl -L# http://nginx.org/download/nginx-1.6.0.tar.gz -o /opt/nginx-1.6.0.tar.gz
  tar xfz /opt/nginx-1.6.0.tar.gz -C /opt
  cd /opt/nginx-1.6.0
  ./configure
  make
  make install
}

echo Done.
