@echo off
rem Le o plano de acoes das obras (aba ACOES da Central de Gestao) e envia ao Centro de Comando.
rem Nenhum arquivo de origem e alterado. Com /agendado (Agendador de Tarefas), nao espera uma tecla.
rem Configuracao: %USERPROFILE%\.centro-de-comando\agente.env  -  log: acoes.log na mesma pasta.
cd /d "%~dp0"
py -m cc_agente.acoes
set RESULTADO=%errorlevel%
if /i not "%~1"=="/agendado" pause
exit /b %RESULTADO%
