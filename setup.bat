@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>nul
title IE Portable - Verificador de Dependências

:: Mudar para o diretório do script
cd /d "%~dp0"

:: Cores ANSI (requer Windows 10+)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo.
echo %CYAN%=========================================================%RESET%
echo %CYAN%      IE Portable - Verificador de Dependencias          %RESET%
echo %CYAN%=========================================================%RESET%
echo.

set "ERRORS=0"
set "WARNINGS=0"

:: ==========================================
:: Verificar Node.js
:: ==========================================
echo %CYAN%[1/5]%RESET% Verificando Node.js...

where node >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo       %RED%X Node.js nao encontrado!%RESET%
    echo       %YELLOW%-^> Baixe em: https://nodejs.org/%RESET%
    set /a ERRORS+=1
    goto :check_npm
)

for /f "tokens=1" %%v in ('node -v 2^>nul') do set "NODE_VERSION=%%v"
echo       %GREEN%V Node.js instalado: !NODE_VERSION!%RESET%

:: Verificar versão mínima (v18)
set "NODE_MAJOR=!NODE_VERSION:~1,2!"
if !NODE_MAJOR! LSS 18 (
    echo       %YELLOW%! Versao recomendada: v18 ou superior%RESET%
    set /a WARNINGS+=1
)

:: ==========================================
:: Verificar npm
:: ==========================================
:check_npm
echo.
echo %CYAN%[2/5]%RESET% Verificando npm...

where npm >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo       %RED%X npm nao encontrado!%RESET%
    echo       %YELLOW%-^> Normalmente instalado junto com Node.js%RESET%
    set /a ERRORS+=1
    goto :check_git
)

for /f "tokens=1" %%v in ('npm -v 2^>nul') do set "NPM_VERSION=%%v"
echo       %GREEN%V npm instalado: v!NPM_VERSION!%RESET%

:: ==========================================
:: Verificar Git (opcional)
:: ==========================================
:check_git
echo.
echo %CYAN%[3/5]%RESET% Verificando Git - opcional...

where git >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo       %YELLOW%! Git nao encontrado - opcional para desenvolvimento%RESET%
    echo       %YELLOW%-^> Baixe em: https://git-scm.com/%RESET%
    set /a WARNINGS+=1
    goto :check_deps
)

for /f "tokens=3" %%v in ('git --version 2^>nul') do set "GIT_VERSION=%%v"
echo       %GREEN%V Git instalado: v!GIT_VERSION!%RESET%

:: ==========================================
:: Verificar dependências do projeto (node_modules)
:: ==========================================
:check_deps
echo.
echo %CYAN%[4/5]%RESET% Verificando dependencias do projeto...

if not exist "node_modules" (
    echo       %YELLOW%! Pasta node_modules nao encontrada%RESET%
    
    if !ERRORS! EQU 0 (
        echo.
        set /p "INSTALL_DEPS=      Deseja instalar as dependencias agora? [S/n]: "
        if /i "!INSTALL_DEPS!"=="n" (
            echo       %YELLOW%-^> Execute 'npm install' manualmente depois%RESET%
            set /a WARNINGS+=1
        ) else (
            echo.
            echo       Instalando dependencias...
            call npm install
            if !ERRORLEVEL! neq 0 (
                echo       %RED%X Falha ao instalar dependencias!%RESET%
                set /a ERRORS+=1
            ) else (
                echo       %GREEN%V Dependencias instaladas com sucesso!%RESET%
            )
        )
    ) else (
        echo       %RED%-^> Corrija os erros acima primeiro%RESET%
    )
    goto :check_optional
)

:: Verificar se electron está instalado
if exist "node_modules\electron" (
    echo       %GREEN%V Dependencias instaladas%RESET%
    
    :: Verificar versão do Electron
    for /f "tokens=*" %%v in ('node -e "console.log(require('./node_modules/electron/package.json').version)" 2^>nul') do set "ELECTRON_VERSION=%%v"
    if defined ELECTRON_VERSION (
        echo       %GREEN%V Electron: v!ELECTRON_VERSION!%RESET%
    )
) else (
    echo       %YELLOW%! Dependencias incompletas%RESET%
    echo       %YELLOW%-^> Execute 'npm install' para reinstalar%RESET%
    set /a WARNINGS+=1
)

:: ==========================================
:: Verificar recursos opcionais
:: ==========================================
:check_optional
echo.
echo %CYAN%[5/5]%RESET% Verificando recursos opcionais...

:: Verificar VLC (útil para streams RTSP)
set "VLC_FOUND=0"
where vlc >nul 2>nul
if !ERRORLEVEL! equ 0 (
    echo       %GREEN%V VLC encontrado - util para streams RTSP%RESET%
    set "VLC_FOUND=1"
)

if !VLC_FOUND! equ 0 (
    if exist "%ProgramFiles%\VideoLAN\VLC\vlc.exe" (
        echo       %GREEN%V VLC encontrado em Program Files%RESET%
        set "VLC_FOUND=1"
    )
)

if !VLC_FOUND! equ 0 (
    if exist "%ProgramFiles(x86)%\VideoLAN\VLC\vlc.exe" (
        echo       %GREEN%V VLC encontrado em Program Files x86%RESET%
        set "VLC_FOUND=1"
    )
)

if !VLC_FOUND! equ 0 (
    echo       %YELLOW%o VLC nao encontrado - opcional para streams RTSP%RESET%
)

:: ==========================================
:: Resumo
:: ==========================================
:summary
echo.
echo %CYAN%=========================================================%RESET%
echo                           RESUMO
echo %CYAN%=========================================================%RESET%
echo.

if !ERRORS! EQU 0 (
    if !WARNINGS! EQU 0 (
        echo   %GREEN%V Tudo pronto! Ambiente configurado corretamente.%RESET%
        echo.
        echo   Para iniciar o IE Portable:
        echo     %CYAN%npm start%RESET%     ou     %CYAN%start.bat%RESET%
        echo.
        echo   Para criar um executavel:
        echo     %CYAN%npm run build:win%RESET%     ou     %CYAN%build.bat win%RESET%
    ) else (
        echo   %YELLOW%! Ambiente funcional com !WARNINGS! aviso[s].%RESET%
        echo.
        echo   Voce pode iniciar o IE Portable, mas considere
        echo   resolver os avisos para melhor experiencia.
    )
) else (
    echo   %RED%X Encontrados !ERRORS! erros criticos.%RESET%
    echo.
    echo   Por favor, resolva os problemas acima antes de continuar.
    echo.
    echo   Passo a passo:
    echo     1. Instale o Node.js v18+: https://nodejs.org/
    echo     2. Reinicie o terminal
    echo     3. Execute este script novamente
)

echo.
echo %CYAN%=========================================================%RESET%
echo.

pause
endlocal
