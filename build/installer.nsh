; HomeFlix Cyber Node — branded NSIS installer enhancements.
; Included by electron-builder. Keep page registration limited to the storage review page
; so electron-builder can retain its normal directory, install, and finish flow.

!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"

!define MUI_BGCOLOR "080D18"
!define MUI_TEXTCOLOR "F2F5FF"
!define MUI_WELCOMEPAGE_TITLE "Welcome to HomeFlix Cyber Node"
!define MUI_WELCOMEPAGE_TEXT "YOUR MEDIA. YOUR SPACE.\r\n\r\nA personal media hub for your Windows PC, designed around your library and your screen.\r\n\r\nTHIS SETUP WILL\r\n  • Install HomeFlix Cyber Node for 64-bit Windows\r\n  • Create a Start Menu shortcut and optional desktop shortcut\r\n  • Let you choose where HomeFlix is installed\r\n  • Check available disk space before installation\r\n\r\nYour personal app data is preserved if you uninstall. Your video library remains wherever you store it.\r\n\r\nClick Next to begin."
!define MUI_FINISHPAGE_TITLE "HomeFlix is ready"
!define MUI_FINISHPAGE_TEXT "INSTALLATION COMPLETE\r\n\r\nHomeFlix Cyber Node is installed on your Windows PC. Launch it from the desktop or Start Menu.\r\n\r\nANDROID COMPANION REMOTE\r\nOpen the companion app on your phone and follow the pairing steps shown in HomeFlix. For local discovery, keep both devices on the same trusted Wi-Fi network.\r\n\r\nEnjoy your library."
!define MUI_ABORTWARNING

Var HF_DiskDialog
Var HF_LocationInfo
Var HF_FreeInfo
Var HF_AvailableMB
Var HF_DiskCheckOK
!define HOMEFLIX_REQUIRED_MB 1024

Page custom HomeFlixDiskPageCreate HomeFlixDiskPageLeave

Function HomeFlixDiskPageCreate
  nsDialogs::Create 1018
  Pop $HF_DiskDialog
  ${If} $HF_DiskDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 22u "HOMEFLIX CYBER NODE  /  STORAGE CHECK"
  Pop $0
  ${NSD_CreateLabel} 0 26u 100% 30u "Review the destination and the actual free space reported by Windows before installing."
  Pop $0

  ${NSD_CreateLabel} 0 66u 100% 18u "REQUIRED FREE SPACE"
  Pop $0
  ${NSD_CreateLabel} 0 86u 100% 28u "At least 1 GB free on the selected drive. Your movies and shows need additional storage."
  Pop $0

  ${NSD_CreateLabel} 0 124u 100% 18u "INSTALL LOCATION"
  Pop $0
  ${NSD_CreateLabel} 0 144u 100% 34u "$INSTDIR"
  Pop $HF_LocationInfo

  ${NSD_CreateLabel} 0 184u 100% 38u "Checking free space..."
  Pop $HF_FreeInfo

  Call HomeFlixRefreshDiskInfo
  nsDialogs::Show
FunctionEnd

Function HomeFlixRefreshDiskInfo
  StrCpy $HF_DiskCheckOK "0"
  StrCpy $HF_AvailableMB "Unknown"

  ; Use NSIS FileFunc DriveSpace instead of passing 64-bit byte counts through
  ; 32-bit System plugin output pointers. /S=M requests MB, avoiding overflow.
  ${DriveSpace} "$INSTDIR" "/D=F /S=M" $HF_AvailableMB $0
  ${If} $HF_AvailableMB != ""
  ${AndIf} $HF_AvailableMB != "error"
    ${If} $HF_AvailableMB >= ${HOMEFLIX_REQUIRED_MB}
      StrCpy $HF_DiskCheckOK "1"
      SendMessage $HF_FreeInfo ${WM_SETTEXT} 0 "STR:AVAILABLE SPACE: $HF_AvailableMB MB — meets the 1 GB minimum."
    ${Else}
      SendMessage $HF_FreeInfo ${WM_SETTEXT} 0 "STR:LOW SPACE WARNING: $HF_AvailableMB MB available; 1024 MB is required."
    ${EndIf}
  ${Else}
    SendMessage $HF_FreeInfo ${WM_SETTEXT} 0 "STR:Windows could not report free space for this location. Choose a valid local drive and try again."
  ${EndIf}
FunctionEnd

Function HomeFlixDiskPageLeave
  Call HomeFlixRefreshDiskInfo
  ${If} $HF_DiskCheckOK != "1"
    MessageBox MB_ICONSTOP "HomeFlix setup needs at least 1 GB of free space on the selected drive. This check uses Windows' reported free space, not the drive's total capacity. Choose another drive or free up space, then continue."
    Abort
  ${EndIf}
FunctionEnd

!macro customInstall
  DetailPrint "Preparing HomeFlix Cyber Node..."
  DetailPrint "Installing the Windows desktop media hub..."
  DetailPrint "Registering supported video file types..."
  DetailPrint "Creating HomeFlix shortcuts..."
!macroend

!macro customUnInstall
  DetailPrint "Removing HomeFlix Cyber Node application files..."
  DetailPrint "Keeping personal app data as configured..."
!macroend
