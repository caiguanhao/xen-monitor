send: clean
	gcc -o send send.c netstat.c

install: send
	cp -f send /usr/bin/send

install-receive:
	cp -f receive.py /usr/bin/receive

uninstall: clean
	rm -f /usr/bin/send

clean:
	rm -f send

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

.PHONY: install install-receive uninstall clean fake fake-daemon receive redis redis-bg
