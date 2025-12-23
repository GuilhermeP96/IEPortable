@echo off
title IE Portable - Build

echo ==========================================
echo         IE Portable - Build
echo ==========================================
echo.

:: Verifica argumentos
if "%1"=="" (
    echo Uso: build.bat [win^|linux^|all]
    echo.
    echo Opcoes:
    echo   win   - Build apenas para Windows
    echo   linux - Build apenas para Linux
    echo   all   - Build para Windows e Linux
    echo.
    set /p choice="Escolha [win/linux/all]: "
) else (
    set choice=%1
)

:: Verifica se as dependências estão instaladas
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
)

echo.
echo Gerando build para: %choice%
echo.

if "%choice%"=="win" (
    npm run build:win
) else if "%choice%"=="linux" (
    npm run build:linux
) else if "%choice%"=="all" (
    npm run build:all
) else (
    echo Opcao invalida!
    exit /b 1
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==========================================
    echo Build concluido! Verifique a pasta dist/
    echo ==========================================
) else (
    echo.
    echo [ERRO] Build falhou!
)

pause
