@echo off

rem Makefile to compile AutoIt scripts to EXE files.
rem This scirpt needs Aut2exe.exe. You may need to change the path
rem if it doesn't exist.
rem It is recommended you use 7zip to compress the output files.

echo Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)
echo Licensed under the terms of the MIT license.
echo Report bugs on https://github.com/caiguanhao/xen-monitor/issues
echo ---------------------------------------------------------------

echo Compiling monitor.exe...
"C:\Program Files (x86)\AutoIt3\Aut2Exe\Aut2exe.exe" ^
  /in monitor.au3 ^
  /out "monitor.exe" ^
  /icon x.ico ^
  /x86 /comp 4 /pack ^
  /companyname cgh.io ^
  /filedescription "LLKS Monitor." ^
  /legalcopyright "Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)"

echo Done. Press Enter to exit.

pause >nul
