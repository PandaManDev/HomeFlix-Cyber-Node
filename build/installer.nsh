; HomeFlix Cyber Node — premium Windows installer experience.
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

!define MUI_BGCOLOR "080D18"
!define MUI_TEXTCOLOR "F2F5FF"
!define MUI_WELCOMEPAGE_TITLE "Welcome to HomeFlix Cyber Node"
!define MUI_WELCOMEPAGE_TEXT "YOUR MEDIA. YOUR SPACE.\r\n\r\nInstall HomeFlix Cyber Node, your personal desktop media hub. This setup creates your Start Menu shortcut and can add a desktop shortcut.\r\n\r\nYou'll be able to choose the installation folder and review available disk space before installing.\r\n\r\nClick Next to continue."
!define MUI_FINISHPAGE_TITLE "Your HomeFlix experience starts here"
!define MUI_FINISHPAGE_TEXT "HomeFlix Cyber Node has been installed.\r\n\r\nLaunch HomeFlix to open your media hub. To use the Android Companion remote, open the companion app on your phone and follow the pairing instructions in HomeFlix. Keep both devices on the same trusted Wi-Fi network.\r\n\r\nEnjoy your library."
!define MUI_ABORTWARNING

Var HF_DiskDialog
Var HF_DiskInfo
Var HF_FreeInfo
Var HF_RequiredBytes
Var HF_AvailableMB
!define HOMEFLIX_REQUIRED_MB 500

Page custom HomeFlixDiskPageCreate HomeFlixDiskPageLeave

Function HomeFlixDiskPageCreate
  nsDialogs::Create 1018
  Pop $HF_DiskDialog
  ${If} $HF_DiskDialog == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel 0 0 100% 22u "HOMEFLIX  /  INSTALLATION SUMMARY"
  Pop $0
  ${NSD_CreateLabel 0 28u 100% 28u "Review the destination and storage before installing."
  Pop $0
  ${NSD_CreateLabel 0 62u 100% 18u "REQUIRED SPACE"
  Pop $0
  ${NSD_CreateLabel 8u 82u 92% 30u "At least 500 MB is recommended for the app. Personal video files require additional space."
  Pop $0
  ${NSD_CreateLabel 0 116u 100% 18u "INSTALLATION LOCATION"
  Pop $0
  ${NSD_CreateLabel 8u 136u 92% 28u "$INSTDIR"
  Pop $HF_DiskInfo
  ${NSD_CreateLabel 0 170u 100% 38u "Checking free space on the selected drive..."
  Pop $HF_FreeInfo
  Call HomeFlixRefreshDiskInfo
  nsDialogs::Show
FunctionEnd

Function HomeFlixRefreshDiskInfo
  System::Call 'kernel32::GetDiskFreeSpaceEx(t "$INSTDIR", *l .r1, *l .r2, *l .r3) i .r0'
  ${If} $0 != 0
    System::Int64Op $1 / 1048576
    Pop $HF_AvailableMB
    IntOp $HF_RequiredBytes 500 * 1048576
    ${If} $1 < $HF_RequiredBytes
      SendMessage $HF_FreeInfo ${WM_SETTEXT 0 "STR:WARNING — low disk space. Available: $HF_AvailableMB MB; recommended: at least 500 MB."
    ${Else}
      SendMessage $HF_FreeInfo ${WM_SETTEXT 0 "Available on selected drive: $HF_AvailableMB MB"
    ${EndIf}
  ${Else}
    SendMessage $HF_FreeInfo ${WM_SETTEXT 0 "Free space could not be read. Windows may still be able to install."
  ${EndIf}
FunctionEnd

Function HomeFlixDiskPageLeave
  Call HomeFlixRefreshDiskInfo
  System::Call 'kernel32::GetDiskFreeSpaceEx(t "$INSTDIR", *l .r1, *l .r2, *l .r3) i .r0'
  ${If} $0 != 0
    IntOp $HF_RequiredBytes 500 * 1048576
    ${If} $1 < $HF_RequiredBytes
      MessageBox MB_ICONEXCLAMATION|MB_YESNO "This drive has less than the recommended 500 MB free. Continue anyway?" IDYES +2
      Abort
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro customInstall
  DetailPrint "Preparing HomeFlix Cyber Node..."
  DetailPrint "Installing the desktop media hub..."
  DetailPrint "Creating HomeFlix shortcuts..."
!macroend

!macro customUnInstall
  DetailPrint "Removing HomeFlix Cyber Node application files..."
  DetailPrint "Personal app data is preserved."
!macroend
