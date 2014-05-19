; AutoIt script to automatically get LLKS upload speed text and
; save it to XenStore.
; ---------------------------------------------------------------
; Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)
; Licensed under the terms of the MIT license.
; Report bugs on https://github.com/caiguanhao/xen-monitor/issues
; ---------------------------------------------------------------

#include <File.au3>

Local $tools = "C:\Documents and Settings\Administrator\桌面\全套"
If Not FileExists($tools) Then
  MsgBox(0 + 48 + 4096, "错误", "找不到文件夹 " & $tools)
  Exit
EndIf
Local $dest = $tools & "\Capture2Text"
Local $file = $tools & "\Capture2Text.zip"
Local $dl = InetGet("http://d.cgh.io/Capture2Text.zip", $file, 1, 1)
If Not FileExists($dest) Then
  DirCreate($dest)
  Do
    Local $info = InetGetInfo($dl)
    If $info[0] > 0 Then
      TrayTip("Downloading...", Round($info[0] / $info[1] * 100, 2) & _
        "% completed.", 10, 1)
    EndIf
    Sleep(250)
  Until InetGetInfo($dl, 2)
  TrayTip("Extracting...", "Extracting program files...", 10, 1)
  Local $code = RunWait('"C:\Program Files\WinRAR\WinRAR.exe" x "' & $file & _
    '" -o+ -ibck "' & $dest & '"', "", @SW_HIDE)
  If $code <> 0 or Not FileExists("C:\Program Files\WinRAR\WinRAR.exe") Then
    MsgBox(0 + 48 + 4096, "错误", "请重试。")
    Exit
  EndIf
  TrayTip("Done.", "Started monitoring...", 10, 1)
EndIf

TraySetToolTip("流量矿石监视器 by cgh.io")

Local $exist
Local $activated = 0
Local $win
Local $wait = 5000
Local $offset_x = 53
Local $offset_y = 7
Local $title = "流量矿石系统"

While 1
  $exist = WinExists($title)
  If $exist Then
    If $activated == 0 Then
      $win = WinActivate($title)
      $activated = 1
    EndIf
  Else
    $activated = 0
    Sleep($wait)
    ContinueLoop
  EndIf
  Local $pos = WinGetPos($win)
  Local $coord = $pos[0] + $offset_x & " " & $pos[1] + $offset_y & " " & _
  $pos[0] + $offset_x + 57 & " " & $pos[1] + $offset_y + 17
  Local $temp = _TempFile()
  Local $code = RunWait('"' & $dest & '\Capture2Text.exe" ' & $coord & ' "' & _
    $temp & '"', "", @SW_HIDE)
  If FileExists($dest & "\Capture2Text.exe") and $code = 0 Then
    Local $line = FileReadLine($temp)
    FileDelete($temp)
    Local $extradata = $line;
    If StringLen($extradata) = 0 Then $extradata = "NULL"
    RunWait('"C:\Program Files\Citrix\XenTools\xenstore_client.exe" ' & _
      ' write extradata "' & $extradata & '"', "", @SW_HIDE)
    ;TrayTip($extradata, $temp, 10, 1)
  Else
    RunWait('"C:\Program Files\Citrix\XenTools\xenstore_client.exe" ' & _
      ' write extradata ""', "", @SW_HIDE)
  EndIf
  Sleep($wait)
Wend
