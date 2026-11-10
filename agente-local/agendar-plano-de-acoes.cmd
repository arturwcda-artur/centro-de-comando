@echo off
rem Cria (ou recria) a tarefa do Agendador que le o plano de acoes de hora em hora.
rem Executar uma vez, com duplo clique. Nao precisa de administrador.
schtasks /Create /F /TN "Centro de Comando - Plano de acoes" /SC HOURLY /MO 1 /TR "\"%~dp0atualizar-acoes.cmd\" /agendado"
if errorlevel 1 (echo Nao foi possivel criar a tarefa.) else (echo Tarefa criada: leitura do plano de acoes de hora em hora.)
pause
