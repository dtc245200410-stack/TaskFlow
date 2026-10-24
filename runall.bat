@echo off
setlocal
rem Run from this project's directory, including paths containing spaces.
pushd "%~dp0"
if errorlevel 1 exit /b 1
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start.ps1" %*
set "TASKFLOW_RUNALL_EXIT=%ERRORLEVEL%"
popd
exit /b %TASKFLOW_RUNALL_EXIT%
