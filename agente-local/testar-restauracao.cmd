@echo off
rem Testa o backup mais recente em um banco descartavel. Nao altera a nuvem.
cd /d "%~dp0"
py -m cc_agente.restauracao
echo.
pause
