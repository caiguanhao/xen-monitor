#!/bin/bash

pgrep server.sh >/dev/null || ( ./server.sh & )

IMAGES="/srv/xen-monitor/images"
mkdir -p $IMAGES

(
  JSON="[{\"name\":\"info\",\"time\":\"`date +%s`\"},"
  JSON="$JSON{\"name\":\"montage\",\"full\":\"/images/montage.png\"}"
  IFS=$'\n'
  for VM in `xl list`; do
    IFS=$' \t'
    VM=($VM)
    if [[ ${VM[1]} -gt 0 ]]; then
      CMD="vncdo -s localhost:"
      CMD="${CMD}$((`xenstore-read /local/domain/${VM[1]}/console/vnc-port` - 5900))"
      CAPTURE="${CMD} capture ${IMAGES}/${VM[0]}-full.png"
      $CAPTURE
      JSON="$JSON,{\"name\":\"${VM[0]}\","
      JSON="$JSON\"full\":\"/images/${VM[0]}-full.png\","
      JSON="$JSON\"mini\":\"/images/${VM[0]}-mini.png\"}"
    fi
  done
  JSON="$JSON]"
  echo $JSON > ${IMAGES}/images.json
)

cat <<PY | python2.7 -
import os, glob, time, math, Image, ImageFont, ImageDraw
now = time.strftime("%H:%M:%S", time.gmtime(time.time() + 8 * 3600))
files = glob.glob('$IMAGES/*-full.png')
files.sort(key=lambda file: int(file.replace('-','.').split('.')[-3]))
cols = 4
rows = int(math.ceil(float(len(files)) / cols))
off_y = 16
width = 200
height = 150
font = ImageFont.truetype('Ubuntu-L.ttf', 12)
all = Image.new('RGB', (width * cols, height * rows + off_y))
for i, file in enumerate(files):
  filename = os.path.basename(file)
  min = Image.open(file)
  min = min.crop((600, 450, 800, 600))  # bottom right corner
  min.save(file[:file.rfind('-full.png')] + '-mini.png')
  top = int(math.floor(float(i) / cols)) * height
  left = i % cols * width
  all.paste(min, (left, top + off_y, left + width, top + height + off_y))
  draw = ImageDraw.Draw(all)
  draw.text((left + 10, 0), filename[:filename.find('-')], (255,255,255), font=font)
  draw.text((left + 140, 0), now, (255,255,255), font=font)
all.save('$IMAGES/montage.png')
PY
