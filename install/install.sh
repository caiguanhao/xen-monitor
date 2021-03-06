#!/bin/bash

set -e

VERBOSE=0
HOSTIP="127.0.0.1"

HOSTIPTEXT="$HOSTIP"
O=$((15 - ${#HOSTIPTEXT}))
[[ $O -gt 0 ]] && HOSTIPTEXT="$HOSTIPTEXT$(printf '.%.0s' $(seq 1 1 $O))"

test_last_command() {
  CODE=$?
  if [[ $VERBOSE -ne 1 ]]; then
    echo -ne "\033[36m[$HOSTIPTEXT] \033[0m"
    if [[ $CODE -eq 0 ]]; then
      echo -e "${CURRENTSTATUS}\033[32mOK\033[0m"
    else
      echo -e "${CURRENTSTATUS}\033[31mFAIL\033[0m"
      exit $CODE
    fi
  else
    echo
    if [[ $CODE -gt 0 ]]; then
      exit $CODE
    fi
  fi
}

CURRENTSTATUS=

status() {
  CURRENTSTATUS="$@"
  if [[ $VERBOSE -ne 1 ]]; then
    echo -ne "\033[36m[$HOSTIPTEXT] \033[0m"
    echo "$CURRENTSTATUS"
  else
    echo -e "\033[36m$CURRENTSTATUS\033[0m"
  fi
}

if [[ $VERBOSE -eq 1 ]]; then
  echo
  echo Connected.
  echo
  STDOUT=/dev/stdout
  STDERR=/dev/stderr
else
  # echo -e "\033[32mOK\033[0m"
  STDOUT=/dev/null
  STDERR=/dev/null
fi

status "Installing dependencies ... "
yum --enablerepo=base -y install \
  gcc \
  make \
  zlib-devel \
  openssl-devel \
  bzip2-devel \
  freetype-devel \
  ncurses-devel \
  pcre-devel 1>$STDOUT 2>$STDERR
test_last_command

test -f /bin/screen || {
  status "Downloading GNU screen ... "
  curl -L# http://ftp.gnu.org/gnu/screen/screen-4.2.1.tar.gz -o /opt/screen-4.2.1.tar.gz 1>$STDOUT 2>$STDERR
  test_last_command

  status "Extracting GNU screen ... "
  tar xfz /opt/screen-4.2.1.tar.gz -C /opt 1>$STDOUT 2>$STDERR
  test_last_command

  cd /opt/screen-4.2.1

  status "Configuring GNU screen ... "
  ./configure 1>$STDOUT 2>$STDERR
  test_last_command

  status "Compiling GNU screen ... "
  make 1>$STDOUT 2>$STDERR
  test_last_command

  status "Installing GNU screen ... "
  make install 1>$STDOUT 2>$STDERR
  test_last_command
}

test -f /usr/local/bin/python2.7 || {
  status "Downloading Python 2.7.6 source code ... "
  curl -L# https://www.python.org/ftp/python/2.7.6/Python-2.7.6.tgz -o /opt/Python-2.7.6.tgz 1>$STDOUT 2>$STDERR
  test_last_command

  status "Extracting Python 2.7.6 ... "
  tar xfz /opt/Python-2.7.6.tgz -C /opt 1>$STDOUT 2>$STDERR
  test_last_command

  cd /opt/Python-2.7.6

  status "Configuring Python 2.7.6 ... "
  ./configure 1>$STDOUT 2>$STDERR
  test_last_command

  status "Compiling Python 2.7.6 ... "
  make 1>$STDOUT 2>$STDERR
  test_last_command

  status "Installing Python 2.7.6 ... "
  make install 1>$STDOUT 2>$STDERR
  test_last_command
}

test -f /usr/local/bin/cwebp || {
  status "Downloading libpng ... "
  curl -L# http://sourceforge.net/projects/libpng/files/libpng16/1.6.10/libpng-1.6.10.tar.gz \
    -o /opt/libpng-1.6.10.tar.gz 1>$STDOUT 2>$STDERR
  test_last_command

  status "Extracting libpng ... "
  tar xfz /opt/libpng-1.6.10.tar.gz -C /opt 1>$STDOUT 2>$STDERR
  test_last_command

  cd /opt/libpng-1.6.10

  status "Configuring libpng ... "
  ./configure 1>$STDOUT 2>$STDERR
  test_last_command

  status "Making libpng ... "
  make 1>$STDOUT 2>$STDERR
  test_last_command

  status "Installing libpng ... "
  make install 1>$STDOUT 2>$STDERR
  test_last_command

  status "Downloading libwebp ... "
  curl -L# https://webp.googlecode.com/files/libwebp-0.4.0.tar.gz \
    -o /opt/libwebp-0.4.0.tar.gz 1>$STDOUT 2>$STDERR
  test_last_command

  status "Extracting libwebp ... "
  tar xfz /opt/libwebp-0.4.0.tar.gz -C /opt 1>$STDOUT 2>$STDERR
  test_last_command

  cd /opt/libwebp-0.4.0

  status "Configuring libwebp ... "
  ./configure 1>$STDOUT 2>$STDERR
  test_last_command

  status "Making libwebp ... "
  make 1>$STDOUT 2>$STDERR
  test_last_command

  status "Installing libwebp ... "
  make install 1>$STDOUT 2>$STDERR
  test_last_command
}

test -f /usr/local/bin/pip || {
  status "Installing pip ... "
  curl -Ls https://bootstrap.pypa.io/get-pip.py | /usr/local/bin/python2.7 1>$STDOUT 2>$STDERR
  test_last_command
}

test -d /usr/local/lib/python2.7/site-packages/PIL || {
  status "Installing PIL ... "
  /usr/local/bin/pip install PIL --allow-external PIL --allow-unverified PIL 1>$STDOUT 2>$STDERR
  test_last_command
}

test -d /usr/local/lib/python2.7/site-packages/vncdotool || {
  status "Installing vncdotool ... "
  /usr/local/bin/pip install vncdotool 1>$STDOUT 2>$STDERR
  test_last_command
}

test -f /usr/local/nginx/sbin/nginx || {
  status "Downloading nginx ... "
  curl -L# http://nginx.org/download/nginx-1.6.0.tar.gz -o /opt/nginx-1.6.0.tar.gz 1>$STDOUT 2>$STDERR
  test_last_command

  status "Extracting nginx ... "
  tar xfz /opt/nginx-1.6.0.tar.gz -C /opt 1>$STDOUT 2>$STDERR
  test_last_command

  cd /opt/nginx-1.6.0

  status "Configuring nginx ... "
  ./configure 1>$STDOUT 2>$STDERR
  test_last_command

  status "Making nginx ... "
  make 1>$STDOUT 2>$STDERR
  test_last_command

  status "Installing nginx ... "
  make install 1>$STDOUT 2>$STDERR
  test_last_command
}

echo -ne "\033[36m[$HOSTIPTEXT] \033[0m"
echo -e "\033[32mDone.\033[0m"
