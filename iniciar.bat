@echo off
cd /d "%~dp0"

echo ==============================================
echo        INICIANDO TOTEM QR
echo ==============================================

REM ------------------------------------------------
REM 1. Iniciar TotemQR.exe solo si no esta abierto
REM ------------------------------------------------
tasklist /FI "IMAGENAME eq TotemQR.exe" | find /I "TotemQR.exe" >nul

if errorlevel 1 (
    echo Iniciando servidor...
    start "" "TotemQR.exe"
    timeout /t 2 /nobreak >nul
) else (
    echo El servidor ya esta funcionando.
)

REM ------------------------------------------------
REM 2. Buscar Brave
REM ------------------------------------------------
set "BRAVE="

if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BRAVE=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
)

if exist "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BRAVE=%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe"
)

if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BRAVE=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
)

REM ------------------------------------------------
REM 3. Abrir las dos paginas
REM ------------------------------------------------
if defined BRAVE (

    echo Abriendo navegador...

    start "" "%BRAVE%" --new-window ^
        "http://localhost:8080/" ^
        "http://localhost:8080/ajuste.html"

    REM Esperar a que Brave termine de abrir
    timeout /t 3 /nobreak >nul

    REM Volver a la primera pestaña: INDEX
    powershell -NoProfile -Command ^
        "$p=Get-Process brave | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object -First 1; if($p){$ws=New-Object -ComObject WScript.Shell; $ws.AppActivate($p.Id); Start-Sleep -Milliseconds 300; $ws.SendKeys('^1')}"

) else (
    echo.
    echo ERROR: No se encontro Brave.
    echo.
)

echo.
echo ==============================================
echo       TOTEM QR INICIADO
echo ==============================================

exit