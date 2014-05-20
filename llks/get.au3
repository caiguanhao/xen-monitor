Local $file = "C:\command.bat"

If $CmdLine[0] <> 1 Then
  ConsoleWrite("Download BAT script to " & $file & " and execute it." & @CRLF)
  ConsoleWrite("Usage:   get [script-file-name|complete-url]" & @CRLF)
  ConsoleWrite("Example: get beer <==> get http://d.cgh.io/bats/beer.bat")
  ConsoleWrite(@CRLF)
  Exit
EndIf

$script = $CmdLine[1]

Local $url
If StringInStr($script, "http://") == 1 Then
  $url = $script
Else
  $url = "http://d.cgh.io/bats/" & $script & ".bat"
EndIf
ConsoleWrite("Downloading " & $url & @CRLF)
Local $dl = InetGet($url, $file, 1 + 2 + 4, 0)
If $dl = 0 Then
  ConsoleWrite("Failed to download. Aborted." & @CRLF)
  Exit 1
EndIf
ConsoleWrite("Download completed." & @CRLF)
$pid = Run($file, "", @SW_MAXIMIZE, 0x10000)
ConsoleWrite("Executed BAT script " & $file & " as PID " & $pid & "." & @CRLF)
Exit
