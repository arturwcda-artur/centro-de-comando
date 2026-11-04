@echo off
rem Atualiza os cronogramas do MS Project no Centro de Comando. Nenhum arquivo .mpp e alterado.
rem Com o argumento /agendado (Agendador de Tarefas), nao espera uma tecla no final.
rem Configuracao: %USERPROFILE%\.centro-de-comando\agente.env  -  log: cronogramas.log na mesma pasta.
cd /d "%~dp0"
py -m cc_agente.cronogramas
set RESULTADO=%errorlevel%
if /i not "%~1"=="/agendado" pause
exit /b %RESULTADO%
