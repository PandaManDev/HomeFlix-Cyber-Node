; HomeFlix Cyber Node — branded NSIS installer enhancements.
; Included by electron-builder. Keep page registration limited to the storage review page
; so electron-builder can retain its normal directory, install, and finish flow.

!include "LogicLib.nsh"

!define MUI_BGCOLOR "080D18"
!define MUI_TEXTCOLOR "F2F5FF"
!define MUI_WELCOMEPAGE_TITLE "Welcome to HomeFlix Cyber Node"
!define MUI_WELCOMEPAGE_TEXT "YOUR MEDIA. YOUR SPACE.\r\n\r\nA personal media hub for your Windows PC, designed around your library and your screen.\r\n\r\nTHIS SETUP WILL\r\n  • Install HomeFlix Cyber Node for 64-bit Windows\r\n  • Create a Start Menu shortcut and optional desktop shortcut\r\n  • Let you choose where HomeFlix is installed\r\n\r\nYour personal app data is preserved if you uninstall. Your video library remains wherever you store it.\r\n\r\nClick Next to begin."
!define MUI_FINISHPAGE_TITLE "HomeFlix is ready"
!define MUI_FINISHPAGE_TEXT "INSTALLATION COMPLETE\r\n\r\nHomeFlix Cyber Node is installed on your Windows PC. Launch it from the desktop or Start Menu.\r\n\r\nANDROID COMPANION REMOTE\r\nOpen the companion app on your phone and follow the pairing steps shown in HomeFlix. For local discovery, keep both devices on the same trusted Wi-Fi network.\r\n\r\nEnjoy your library."
!define MUI_ABORTWARNING

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
