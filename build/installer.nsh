; HomeFlix Cyber Node - branded NSIS installer experience
; Included by electron-builder before the generated installer pages.

!define MUI_BGCOLOR "0B1020"
!define MUI_TEXTCOLOR "EAF0FF"
!define MUI_HEADER_TRANSPARENT_TEXT "true"
!define MUI_WELCOMEPAGE_TITLE "Welcome to HomeFlix Cyber Node"
!define MUI_WELCOMEPAGE_TEXT "Your personal media hub is ready to install.$\r$\n$\r$\nThis setup will install HomeFlix Cyber Node, create your Start Menu and desktop shortcuts, and prepare the app for your local media library.$\r$\n$\r$\nClick Next to choose where HomeFlix should be installed."
!define MUI_FINISHPAGE_TITLE "HomeFlix is ready to go"
!define MUI_FINISHPAGE_TEXT "Installation is complete.$\r$\n$\r$\nLaunch HomeFlix Cyber Node to open your personal media hub. For the phone remote, keep your PC and phone on the same trusted Wi-Fi network."
!define MUI_ABORTWARNING

; Keep the generated install flow intact while adding a branded finish action.
!macro customInstall
  DetailPrint "Setting up HomeFlix Cyber Node..."
  DetailPrint "Registering HomeFlix shortcuts and video file support..."
!macroend

!macro customUnInstall
  DetailPrint "Removing HomeFlix Cyber Node application files..."
  DetailPrint "Your app data is being preserved."
!macroend
