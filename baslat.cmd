@echo off
REM KioskMES demo baslaticisi: sunucuyu arka planda calistirir,
REM hazir olunca tarayiciyi acar. Node PATH'te olmasa bile calisir.
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

if not exist "node_modules" (
  echo Bagimliliklar kuruluyor, lutfen bekleyin...
  call npm install
)

REM Sunucu zaten calisiyorsa dogrudan tarayiciyi ac
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  start "" http://localhost:3000
  exit /b 0
)

echo KioskMES baslatiliyor...
start "KioskMES Sunucu" /min cmd /c "set PATH=C:\Program Files\nodejs;%%PATH%% && cd /d "%~dp0" && npm run dev"

REM Sunucunun ayaga kalkmasini bekle (en fazla ~120 sn)
set /a tries=0
:wait
set /a tries+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel%==0 goto ready
if %tries% geq 60 goto ready
timeout /t 2 /nobreak >nul
goto wait

:ready
start "" http://localhost:3000
exit /b 0
