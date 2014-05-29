#!/bin/bash

[[ "${BASH_SOURCE[0]}" == "${0}" ]] && {
  echo "This file is used to be included in other bash script file."
  exit 1
}

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

SSHARGS="-t -t"
if [[ $INTERACTIVE -eq 1 ]]; then
  SSHARGS=""
fi

if [[ ! -z $VERBOSE ]]; then
  ARGS="-v"
  # SSHARGS="${SSHARGS} -v"
fi

if [[ -f undone ]]; then
  DIST="$(cat undone)"
  echo "Will process file 'undone'. Press Enter to continue."
  echo "Press Ctrl-C and then remove the file if you don't want to do this. "
else
  [[ $CONFIRMSTART == "" ]] && echo "Press Enter to start."
fi
[[ $CONFIRMSTART == "" ]] && read

COUNT=0

rm -f done
touch done

rm -f all
touch all

IFS=$'\n'
for origline in $DIST; do
  IFS=$' \t'
  line=($origline)
  if [[ ${#line[@]} -eq 2 ]]; then
    if [[ $COUNT -eq 0 ]]; then
      SCREENARGS="-d -m -t ${line[0]}"
    else
      SCREENARGS="-X screen -t ${line[0]}"
    fi
    Host="${line[0]}"
    Password="${line[1]}"
    screen -S install $SCREENARGS \
      $DIRNAME/ssh.sh \
        -h "$Host" \
        -p "$Password" \
        -a "$SSHARGS" \
        $ARGS "$CMD"
    COUNT=$((COUNT + 1))
    echo $Host $Password >> all
  fi
done

if [[ $COUNT -gt 0 ]]; then
  screen -r install
fi

echo
echo "If you are seeing this, it means screen is terminated."
echo -e "You should run \`\033[36m$0 check\033[0m\` to see if there are undone servers."

exit 0
