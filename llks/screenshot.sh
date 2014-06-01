#!/bin/bash

set -e

FONTFILE="Ubuntu-L.ttf"

IMAGES="/srv/xen-monitor/images"
IMAGESTMP="$IMAGES/tmp"
rm -f $IMAGESTMP/*
mkdir -p $IMAGESTMP

(
  JSON="[{\"name\":\"info\",\"time\":\"`date +%s`\"},"
  JSON="$JSON{\"name\":\"montage\",\"full\":\"/images/montage.png\"}"
  IFS=$','
  for VMUUID in $(xe vm-list params=uuid --minimal); do
    VMDOMID="$(xe vm-param-get param-name=dom-id uuid=${VMUUID})"
    VMNAME="$(xe vm-param-get param-name=name-label uuid=${VMUUID})"
    if [[ ${VMDOMID} -gt 0 ]]; then
      P="$(($(xenstore-read /local/domain/${VMDOMID}/console/vnc-port) - 5900))"
      vncdo -s localhost:${P} capture ${IMAGESTMP}/${VMNAME}-full.png
      cwebp -quiet -q 30 ${IMAGESTMP}/${VMNAME}-full.png -o ${IMAGESTMP}/${VMNAME}-full.webp
      JSON="$JSON,{\"name\":\"${VMNAME}\","
      JSON="$JSON\"uuid\":\"${VMUUID}\","
      JSON="$JSON\"full\":\"/images/${VMNAME}-full.png\","
      JSON="$JSON\"webp\":\"/images/${VMNAME}-full.webp\","
      JSON="$JSON\"mini\":\"/images/${VMNAME}-mini.png\"}"
    fi
  done
  JSON="$JSON]"
  echo $JSON > ${IMAGES}/images.json
)

cat <<PY | python2.7 -
import os, glob, time, math, Image, ImageFont, ImageDraw
now = time.strftime("%H:%M:%S", time.gmtime(time.time() + 8 * 3600))
files = glob.glob('$IMAGESTMP/*-full.png')
files.sort(key=lambda file: int(file.replace('-','.').split('.')[-3]))
cols = 4
rows = int(math.ceil(float(len(files)) / cols))
off_y = 16
screen_x = 800
screen_y = 600
width = 200
height = 100
font = ImageFont.truetype('$FONTFILE', 12)
all = Image.new('RGB', (width * cols, height * rows + off_y))
for i, file in enumerate(files):
  filename = os.path.basename(file)
  min = Image.open(file)
  min = min.crop((screen_x - width, screen_y - height, screen_x, screen_y))  # bottom right corner
  min.save(file[:file.rfind('-full.png')] + '-mini.png')
  top = int(math.floor(float(i) / cols)) * height
  left = i % cols * width
  all.paste(min, (left, top + off_y, left + width, top + height + off_y))
  draw = ImageDraw.Draw(all)
  draw.text((left + 10, 0), filename[:filename.find('-')], (255,255,255), font=font)
  draw.text((left + 140, 0), now, (255,255,255), font=font)
all.save('$IMAGESTMP/montage.png')
PY

mv $IMAGESTMP/* $IMAGES
