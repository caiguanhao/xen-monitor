send: clean
	gcc -o send send.c netstat.c

clean:
	rm -f send

fake: send
	./send -X fake/xe-vm-list -D fake/proc/net/dev

receive: redis-bg
	./receive.py ${ARGS}

redis:
	redis-server

redis-bg:
	redis-server --daemonize yes

.PHONY: clean fake receive redis redis-bg
