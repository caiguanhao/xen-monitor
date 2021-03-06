; AutoIt script to automatically get LLKS upload speed text and
; save it to XenStore.
; ---------------------------------------------------------------
; Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)
; Licensed under the terms of the MIT license.
; Report bugs on https://github.com/caiguanhao/xen-monitor/issues
; ---------------------------------------------------------------

#include <File.au3>
#include <Misc.au3>
#include <Date.au3>

If _Singleton("LLKSMONITOR", 1) = 0 Then
  MsgBox(48 + 4096, "Warning", "已在运行。")
  Exit
EndIf

Local $tools = "C:\Documents and Settings\Administrator\桌面\全套"
If Not FileExists($tools) Then
  MsgBox(0 + 48 + 4096, "错误", "找不到文件夹 " & $tools)
  Exit
EndIf
Local $dest = $tools & "\Capture2Text"

Local $file = $tools & "\Capture2Text.7z"
Local $dl = InetGet("http://d.cgh.io/Capture2Text.7z", $file, 1, 1)
If Not FileExists($dest) Then
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
    '" -o+ -ibck "' & $tools & '"', "", @SW_HIDE)
  If $code <> 0 or Not FileExists("C:\Program Files\WinRAR\WinRAR.exe") Then
    MsgBox(0 + 48 + 4096, "错误", "请重试。")
    Exit
  EndIf
  TrayTip("Done.", "Downloaded program files.", 10, 1)
EndIf

Sleep(2000)

Local $destCHN = $tools & "\Capture2TextChinese"

Local $file = $tools & "\Capture2Text.7z"
Local $dl = InetGet("http://d.cgh.io/Capture2Text.7z", $file, 1, 1)
If Not FileExists($destCHN) Then
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
    '" -o+ -ibck "' & $tools & '"', "", @SW_HIDE)
  If $code <> 0 or Not FileExists("C:\Program Files\WinRAR\WinRAR.exe") Then
    MsgBox(0 + 48 + 4096, "错误", "请重试。")
    Exit
  EndIf
  TrayTip("Done.", "Downloaded program files.", 10, 1)
EndIf

Sleep(2000)

$tooltip = "流量矿石监视器 by cgh.io"
TraySetToolTip($tooltip)

Local $exist
Local $activated = 0
Local $win
Local $wait = 5000
Local $offset_x = 53
Local $offset_y = 7
Local $title = "流量矿石系统"
Local $admin_disconnected = 0
Local $stopped = 0

While 1
  Local $extradata = ""

  $exist = WinExists($title)
  If $exist Then
    If $activated == 0 Then
      $win = WinActivate($title)
      $activated = 1
    EndIf

    Local $pos = WinGetPos($win)
    If Not @error Then
      Local $coord = $pos[0] + $offset_x & " " & $pos[1] + $offset_y & " " & _
        $pos[0] + $offset_x + 57 & " " & $pos[1] + $offset_y + 17
      Local $temp = _TempFile()
      Local $code = RunWait('"' & $dest & '\Capture2Text.exe" ' & $coord & ' "' _
        & $temp & '"', "", @SW_HIDE)

      If FileExists($dest & "\Capture2Text.exe") and $code = 0 Then
        Local $line = FileReadLine($temp)
        FileDelete($temp)
        $extradata = $line
      EndIf
    EndIf
  Else
    $activated = 0
  EndIf

  If $extradata == "" Then
    Local $temp = _TempFile()
    Local $code = RunWait('"' & $destCHN & '\Capture2Text.exe" 305 250 490 280 "' _
      & $temp & '"', "", @SW_HIDE)
    If FileExists($destCHN & "\Capture2Text.exe") and $code = 0 Then
      Local $line = FileReadLine($temp)
      FileDelete($temp)
      If StringInStr($line, "无") and StringInStr($line, "挖") Then
        ProcessClose("Miner.exe")
        ProcessClose("MinerWatch.exe")
        Sleep(3000)
        FileDelete("C:\Documents and Settings\All Users\Application Data\Miner\QvodCfg.ini")
        Sleep(1000)
        Run($tools & "\一键启动流量矿石.exe")
      EndIf
    EndIf
  EndIf

  $admin_disconnected = 0
  $Ret = DllCall('wtsapi32.dll', 'int', 'WTSEnumerateSessionsW', 'ptr', 0, _
    'dword', 0, 'dword', 1, 'ptr*', 0, 'dword*', 0)
  $Offset = 0
  For $i = 1 To $Ret[5]
    $tInfo = DllStructCreate("dword SessionId; ptr WinStationName; " & _
      "uint State", $Ret[4] + $Offset)
    $Offset += DllStructGetSize($tInfo)
    $SessionId = DllStructGetData($tInfo, 'SessionId')
    ; $SessionName = DllStructGetData(DllStructCreate('wchar[1024]', _
    ;   DllStructGetData($tInfo, 'WinStationName')), 1)
    $SessionState = DllStructGetData($tInfo, 'State')
    $tInfo = 0
    If $SessionId = 0 and $SessionState = 4 Then
      $admin_disconnected = 1
      ExitLoop
    EndIf
  Next
  DllCall("wtsapi32.dll", "none", "WTSFreeMemory", 'ptr', $Ret[4])

  If $extradata = "" and $admin_disconnected = 1 Then $extradata = "NULL"
  RunWait('"C:\Program Files\Citrix\XenTools\xenstore_client.exe" ' & _
    ' write extradata "' & $extradata & '"', "", @SW_HIDE)
  Sleep($wait)
Wend
