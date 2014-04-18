send: clean
	gcc -o send send.c netstat.c

clean:
	rm -f send

fake: send
	./send -X fake/xe-vm-list -D fake/proc/net/dev

receive:
	python receive.py

.PHONY: clean fake receive
