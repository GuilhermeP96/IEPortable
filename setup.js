s#!/usr/bin/env node

/**
 * IE Portable - Verificador e Instalador de Dependências
 * 
 * Este script verifica todas as dependências necessárias para executar o IE Portable
 * e oferece opções para instalar o que estiver faltando.
 * 192
 * Uso: node setup.js [--install] [--quiet]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Cores para terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

// Ícones
const icons = {
    check: '✓',
    cross: '✗',
    warn: '⚠',
    circle: '○',
    arrow: '→'
};

// Argumentos
const args = process.argv.slice(2);
const autoInstall = args.includes('--install') || args.includes('-i');
const quietMode = args.includes('--quiet') || args.includes('-q');

// Contadores
let errors = 0;
let warnings = 0;

// Detectar SO
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

/**
 * Imprimir com cor
 */
function print(message, color = 'white') {
    if (!quietMode) {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }
}

/**
 * Imprimir cabeçalho
 */
function printHeader() {
    print('');
    print('╔════════════════════════════════════════════════════════════╗', 'cyan');
    print('║        IE Portable - Verificador de Dependências           ║', 'cyan');
    print('╚════════════════════════════════════════════════════════════╝', 'cyan');
    print('');
}

/**
 * Executar comando e retornar resultado
 */
function execCommand(command, silent = true) {
    try {
        const result = execSync(command, { 
            encoding: 'utf-8',
            stdio: silent ? 'pipe' : 'inherit'
        });
        return { success: true, output: result.trim() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Verificar se um comando existe
 */
function commandExists(cmd) {
    const checkCmd = isWindows ? `where ${cmd}` : `which ${cmd}`;
    return execCommand(checkCmd).success;
}

/**
 * Obter versão de um comando
 */
function getVersion(cmd, versionArg = '--version') {
    const result = execCommand(`${cmd} ${versionArg}`);
    if (result.success) {
        // Extrair apenas a versão
        const match = result.output.match(/\d+\.\d+\.\d+|\d+\.\d+/);
        return match ? match[0] : result.output.split('\n')[0];
    }
    return null;
}

/**
 * Perguntar ao usuário
 */
async function askUser(question) {
    if (autoInstall) return true;
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.toLowerCase() !== 'n');
        });
    });
}

/**
 * Verificar Node.js
 */
function checkNodeJs() {
    print(`${colors.cyan}[1/6]${colors.reset} Verificando Node.js...`);
    
    const version = getVersion('node', '-v');
    
    if (!version) {
        print(`      ${colors.red}${icons.cross} Node.js não encontrado!${colors.reset}`);
        print(`      ${colors.yellow}${icons.arrow} Baixe em: https://nodejs.org/${colors.reset}`);
        errors++;
        return false;
    }
    
    print(`      ${colors.green}${icons.check} Node.js instalado: v${version}${colors.reset}`);
    
    // Verificar versão mínima
    const major = parseInt(version.split('.')[0]);
    if (major < 18) {
        print(`      ${colors.yellow}${icons.warn} Versão recomendada: v18 ou superior${colors.reset}`);
        warnings++;
    }
    
    return true;
}

/**
 * Verificar npm
 */
function checkNpm() {
    print('');
    print(`${colors.cyan}[2/6]${colors.reset} Verificando npm...`);
    
    const version = getVersion('npm', '-v');
    
    if (!version) {
        print(`      ${colors.red}${icons.cross} npm não encontrado!${colors.reset}`);
        print(`      ${colors.yellow}${icons.arrow} Normalmente instalado junto com Node.js${colors.reset}`);
        errors++;
        return false;
    }
    
    print(`      ${colors.green}${icons.check} npm instalado: v${version}${colors.reset}`);
    return true;
}

/**
 * Verificar Git
 */
function checkGit() {
    print('');
    print(`${colors.cyan}[3/6]${colors.reset} Verificando Git (opcional)...`);
    
    const version = getVersion('git');
    
    if (!version) {
        print(`      ${colors.yellow}${icons.warn} Git não encontrado (opcional para desenvolvimento)${colors.reset}`);
        
        if (isWindows) {
            print(`      ${colors.yellow}${icons.arrow} Baixe em: https://git-scm.com/${colors.reset}`);
        } else if (isLinux) {
            print(`      ${colors.yellow}${icons.arrow} Instale com: sudo apt install git${colors.reset}`);
        } else if (isMac) {
            print(`      ${colors.yellow}${icons.arrow} Instale com: brew install git${colors.reset}`);
        }
        
        warnings++;
        return false;
    }
    
    print(`      ${colors.green}${icons.check} Git instalado: v${version}${colors.reset}`);
    return true;
}

/**
 * Verificar Wine (Linux apenas)
 */
function checkWine() {
    print('');
    print(`${colors.cyan}[4/6]${colors.reset} Verificando Wine (opcional - plugins ActiveX)...`);
    
    if (!isLinux) {
        print(`      ${colors.yellow}${icons.circle} Wine não é necessário no ${process.platform}${colors.reset}`);
        return true;
    }
    
    if (!commandExists('wine')) {
        print(`      ${colors.yellow}${icons.circle} Wine não encontrado${colors.reset}`);
        print(`      ${colors.yellow}  (Opcional: necessário apenas para plugins ActiveX)${colors.reset}`);
        print(`      ${colors.yellow}${icons.arrow} Instale com: sudo apt install wine${colors.reset}`);
        return false;
    }
    
    const version = getVersion('wine');
    print(`      ${colors.green}${icons.check} Wine instalado: ${version}${colors.reset}`);
    return true;
}

/**
 * Verificar e instalar dependências do projeto
 */
async function checkProjectDependencies() {
    print('');
    print(`${colors.cyan}[5/6]${colors.reset} Verificando dependências do projeto...`);
    
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    // Verificar se package.json existe
    if (!fs.existsSync(packageJsonPath)) {
        print(`      ${colors.red}${icons.cross} package.json não encontrado!${colors.reset}`);
        print(`      ${colors.yellow}${icons.arrow} Certifique-se de estar na pasta do projeto${colors.reset}`);
        errors++;
        return false;
    }
    
    // Verificar node_modules
    if (!fs.existsSync(nodeModulesPath)) {
        print(`      ${colors.yellow}${icons.warn} Pasta node_modules não encontrada${colors.reset}`);
        
        if (errors === 0) {
            const shouldInstall = await askUser(`      Deseja instalar as dependências agora? [S/n]: `);
            
            if (shouldInstall) {
                print('');
                print('      Instalando dependências...');
                
                const result = execCommand('npm install', false);
                
                if (!result.success) {
                    print(`      ${colors.red}${icons.cross} Falha ao instalar dependências!${colors.reset}`);
                    errors++;
                    return false;
                }
                
                print(`      ${colors.green}${icons.check} Dependências instaladas com sucesso!${colors.reset}`);
            } else {
                print(`      ${colors.yellow}${icons.arrow} Execute 'npm install' manualmente depois${colors.reset}`);
                warnings++;
                return false;
            }
        } else {
            print(`      ${colors.red}${icons.arrow} Corrija os erros acima primeiro${colors.reset}`);
            return false;
        }
    }
    
    // Verificar Electron
    const electronPath = path.join(nodeModulesPath, 'electron');
    if (fs.existsSync(electronPath)) {
        print(`      ${colors.green}${icons.check} Dependências instaladas${colors.reset}`);
        
        try {
            const electronPkg = require(path.join(electronPath, 'package.json'));
            print(`      ${colors.green}${icons.check} Electron: v${electronPkg.version}${colors.reset}`);
        } catch (e) {
            // Ignore
        }
        
        return true;
    } else {
        print(`      ${colors.yellow}${icons.warn} Dependências incompletas${colors.reset}`);
        print(`      ${colors.yellow}${icons.arrow} Execute 'npm install' para reinstalar${colors.reset}`);
        warnings++;
        return false;
    }
}

/**
 * Verificar recursos opcionais
 */
function checkOptionalResources() {
    print('');
    print(`${colors.cyan}[6/6]${colors.reset} Verificando recursos opcionais...`);
    
    // Verificar VLC
    let vlcFound = false;
    
    if (commandExists('vlc')) {
        vlcFound = true;
        print(`      ${colors.green}${icons.check} VLC encontrado (útil para streams RTSP)${colors.reset}`);
    } else if (isWindows) {
        // Verificar caminhos comuns no Windows
        const vlcPaths = [
            'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
            'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
        ];
        
        for (const vlcPath of vlcPaths) {
            if (fs.existsSync(vlcPath)) {
                vlcFound = true;
                print(`      ${colors.green}${icons.check} VLC encontrado${colors.reset}`);
                break;
            }
        }
    }
    
    if (!vlcFound) {
        print(`      ${colors.yellow}${icons.circle} VLC não encontrado (opcional para streams RTSP)${colors.reset}`);
    }
    
    // Verificar FFmpeg
    if (commandExists('ffmpeg')) {
        print(`      ${colors.green}${icons.check} FFmpeg encontrado${colors.reset}`);
    } else {
        print(`      ${colors.yellow}${icons.circle} FFmpeg não encontrado (opcional)${colors.reset}`);
    }
}

/**
 * Imprimir resumo
 */
function printSummary() {
    print('');
    print('══════════════════════════════════════════════════════════════', 'cyan');
    print('                           RESUMO');
    print('══════════════════════════════════════════════════════════════', 'cyan');
    print('');
    
    if (errors === 0) {
        if (warnings === 0) {
            print(`  ${icons.check} Tudo pronto! Ambiente configurado corretamente.`, 'green');
            print('');
            print('  Para iniciar o IE Portable:');
            print(`    ${colors.cyan}npm start${colors.reset}`);
            print('');
            print('  Para criar um executável:');
            if (isWindows) {
                print(`    ${colors.cyan}npm run build:win${colors.reset}`);
            } else {
                print(`    ${colors.cyan}npm run build:linux${colors.reset}`);
            }
        } else {
            print(`  ${icons.warn} Ambiente funcional com ${warnings} aviso(s).`, 'yellow');
            print('');
            print('  Você pode iniciar o IE Portable, mas considere');
            print('  resolver os avisos para melhor experiência.');
        }
    } else {
        print(`  ${icons.cross} Encontrado(s) ${errors} erro(s) crítico(s).`, 'red');
        print('');
        print('  Por favor, resolva os problemas acima antes de continuar.');
        print('');
        print('  Passo a passo:');
        print('    1. Instale o Node.js v18+: https://nodejs.org/');
        print('    2. Reinicie o terminal');
        print('    3. Execute este script novamente');
    }
    
    print('');
    print('══════════════════════════════════════════════════════════════', 'cyan');
    print('');
}

/**
 * Função principal
 */
async function main() {
    printHeader();
    
    // Mostrar info do sistema
    print(`Sistema: ${process.platform} (${process.arch})`);
    print(`Diretório: ${process.cwd()}`);
    print('');
    
    // Executar verificações
    checkNodeJs();
    checkNpm();
    checkGit();
    checkWine();
    await checkProjectDependencies();
    checkOptionalResources();
    
    // Mostrar resumo
    printSummary();
    
    // Código de saída
    process.exit(errors > 0 ? 1 : 0);
}

// Executar
main().catch(console.error);
