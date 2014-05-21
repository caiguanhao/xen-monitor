; AutoIt script to automatically download and execute BAT script.
; ---------------------------------------------------------------
; Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)
; Licensed under the terms of the MIT license.
; Report bugs on https://github.com/caiguanhao/xen-monitor/issues
; ---------------------------------------------------------------

Local $dir = "C:\bats\"

If $CmdLine[0] = 0 Then
  ConsoleWrite("Download BAT script to " & $dir & " and execute it." & @CRLF)
  ConsoleWrite("Usage:   get [wait|nowait] [script-name|url] ..." & @CRLF)
  ConsoleWrite("Example: get beer <==> get http://d.cgh.io/bats/beer.bat")
  ConsoleWrite(@CRLF)
  ConsoleWrite("         get wait cat dog   wait for cat.bat and dog.bat exit")
  ConsoleWrite(@CRLF)
  Exit
EndIf

Local $start = 1
Local $wait = 0

If $CmdLine[1] = "wait" Then
  $wait = 1
  $start = 2
ElseIf $CmdLine[1] = "nowait" Then
  $wait = 0
  $start = 2
EndIf

For $i = $start To $CmdLine[0]
  Local $script = $CmdLine[$i]
  Local $url
  If StringInStr($script, "http://") == 1 Then
    $url = $script
  Else
    $url = "http://d.cgh.io/bats/" & $script & ".bat"
  EndIf
  If Not FileExists($dir) Then DirCreate($dir)
  $file = $dir & $script & ".bat"
  ConsoleWrite("Downloading " & $url & " to " & $file & @CRLF)
  Local $dl = InetGet($url, $file, 1 + 2 + 4, 0)
  If $dl = 0 Then
    ConsoleWrite("Failed to download. Aborted." & @CRLF)
    Exit 1
  EndIf
  ConsoleWrite("Download completed." & @CRLF)
  If $wait = 1 Then
    $exit = RunWait($file, "", @SW_HIDE, 0x10000)
    ConsoleWrite("Executed BAT script " & $file & " and returned " & _
      $exit & "." & @CRLF)
  Else
    $pid = Run($file, "", @SW_HIDE, 0x10000)
    ConsoleWrite("Executed BAT script " & $file & " as PID " & $pid & "." & _
      @CRLF)
  EndIf
Next

Exit
