#!/bin/bash

pgrep server.sh >/dev/null || ( ./server.sh & )

IMAGES="/srv/xen-monitor/images"
mkdir -p $IMAGES
rm -f $IMAGES/*.png

(IFS=$'\n'; for VM in `xl list`; do
  IFS=$' \t'; VM=($VM)
  if [[ ${VM[1]} -gt 0 ]]; then
    CMD="vncdo -s localhost:"
    CMD="${CMD}$((`xenstore-read /local/domain/${VM[1]}/console/vnc-port` - 5900))"
    CAPTURE="${CMD} capture ${IMAGES}/${VM[0]}-full.png"
    $CAPTURE
  fi
done)

cat <<PY | python2.7 -
import glob, math, Image
files = glob.glob('$IMAGES/*-full.png')
files.sort(key=lambda file: int(file.replace('-','.').split('.')[-3]))
cols = 2
rows = int(math.ceil(float(len(files)) / cols))
width = 200
height = 150
all = Image.new('RGB', (width * cols, height * rows))
for i, file in enumerate(files):
  min = Image.open(file)
  min = min.crop((600, 450, 800, 600))  # bottom right corner
  min.save(file[:file.rfind('-full.png')] + '-min.png')
  top = int(math.floor(float(i) / cols)) * height
  left = i % cols * width
  all.paste(min, (left, top, left + width, top + height))
all.save('$IMAGES/montage.png')
PY
