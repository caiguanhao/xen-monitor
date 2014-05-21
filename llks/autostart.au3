#include <File.au3>
#include <Misc.au3>

If _Singleton("AUTOSTART", 1) = 0 Then
  Exit
EndIf

Local $tools = "C:\Documents and Settings\Administrator\桌面\全套"
If Not FileExists($tools) Then
  MsgBox(0 + 48 + 4096, "错误", "找不到文件夹 " & $tools)
  Exit
EndIf
Local $dest = $tools & "\Capture2TextChinese"

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

Run($tools & "\一键无整形.exe")
WinWait("睿悠科技 锐速", "", 5)
Sleep(2000)

Run($tools & "\一键无整形.exe")
WinWait("睿悠科技 锐速", "", 5)
Sleep(2000)

If Not ProcessExists("tcpz.exe") Then
  Run($tools & "\一键启动TCPZ.exe")
  WinWait("TCP-Z   (x86)   v2.6.1.72", "", 5)
  Sleep(2000)
EndIf

Local $offset_x = 23
Local $offset_y = 24
Local $title = "流量矿石系统"
Local $win

Local $tries = 0

While 1
  If Not ProcessExists("Miner.exe") Then
    Run($tools & "\一键启动流量矿石.exe")
    Sleep(5000)
  EndIf

  $win = WinActivate($title)
  If $win = 0 Then
    Sleep(3000)
    ContinueLoop
  EndIf

  Local $pos = WinGetPos($win)
  If @error Then
    Sleep(2000)
    ContinueLoop
  EndIf

  MouseMove($pos[0] + $offset_x, $pos[1] + $offset_y, 0)
  Local $coord = $pos[0] - 70 & " " & $pos[1] - 290 & " " & _
    $pos[0] + 50 & " " & $pos[1] - 270
  Local $temp = _TempFile()
  Local $code = RunWait('"' & $dest & '\Capture2Text.exe" ' & $coord & ' "' _
    & $temp & '"', "", @SW_HIDE)
  Local $line = FileReadLine($temp)
  FileDelete($temp)
  ; TrayTip($line, $line, 10, 1)

  ; 铁铲
  If StringInStr($line, "铁") or StringInStr($line, "铲") Then
    ProcessClose("Miner.exe")
    ProcessClose("MinerWatch.exe")
    ProcessClose("卡淘金.exe")
    Sleep(2000)
    Run($tools & "\一键无整形.exe")
    WinWait("睿悠科技 锐速", "", 5)
    Sleep(2000)
    Run($tools & "\一键无整形.exe")
    WinWait("睿悠科技 锐速", "", 5)
    Sleep(2000)
    Run($tools & "\一键启动流量矿石.exe")
    $win = WinWait($title, "", 5)
    $tries = $tries + 1
    If $tries > 5 Then
      ExitLoop
    Else
      ContinueLoop
    EndIf

  ; 挖矿机 or 爆破机 or 淘金机器人
  ElseIf StringInStr($line, "挖") or _
         StringInStr($line, "矿") or _
         StringInStr($line, "机") or _
         StringInStr($line, "人") Then
    If Not ProcessExists("卡淘金.exe") Then
      Run($tools & "\一键启动卡淘金.exe")
      Sleep(2000)
    EndIf
    Run($tools & "\一键26000.exe")
    Sleep(2000)
    Run($tools & "\一键26000.exe")
    ExitLoop
  EndIf
  Sleep(2000)
Wend
