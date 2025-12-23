@echo off
title IE Portable

echo ==========================================
echo         IE Portable - Iniciando
echo ==========================================
echo.

:: Verifica se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org
    pause
    exit /b 1
)

:: Verifica se as dependências estão instaladas
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
    echo.
)

echo Iniciando IE Portable...
echo.
npm start

pause
