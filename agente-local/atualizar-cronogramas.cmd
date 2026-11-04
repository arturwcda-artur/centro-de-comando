@echo off
rem Atualiza cronogramas e medicoes no Centro de Comando. Nenhum arquivo de origem e alterado.
rem Com o argumento /agendado (Agendador de Tarefas), nao espera uma tecla no final.
rem Configuracao: %USERPROFILE%\.centro-de-comando\agente.env  -  logs na mesma pasta.
cd /d "%~dp0"
py -m cc_agente.cronogramas
set RESULTADO=%errorlevel%
py -m cc_agente.medicoes
if not "%errorlevel%"=="0" set RESULTADO=%errorlevel%
if /i not "%~1"=="/agendado" pause
exit /b %RESULTADO%
