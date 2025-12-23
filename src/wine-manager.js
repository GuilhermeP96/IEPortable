// ============================================
// Wine Manager - Detecção e Instalação do Wine
// ============================================

const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class WineManager {
  constructor() {
    this.platform = os.platform();
    this.wineInstalled = false;
    this.wineVersion = null;
    this.winePath = null;
    this.distro = null;
    this.packageManager = null;
    
    // Detectar distribuição Linux
    if (this.platform === 'linux') {
      this.detectDistro();
    }
  }

  /**
   * Detecta a distribuição Linux e gerenciador de pacotes
   */
  detectDistro() {
    try {
      // Tentar /etc/os-release primeiro
      if (fs.existsSync('/etc/os-release')) {
        const osRelease = fs.readFileSync('/etc/os-release', 'utf-8');
        
        if (osRelease.includes('Ubuntu') || osRelease.includes('Debian') || osRelease.includes('Pop!_OS') || osRelease.includes('Linux Mint')) {
          this.distro = 'debian';
          this.packageManager = 'apt';
        } else if (osRelease.includes('Fedora') || osRelease.includes('Red Hat') || osRelease.includes('CentOS')) {
          this.distro = 'fedora';
          this.packageManager = 'dnf';
        } else if (osRelease.includes('Arch') || osRelease.includes('Manjaro') || osRelease.includes('EndeavourOS')) {
          this.distro = 'arch';
          this.packageManager = 'pacman';
        } else if (osRelease.includes('openSUSE')) {
          this.distro = 'suse';
          this.packageManager = 'zypper';
        } else {
          this.distro = 'unknown';
          this.packageManager = null;
        }
      }
    } catch (e) {
      console.warn('Não foi possível detectar distribuição:', e);
      this.distro = 'unknown';
    }
  }

  /**
   * Verifica se o Wine está instalado
   */
  async checkWineInstalled() {
    if (this.platform === 'win32') {
      // No Windows não precisa de Wine
      return { installed: true, native: true };
    }

    if (this.platform === 'darwin') {
      // macOS - verificar Wine ou CrossOver
      return this.checkWineMac();
    }

    // Linux
    return new Promise((resolve) => {
      exec('which wine', (error, stdout) => {
        if (error || !stdout.trim()) {
          this.wineInstalled = false;
          resolve({ installed: false });
          return;
        }

        this.winePath = stdout.trim();
        
        // Obter versão
        exec('wine --version', (err, version) => {
          if (!err && version) {
            this.wineVersion = version.trim();
            this.wineInstalled = true;
            resolve({
              installed: true,
              version: this.wineVersion,
              path: this.winePath
            });
          } else {
            this.wineInstalled = true;
            resolve({
              installed: true,
              path: this.winePath
            });
          }
        });
      });
    });
  }

  /**
   * Verifica Wine no macOS
   */
  async checkWineMac() {
    return new Promise((resolve) => {
      // Verificar Homebrew Wine primeiro
      exec('brew list wine 2>/dev/null || brew list wine-stable 2>/dev/null', (error) => {
        if (!error) {
          exec('wine --version', (err, version) => {
            this.wineInstalled = true;
            this.wineVersion = version?.trim();
            resolve({
              installed: true,
              version: this.wineVersion,
              method: 'homebrew'
            });
          });
          return;
        }

        // Verificar CrossOver
        const crossoverPath = '/Applications/CrossOver.app';
        if (fs.existsSync(crossoverPath)) {
          this.wineInstalled = true;
          resolve({
            installed: true,
            method: 'crossover',
            note: 'CrossOver detectado - use o CrossOver para executar plugins'
          });
          return;
        }

        resolve({ installed: false });
      });
    });
  }

  /**
   * Retorna o comando de instalação do Wine para a distro atual
   */
  getInstallCommand() {
    if (this.platform === 'win32') {
      return null; // Não precisa no Windows
    }

    if (this.platform === 'darwin') {
      return {
        command: 'brew install wine-stable',
        sudo: false,
        packageManager: 'homebrew',
        prerequisites: 'Instale o Homebrew primeiro: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
      };
    }

    // Linux
    const commands = {
      apt: {
        command: 'apt install -y wine wine32 wine64',
        sudo: true,
        packageManager: 'apt',
        enableMultiarch: 'dpkg --add-architecture i386 && apt update'
      },
      dnf: {
        command: 'dnf install -y wine',
        sudo: true,
        packageManager: 'dnf'
      },
      pacman: {
        command: 'pacman -S --noconfirm wine wine-mono wine-gecko',
        sudo: true,
        packageManager: 'pacman',
        enableMultilib: 'Habilite o repositório multilib em /etc/pacman.conf'
      },
      zypper: {
        command: 'zypper install -y wine',
        sudo: true,
        packageManager: 'zypper'
      }
    };

    return commands[this.packageManager] || {
      command: null,
      manual: true,
      instructions: 'Instale o Wine manualmente através do seu gerenciador de pacotes'
    };
  }

  /**
   * Retorna instruções detalhadas de instalação
   */
  getInstallInstructions() {
    if (this.platform === 'win32') {
      return {
        needed: false,
        message: 'Windows detectado - plugins ActiveX funcionam nativamente'
      };
    }

    const instructions = {
      needed: true,
      platform: this.platform,
      distro: this.distro,
      steps: []
    };

    if (this.platform === 'darwin') {
      instructions.steps = [
        {
          title: 'Instalar Homebrew (se não tiver)',
          command: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
          sudo: false
        },
        {
          title: 'Instalar Wine via Homebrew',
          command: 'brew install wine-stable',
          sudo: false
        },
        {
          title: 'Configurar Wine',
          command: 'winecfg',
          sudo: false,
          note: 'Execute para configuração inicial do Wine'
        }
      ];
      return instructions;
    }

    // Linux
    switch (this.packageManager) {
      case 'apt':
        instructions.steps = [
          {
            title: 'Habilitar arquitetura 32-bit',
            command: 'sudo dpkg --add-architecture i386',
            sudo: true
          },
          {
            title: 'Atualizar repositórios',
            command: 'sudo apt update',
            sudo: true
          },
          {
            title: 'Instalar Wine',
            command: 'sudo apt install -y wine wine32 wine64 winetricks',
            sudo: true
          },
          {
            title: 'Configurar Wine',
            command: 'winecfg',
            sudo: false,
            note: 'Execute para configuração inicial'
          }
        ];
        break;

      case 'dnf':
        instructions.steps = [
          {
            title: 'Instalar Wine',
            command: 'sudo dnf install -y wine winetricks',
            sudo: true
          },
          {
            title: 'Configurar Wine',
            command: 'winecfg',
            sudo: false
          }
        ];
        break;

      case 'pacman':
        instructions.steps = [
          {
            title: 'Habilitar repositório multilib',
            command: 'Edite /etc/pacman.conf e descomente [multilib]',
            manual: true
          },
          {
            title: 'Atualizar repositórios',
            command: 'sudo pacman -Sy',
            sudo: true
          },
          {
            title: 'Instalar Wine',
            command: 'sudo pacman -S wine wine-mono wine-gecko winetricks',
            sudo: true
          },
          {
            title: 'Configurar Wine',
            command: 'winecfg',
            sudo: false
          }
        ];
        break;

      case 'zypper':
        instructions.steps = [
          {
            title: 'Instalar Wine',
            command: 'sudo zypper install wine winetricks',
            sudo: true
          },
          {
            title: 'Configurar Wine',
            command: 'winecfg',
            sudo: false
          }
        ];
        break;

      default:
        instructions.steps = [
          {
            title: 'Instalação Manual',
            manual: true,
            note: 'Consulte a documentação da sua distribuição para instalar o Wine'
          }
        ];
    }

    return instructions;
  }

  /**
   * Tenta instalar o Wine automaticamente (requer privilégios)
   */
  async installWine(onProgress, onComplete, onError) {
    if (this.platform === 'win32') {
      onComplete({ success: true, message: 'Windows não requer Wine' });
      return;
    }

    const installCmd = this.getInstallCommand();
    
    if (!installCmd || installCmd.manual) {
      onError(new Error('Instalação automática não disponível para esta distribuição'));
      return;
    }

    // Para Linux com apt, precisamos de várias etapas
    if (this.packageManager === 'apt') {
      return this.installWineApt(onProgress, onComplete, onError);
    }

    // Outros gerenciadores - comando único
    const fullCommand = installCmd.sudo ? `pkexec ${installCmd.command}` : installCmd.command;
    
    onProgress({ step: 'install', message: 'Instalando Wine...' });

    const process = spawn('sh', ['-c', fullCommand], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
      onProgress({ step: 'install', output: data.toString() });
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
      onProgress({ step: 'install', output: data.toString() });
    });

    process.on('close', (code) => {
      if (code === 0) {
        this.wineInstalled = true;
        onComplete({ success: true, message: 'Wine instalado com sucesso!' });
      } else {
        onError(new Error(`Instalação falhou (código ${code}): ${errorOutput}`));
      }
    });

    process.on('error', (err) => {
      onError(err);
    });
  }

  /**
   * Instalação específica para sistemas baseados em Debian/Ubuntu
   */
  async installWineApt(onProgress, onComplete, onError) {
    const steps = [
      { cmd: 'dpkg --add-architecture i386', desc: 'Habilitando arquitetura 32-bit' },
      { cmd: 'apt update', desc: 'Atualizando repositórios' },
      { cmd: 'apt install -y wine wine32 wine64 winetricks', desc: 'Instalando Wine' }
    ];

    let currentStep = 0;

    const runNextStep = () => {
      if (currentStep >= steps.length) {
        this.wineInstalled = true;
        onComplete({ success: true, message: 'Wine instalado com sucesso!' });
        return;
      }

      const step = steps[currentStep];
      onProgress({ 
        step: currentStep + 1, 
        total: steps.length, 
        message: step.desc 
      });

      const process = spawn('pkexec', ['sh', '-c', step.cmd], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
        onProgress({ step: currentStep + 1, output: data.toString() });
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
        onProgress({ step: currentStep + 1, output: data.toString() });
      });

      process.on('close', (code) => {
        if (code === 0 || code === null) {
          currentStep++;
          runNextStep();
        } else {
          // Alguns erros são aceitáveis (ex: arquitetura já adicionada)
          if (step.cmd.includes('dpkg --add-architecture')) {
            currentStep++;
            runNextStep();
          } else {
            onError(new Error(`Falha no passo "${step.desc}": código ${code}`));
          }
        }
      });

      process.on('error', (err) => {
        // Se pkexec falhar, pode ser cancelamento do usuário
        if (err.message.includes('ENOENT')) {
          onError(new Error('pkexec não encontrado. Instale o polkit.'));
        } else {
          onError(err);
        }
      });
    };

    runNextStep();
  }

  /**
   * Gera script de instalação para execução manual
   */
  generateInstallScript() {
    const instructions = this.getInstallInstructions();
    
    if (!instructions.needed) {
      return null;
    }

    let script = '#!/bin/bash\n';
    script += '# Script de instalação do Wine para IE Portable\n';
    script += '# Gerado automaticamente\n\n';
    script += 'set -e\n\n';

    for (const step of instructions.steps) {
      if (step.manual) {
        script += `# ${step.title}\n`;
        script += `echo "${step.note || step.title}"\n\n`;
      } else {
        script += `echo ">>> ${step.title}"\n`;
        script += `${step.command}\n\n`;
      }
    }

    script += 'echo "Wine instalado com sucesso!"\n';
    script += 'wine --version\n';

    return script;
  }

  /**
   * Retorna status atual do Wine
   */
  async getStatus() {
    const wineCheck = await this.checkWineInstalled();
    
    return {
      platform: this.platform,
      distro: this.distro,
      packageManager: this.packageManager,
      wine: wineCheck,
      canInstallAutomatically: this.packageManager !== null && this.platform !== 'win32',
      installInstructions: this.getInstallInstructions()
    };
  }
}

module.exports = WineManager;
