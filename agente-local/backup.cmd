@echo off
rem Backup do banco do Centro de Comando (executado pelo Agendador de Tarefas do Windows).
rem Configuracao: %USERPROFILE%\.centro-de-comando\agente.env  -  log: backup.log na mesma pasta.
cd /d "%~dp0"
py -m cc_agente.backup
exit /b %errorlevel%
