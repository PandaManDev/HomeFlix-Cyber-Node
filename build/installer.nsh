; HomeFlix Cyber Node - branded NSIS installer experience
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!define MUI_BGCOLOR "0B1020"
!define MUI_TEXTCOLOR "EAF0FF"
!define MUI_WELCOMEPAGE_TITLE "Welcome to HomeFlix Cyber Node"
!define MUI_WELCOMEPAGE_TEXT "Your personal media hub is ready to install.$\r$\n$\r$\nThis setup will install HomeFlix Cyber Node, create your Start Menu and desktop shortcuts, and prepare the app for your local media library.$\r$\n$\r$\nClick Next to choose where HomeFlix should be installed."
!define MUI_FINISHPAGE_TITLE "HomeFlix is ready to go"
!define MUI_FINISHPAGE_TEXT "Installation is complete.$\r$\n$\r$\nLaunch HomeFlix Cyber Node to open your personal media hub. For the phone remote, keep your PC and phone on the same trusted Wi-Fi network."
!define MUI_ABORTWARNING
Var HF_DiskDialog
Var HF_DiskInfo
Var HF_FreeBytes
Var HF_RequiredBytes
!define HOMEFLIX_REQUIRED_MB 500

Page custom HomeFlixDiskPageCreate HomeFlixDiskPageLeave

Function HomeFlixDiskPageCreate
  nsDialogs::Create 1018
  Pop $HF_DiskDialog
  ${If} $HF_DiskDialog == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 18u "HomeFlix Cyber Node — Storage details"
  Pop $0
  ${NSD_CreateLabel} 0 26u 100% 30u "Required disk space: at least ${HOMEFLIX_REQUIRED_MB} MB for the application. Your media files are not included."
  Pop $0
  ${NSD_CreateLabel} 0 62u 100% 18u "Installation location:"
  Pop $0
  ${NSD_CreateLabel} 8u 82u 92% 24u "$INSTDIR"
  Pop $HF_DiskInfo
  ${NSD_CreateLabel} 0 112u 100% 44u "Free space is checked when you continue."
  Pop $HF_FreeBytes
  Call HomeFlixRefreshDiskInfo
  nsDialogs::Show
FunctionEnd

Function HomeFlixRefreshDiskInfo
  System::Call 'kernel32::GetDiskFreeSpaceEx(t "$INSTDIR", *l .r1, *l .r2, *l .r3) i .r0'
  ${If} $0 != 0
    System::Int64Op $1 / 1048576
    Pop $2
    IntOp $HF_RequiredBytes ${HOMEFLIX_REQUIRED_MB} * 1048576
    ${If} $1 < $HF_RequiredBytes
      SendMessage $HF_FreeBytes ${WM_SETTEXT} 0 "STR:WARNING: Not enough free space. Available: $2 MB; required: at least ${HOMEFLIX_REQUIRED_MB} MB."
    ${Else}
      SendMessage $HF_FreeBytes ${WM_SETTEXT} 0 "STR:Available on selected drive: $2 MB"
    ${EndIf}
  ${Else}
    SendMessage $HF_FreeBytes ${WM_SETTEXT} 0 "STR:Could not read free space for this destination."
  ${EndIf}
FunctionEnd

Function HomeFlixDiskPageLeave
  Call HomeFlixRefreshDiskInfo
  System::Call 'kernel32::GetDiskFreeSpaceEx(t "$INSTDIR", *l .r1, *l .r2, *l .r3) i .r0'
  ${If} $0 != 0
    IntOp $HF_RequiredBytes ${HOMEFLIX_REQUIRED_MB} * 1048576
    ${If} $1 < $HF_RequiredBytes
      MessageBox MB_ICONEXCLAMATION|MB_OK "This drive may not have enough free space.$\r$\nAt least ${HOMEFLIX_REQUIRED_MB} MB is recommended. Please choose another drive or free up space."
      Abort
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro customInstall
  DetailPrint "Setting up HomeFlix Cyber Node..."
  DetailPrint "Checking the installation destination..."
!macroend

!macro customUnInstall
  DetailPrint "Removing HomeFlix Cyber Node application files..."
  DetailPrint "Your app data is being preserved."
!macroend
