all: clean send listen

send: clean
	gcc -o send send.c netstat.c

listen: clean
	gcc -o listen listen.c

install: all
	cp -f send /usr/bin/send
	cp -f listen /usr/bin/listen

install-receive:
	cp -f receive.py /usr/bin/receive

uninstall: clean
	rm -f /usr/bin/send
	rm -f /usr/bin/listen

clean:
	rm -f send
	rm -f listen

fake-listen: listen
	./listen ${ARGS}

fake: send
	./send -x fake/xe-vm-list -d fake/proc/net/dev ${ARGS}

fake-daemon: send
	./send -x fake/xe-vm-list -d fake/proc/net/dev -D -o out.log -e err.log ${ARGS}

receive: redis-bg
	./receive.py ${ARGS}

redis:
	redis-server

redis-bg:
	redis-server --daemonize yes

.PHONY: all install install-receive uninstall clean fake-listen fake fake-daemon receive redis redis-bg
