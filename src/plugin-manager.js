// ============================================
// Plugin Manager - Gerenciador de Plugins ActiveX
// Sandbox para instalação e gerenciamento de plugins
// ============================================

const { app, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const os = require('os');
const WineActiveXScanner = require('./wine-activex-scanner');

class PluginManager {
  constructor() {
    // Diretório sandbox para plugins
    this.sandboxDir = path.join(app.getPath('userData'), 'plugin-sandbox');
    this.pluginsDir = path.join(this.sandboxDir, 'plugins');
    this.registryFile = path.join(this.sandboxDir, 'registry.json');
    this.logsDir = path.join(this.sandboxDir, 'logs');
    
    // Wine prefix path
    this.winePrefix = process.env.WINEPREFIX || path.join(os.homedir(), '.wine');
    
    // Extensões suportadas
    this.supportedExtensions = ['.exe', '.ocx', '.cab', '.dll', '.msi'];
    
    // Inicializar diretórios
    this.initDirectories();
    
    // Carregar registro de plugins
    this.plugins = this.loadRegistry();
    
    // Detectar ambiente
    this.platform = os.platform();
    this.hasWine = false;
    this.checkWineAvailability();
    
    // Scanner de ActiveX instalados no Wine
    this.activeXScanner = new WineActiveXScanner();
    
    // Cache de plugins instalados no Wine
    this.wineInstalledPlugins = null;
  }

  /**
   * Inicializa diretórios necessários
   */
  initDirectories() {
    const dirs = [this.sandboxDir, this.pluginsDir, this.logsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Carrega registro de plugins instalados
   */
  loadRegistry() {
    try {
      if (fs.existsSync(this.registryFile)) {
        const data = fs.readFileSync(this.registryFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Erro ao carregar registro de plugins:', e);
    }
    return { plugins: [], version: 1 };
  }

  /**
   * Salva registro de plugins
   */
  saveRegistry() {
    try {
      fs.writeFileSync(this.registryFile, JSON.stringify(this.plugins, null, 2));
    } catch (e) {
      console.error('Erro ao salvar registro de plugins:', e);
    }
  }

  /**
   * Verifica se Wine está disponível (Linux/macOS)
   */
  async checkWineAvailability() {
    if (this.platform === 'win32') {
      this.hasWine = false; // Não precisa de Wine no Windows
      return;
    }

    return new Promise((resolve) => {
      exec('wine --version', (error, stdout) => {
        this.hasWine = !error;
        if (this.hasWine) {
          console.log('Wine detectado:', stdout.trim());
        }
        resolve(this.hasWine);
      });
    });
  }

  /**
   * Calcula hash MD5 de um arquivo
   */
  calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Extrai informações do arquivo
   */
  async extractFileInfo(filePath) {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    
    const info = {
      originalName: filename,
      extension: ext,
      size: stats.size,
      sizeFormatted: this.formatBytes(stats.size),
      hash: this.calculateFileHash(filePath),
      importDate: new Date().toISOString(),
      lastUsed: null,
      source: 'manual',
      status: 'imported'
    };

    // Tentar extrair mais informações
    if (this.platform === 'win32') {
      // No Windows, podemos usar PowerShell para extrair metadados
      try {
        const metadata = await this.extractWindowsMetadata(filePath);
        Object.assign(info, metadata);
      } catch (e) {
        console.warn('Não foi possível extrair metadados:', e);
      }
    }

    return info;
  }

  /**
   * Extrai metadados no Windows via PowerShell
   */
  extractWindowsMetadata(filePath) {
    return new Promise((resolve, reject) => {
      const psScript = `
        $file = Get-Item "${filePath.replace(/\\/g, '\\\\')}"
        $shell = New-Object -ComObject Shell.Application
        $folder = $shell.Namespace($file.DirectoryName)
        $item = $folder.ParseName($file.Name)
        @{
          ProductName = $folder.GetDetailsOf($item, 297)
          FileVersion = $folder.GetDetailsOf($item, 166)
          Company = $folder.GetDetailsOf($item, 33)
          Description = $folder.GetDetailsOf($item, 34)
        } | ConvertTo-Json
      `;

      exec(`powershell -Command "${psScript}"`, (error, stdout) => {
        if (error) {
          resolve({});
        } else {
          try {
            const data = JSON.parse(stdout);
            resolve({
              productName: data.ProductName || null,
              fileVersion: data.FileVersion || null,
              company: data.Company || null,
              description: data.Description || null
            });
          } catch {
            resolve({});
          }
        }
      });
    });
  }

  /**
   * Formata bytes para exibição
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Importa um plugin para a sandbox
   */
  async importPlugin(sourcePath, sourceUrl = null) {
    const ext = path.extname(sourcePath).toLowerCase();
    
    if (!this.supportedExtensions.includes(ext)) {
      throw new Error(`Extensão não suportada: ${ext}. Suportadas: ${this.supportedExtensions.join(', ')}`);
    }

    // Extrair informações do arquivo
    const fileInfo = await this.extractFileInfo(sourcePath);
    
    // Verificar se já existe (pelo hash)
    const existing = this.plugins.plugins.find(p => p.hash === fileInfo.hash);
    if (existing) {
      return {
        success: false,
        error: 'Plugin já importado',
        existingPlugin: existing
      };
    }

    // Gerar ID único
    const pluginId = `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Criar diretório do plugin
    const pluginDir = path.join(this.pluginsDir, pluginId);
    fs.mkdirSync(pluginDir, { recursive: true });
    
    // Copiar arquivo para sandbox
    const destPath = path.join(pluginDir, fileInfo.originalName);
    fs.copyFileSync(sourcePath, destPath);
    
    // Criar entrada no registro
    const pluginEntry = {
      id: pluginId,
      ...fileInfo,
      sourceUrl: sourceUrl,
      sandboxPath: destPath,
      sandboxDir: pluginDir,
      registered: false,
      registrationError: null,
      notes: ''
    };

    // Adicionar ao registro
    this.plugins.plugins.push(pluginEntry);
    this.saveRegistry();

    // No Windows, tentar registrar automaticamente se for OCX/DLL
    if (this.platform === 'win32' && ['.ocx', '.dll'].includes(ext)) {
      try {
        console.log(`[PluginManager] Auto-registrando: ${destPath}`);
        await this.registerPluginFile(destPath);
        pluginEntry.registered = true;
        this.saveRegistry();
        console.log(`[PluginManager] Registrado com sucesso: ${fileInfo.originalName}`);
      } catch (e) {
        console.warn(`[PluginManager] Falha ao auto-registrar: ${e.message}`);
        pluginEntry.registrationError = e.message;
        this.saveRegistry();
      }
    }

    return {
      success: true,
      plugin: pluginEntry
    };
  }

  /**
   * Registra um arquivo OCX/DLL no Windows
   */
  async registerPluginFile(filePath) {
    return new Promise((resolve, reject) => {
      if (this.platform !== 'win32') {
        reject(new Error('Registro nativo apenas no Windows'));
        return;
      }

      // Usar regsvr32 silencioso
      const command = `regsvr32 /s "${filePath}"`;
      console.log(`[PluginManager] Executando: ${command}`);
      
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          // Tentar com privilégios elevados via PowerShell
          const elevatedCmd = `powershell -Command "Start-Process regsvr32 -ArgumentList '/s', '${filePath.replace(/'/g, "''")}' -Verb RunAs -Wait"`;
          exec(elevatedCmd, { timeout: 60000 }, (err2, out2, serr2) => {
            if (err2) {
              reject(new Error(`Falha ao registrar: ${err2.message}`));
            } else {
              resolve({ success: true, elevated: true });
            }
          });
        } else {
          resolve({ success: true, elevated: false });
        }
      });
    });
  }

  /**
   * Importa plugin via diálogo de arquivo
   */
  async importPluginDialog(parentWindow) {
    const result = await dialog.showOpenDialog(parentWindow, {
      title: 'Importar Plugin ActiveX',
      filters: [
        { name: 'Plugins ActiveX', extensions: ['exe', 'ocx', 'cab', 'dll', 'msi'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return this.importPlugin(result.filePaths[0]);
  }

  /**
   * Abre diálogo para selecionar pasta e escaneia por plugins
   */
  async scanPluginFolderDialog(parentWindow) {
    const result = await dialog.showOpenDialog(parentWindow, {
      title: 'Selecionar Pasta com Plugins ActiveX',
      properties: ['openDirectory'],
      message: 'Selecione a pasta raiz onde os plugins estão instalados.\nSubpastas serão escaneadas automaticamente.'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return this.scanPluginFolder(result.filePaths[0]);
  }

  /**
   * Escaneia uma pasta recursivamente por plugins ActiveX
   */
  async scanPluginFolder(folderPath, maxDepth = 5) {
    const extensions = ['.dll', '.ocx', '.ax', '.exe', '.cab', '.msi'];
    const results = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
      files: []
    };

    const scanDir = async (dirPath, depth) => {
      if (depth > maxDepth) return;

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Ignorar pastas de sistema conhecidas
            const ignoreFolders = ['Windows', 'Microsoft.NET', 'Reference Assemblies', 
                                    'WindowsApps', '$Recycle.Bin', 'System Volume Information'];
            if (!ignoreFolders.includes(entry.name)) {
              await scanDir(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
              results.files.push(fullPath);
            }
          }
        }
      } catch (e) {
        // Ignorar erros de permissão
        if (e.code !== 'EPERM' && e.code !== 'EACCES') {
          console.warn(`Erro ao escanear ${dirPath}:`, e.message);
        }
      }
    };

    console.log(`[PluginManager] Escaneando pasta: ${folderPath}`);
    await scanDir(folderPath, 0);
    console.log(`[PluginManager] Encontrados ${results.files.length} arquivos`);

    // Importar cada arquivo encontrado
    for (const filePath of results.files) {
      try {
        const importResult = await this.importPlugin(filePath);
        if (importResult.success) {
          results.imported++;
        } else if (importResult.existingPlugin) {
          results.skipped++;
        } else {
          results.errors.push({ file: filePath, error: importResult.error });
        }
      } catch (e) {
        results.errors.push({ file: filePath, error: e.message });
      }
    }

    console.log(`[PluginManager] Importados: ${results.imported}, Ignorados: ${results.skipped}, Erros: ${results.errors.length}`);
    return results;
  }

  /**
   * Lista todos os plugins instalados
   */
  listPlugins() {
    return this.plugins.plugins.map(p => ({
      ...p,
      canRegister: this.canRegisterPlugin(p),
      platformSupport: this.getPlatformSupport(p)
    }));
  }

  /**
   * Verifica se um plugin pode ser registrado
   */
  canRegisterPlugin(plugin) {
    if (this.platform === 'win32') {
      return ['.ocx', '.dll'].includes(plugin.extension);
    } else if (this.hasWine) {
      return ['.ocx', '.dll', '.exe'].includes(plugin.extension);
    }
    return false;
  }

  /**
   * Retorna informações de suporte da plataforma
   */
  getPlatformSupport(plugin) {
    const support = {
      canRun: false,
      canRegister: false,
      method: null,
      notes: []
    };

    if (this.platform === 'win32') {
      support.canRun = true;
      support.method = 'native';
      
      if (['.ocx', '.dll'].includes(plugin.extension)) {
        support.canRegister = true;
        support.notes.push('Pode ser registrado via regsvr32');
      }
      if (plugin.extension === '.exe') {
        support.notes.push('Executável pode ser iniciado');
      }
    } else {
      if (this.hasWine) {
        support.canRun = true;
        support.method = 'wine';
        support.notes.push('Será executado via Wine');
        
        if (['.ocx', '.dll'].includes(plugin.extension)) {
          support.canRegister = true;
          support.notes.push('Pode ser registrado via wine regsvr32');
        }
      } else {
        support.notes.push('Wine não detectado - instale para suporte a plugins Windows');
        support.notes.push('Linux: sudo apt install wine');
        support.notes.push('macOS: brew install wine');
      }
    }

    return support;
  }

  /**
   * Tenta registrar um plugin OCX/DLL
   */
  async registerPlugin(pluginId) {
    const plugin = this.plugins.plugins.find(p => p.id === pluginId);
    if (!plugin) {
      throw new Error('Plugin não encontrado');
    }

    if (!['.ocx', '.dll'].includes(plugin.extension)) {
      throw new Error('Apenas arquivos .ocx e .dll podem ser registrados');
    }

    const logFile = path.join(this.logsDir, `register_${pluginId}_${Date.now()}.log`);

    return new Promise((resolve, reject) => {
      let command;
      
      if (this.platform === 'win32') {
        // Windows nativo
        command = `regsvr32 /s "${plugin.sandboxPath}"`;
      } else if (this.hasWine) {
        // Via Wine
        command = `wine regsvr32 "${plugin.sandboxPath}"`;
      } else {
        reject(new Error('Registro não suportado nesta plataforma sem Wine'));
        return;
      }

      exec(command, (error, stdout, stderr) => {
        const log = `Command: ${command}\nStdout: ${stdout}\nStderr: ${stderr}\nError: ${error || 'none'}`;
        fs.writeFileSync(logFile, log);

        if (error) {
          plugin.registered = false;
          plugin.registrationError = error.message;
          this.saveRegistry();
          reject(new Error(`Falha ao registrar: ${error.message}`));
        } else {
          plugin.registered = true;
          plugin.registrationError = null;
          plugin.registrationDate = new Date().toISOString();
          this.saveRegistry();
          resolve({ success: true, logFile });
        }
      });
    });
  }

  /**
   * Remove registro de um plugin OCX/DLL
   */
  async unregisterPlugin(pluginId) {
    const plugin = this.plugins.plugins.find(p => p.id === pluginId);
    if (!plugin) {
      throw new Error('Plugin não encontrado');
    }

    if (!plugin.registered) {
      return { success: true, message: 'Plugin não estava registrado' };
    }

    return new Promise((resolve, reject) => {
      let command;
      
      if (this.platform === 'win32') {
        command = `regsvr32 /u /s "${plugin.sandboxPath}"`;
      } else if (this.hasWine) {
        command = `wine regsvr32 /u "${plugin.sandboxPath}"`;
      } else {
        plugin.registered = false;
        this.saveRegistry();
        resolve({ success: true });
        return;
      }

      exec(command, (error) => {
        plugin.registered = false;
        this.saveRegistry();
        
        if (error) {
          resolve({ success: true, warning: 'Comando de unregister falhou, mas marcado como não registrado' });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Executa um plugin .exe
   */
  async runPlugin(pluginId) {
    const plugin = this.plugins.plugins.find(p => p.id === pluginId);
    if (!plugin) {
      throw new Error('Plugin não encontrado');
    }

    plugin.lastUsed = new Date().toISOString();
    this.saveRegistry();

    return new Promise((resolve, reject) => {
      let process;

      if (this.platform === 'win32') {
        process = spawn(plugin.sandboxPath, [], {
          detached: true,
          stdio: 'ignore',
          cwd: plugin.sandboxDir
        });
      } else if (this.hasWine) {
        process = spawn('wine', [plugin.sandboxPath], {
          detached: true,
          stdio: 'ignore',
          cwd: plugin.sandboxDir
        });
      } else {
        reject(new Error('Execução não suportada nesta plataforma sem Wine'));
        return;
      }

      process.unref();
      resolve({ success: true, pid: process.pid });
    });
  }

  /**
   * Remove um plugin da sandbox
   */
  async removePlugin(pluginId) {
    const pluginIndex = this.plugins.plugins.findIndex(p => p.id === pluginId);
    if (pluginIndex === -1) {
      throw new Error('Plugin não encontrado');
    }

    const plugin = this.plugins.plugins[pluginIndex];

    // Tentar desregistrar primeiro
    if (plugin.registered) {
      try {
        await this.unregisterPlugin(pluginId);
      } catch (e) {
        console.warn('Aviso ao desregistrar:', e);
      }
    }

    // Remover arquivos
    try {
      if (fs.existsSync(plugin.sandboxDir)) {
        fs.rmSync(plugin.sandboxDir, { recursive: true });
      }
    } catch (e) {
      console.error('Erro ao remover diretório:', e);
    }

    // Remover do registro
    this.plugins.plugins.splice(pluginIndex, 1);
    this.saveRegistry();

    return { success: true };
  }

  /**
   * Atualiza notas de um plugin
   */
  updatePluginNotes(pluginId, notes) {
    const plugin = this.plugins.plugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.notes = notes;
      this.saveRegistry();
      return true;
    }
    return false;
  }

  /**
   * Abre a pasta da sandbox no explorador de arquivos
   */
  openSandboxFolder() {
    shell.openPath(this.sandboxDir);
  }

  /**
   * Abre a pasta de um plugin específico
   */
  openPluginFolder(pluginId) {
    const plugin = this.plugins.plugins.find(p => p.id === pluginId);
    if (plugin) {
      shell.openPath(plugin.sandboxDir);
    }
  }

  /**
   * Exporta lista de plugins para backup
   */
  exportPluginList() {
    return {
      exportDate: new Date().toISOString(),
      platform: this.platform,
      hasWine: this.hasWine,
      sandboxPath: this.sandboxDir,
      plugins: this.plugins.plugins
    };
  }

  /**
   * Retorna estatísticas da sandbox
   */
  getStats() {
    const plugins = this.plugins.plugins;
    let totalSize = 0;
    
    for (const plugin of plugins) {
      totalSize += plugin.size || 0;
    }

    return {
      totalPlugins: plugins.length,
      registeredPlugins: plugins.filter(p => p.registered).length,
      totalSize: totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      sandboxPath: this.sandboxDir,
      winePrefix: this.winePrefix,
      platform: this.platform,
      hasWine: this.hasWine,
      byExtension: {
        exe: plugins.filter(p => p.extension === '.exe').length,
        ocx: plugins.filter(p => p.extension === '.ocx').length,
        dll: plugins.filter(p => p.extension === '.dll').length,
        cab: plugins.filter(p => p.extension === '.cab').length,
        msi: plugins.filter(p => p.extension === '.msi').length
      }
    };
  }

  // ============================================
  // Wine ActiveX Integration
  // ============================================

  /**
   * Escaneia plugins instalados no Wine (Program Files)
   */
  async scanWineInstalledPlugins() {
    if (this.platform === 'win32') {
      // No Windows, usa abordagem nativa
      return this.scanWindowsInstalledPlugins();
    }

    if (!this.hasWine) {
      return { success: false, error: 'Wine não instalado' };
    }

    try {
      const index = await this.activeXScanner.buildPluginIndex();
      this.wineInstalledPlugins = index;
      
      return {
        success: true,
        ...index
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Escaneia plugins no Windows nativo (registro)
   */
  async scanWindowsInstalledPlugins() {
    return new Promise((resolve) => {
      exec('reg query "HKEY_CLASSES_ROOT\\CLSID" /s /f "InprocServer32"', (error, stdout) => {
        if (error) {
          resolve({ success: false, error: error.message });
          return;
        }

        const clsids = {};
        const lines = stdout.split('\n');
        let currentClsid = null;

        for (const line of lines) {
          const clsidMatch = line.match(/CLSID\\{([A-F0-9-]+)}/i);
          if (clsidMatch) {
            currentClsid = clsidMatch[1].toUpperCase();
          }
          
          if (currentClsid && line.includes('REG_SZ')) {
            const dllMatch = line.match(/REG_SZ\s+(.+\.(?:dll|ocx))/i);
            if (dllMatch) {
              clsids[currentClsid] = {
                clsid: currentClsid,
                inprocServer: dllMatch[1].trim()
              };
            }
          }
        }

        resolve({
          success: true,
          registeredClsids: clsids,
          summary: { registeredClsids: Object.keys(clsids).length }
        });
      });
    });
  }

  /**
   * Verifica se um CLSID específico está disponível
   */
  async checkClsidAvailable(clsid) {
    const cleanClsid = clsid.replace(/^CLSID:/i, '').toUpperCase();

    // Primeiro verificar no cache
    if (this.wineInstalledPlugins?.registeredClsids?.[cleanClsid]) {
      return {
        available: true,
        source: 'wine',
        info: this.wineInstalledPlugins.registeredClsids[cleanClsid]
      };
    }

    // Consultar diretamente
    if (this.platform === 'win32') {
      return this.checkClsidWindows(cleanClsid);
    } else if (this.hasWine) {
      const result = await this.activeXScanner.isClsidInstalled(cleanClsid);
      return {
        available: !!result,
        source: 'wine',
        info: result
      };
    }

    return { available: false };
  }

  /**
   * Verifica CLSID no Windows nativo
   */
  async checkClsidWindows(clsid) {
    return new Promise((resolve) => {
      exec(`reg query "HKEY_CLASSES_ROOT\\CLSID\\{${clsid}}" /s`, (error, stdout) => {
        if (error || !stdout) {
          resolve({ available: false });
        } else {
          resolve({
            available: true,
            source: 'native',
            info: { clsid, registered: true }
          });
        }
      });
    });
  }

  /**
   * Retorna lista de plugins detectados no Wine/Windows
   */
  getSystemInstalledPlugins() {
    if (!this.wineInstalledPlugins) {
      return { plugins: [], needsScan: true };
    }

    return {
      plugins: this.activeXScanner.getInstalledPlugins(),
      scanDate: this.wineInstalledPlugins.scanDate,
      summary: this.wineInstalledPlugins.summary,
      needsScan: false
    };
  }

  /**
   * Retorna os caminhos do Program Files no Wine
   */
  getWineProgramFilesPaths() {
    if (this.platform === 'win32') {
      return [
        process.env['ProgramFiles'],
        process.env['ProgramFiles(x86)']
      ].filter(Boolean);
    }

    return this.activeXScanner.getWineProgramFilesPaths();
  }

  /**
   * Abre a pasta Program Files do Wine
   */
  openWineProgramFiles() {
    const paths = this.getWineProgramFilesPaths();
    if (paths.length > 0) {
      shell.openPath(paths[0]);
    }
  }

  /**
   * Executa um instalador e monitora a instalação
   */
  async runInstallerAndMonitor(pluginId) {
    const plugin = this.plugins.plugins.find(p => p.id === pluginId);
    if (!plugin || plugin.extension !== '.exe') {
      throw new Error('Plugin não encontrado ou não é um instalador');
    }

    // Capturar estado antes
    const beforeScan = await this.scanWineInstalledPlugins();
    const beforeClsids = new Set(Object.keys(beforeScan.registeredClsids || {}));

    // Executar instalador
    await this.runPlugin(pluginId);

    // Aguardar um tempo para instalação
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Capturar estado depois
    const afterScan = await this.scanWineInstalledPlugins();
    const afterClsids = new Set(Object.keys(afterScan.registeredClsids || {}));

    // Encontrar novos CLSIDs
    const newClsids = [...afterClsids].filter(c => !beforeClsids.has(c));

    // Atualizar registro do plugin
    if (newClsids.length > 0) {
      plugin.installedClsids = newClsids;
      plugin.installDate = new Date().toISOString();
      plugin.status = 'installed';
      this.saveRegistry();
    }

    return {
      success: true,
      newClsids: newClsids,
      totalNewClsids: newClsids.length
    };
  }

  /**
   * Procura plugins por fabricante conhecido
   */
  findPluginsByVendor(vendorName) {
    return this.activeXScanner.findPluginByVendor(vendorName);
  }

  /**
   * Limpa cache de escaneamento
   */
  clearScanCache() {
    this.wineInstalledPlugins = null;
    this.activeXScanner.clearCache();
  }

  /**
   * Registra automaticamente todos os ActiveX encontrados nos Program Files
   */
  async autoRegisterWinePlugins(onProgress = null) {
    if (this.platform === 'win32') {
      return { success: false, error: 'Registro automático disponível apenas via Wine' };
    }

    if (!this.hasWine) {
      return { success: false, error: 'Wine não instalado' };
    }

    try {
      const results = await this.activeXScanner.autoRegisterAll(onProgress);
      
      // Atualizar cache após registro
      this.wineInstalledPlugins = await this.activeXScanner.buildPluginIndex();
      
      return {
        success: true,
        ...results
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Registra um arquivo específico
   */
  async registerWineFile(filePath) {
    if (!this.hasWine) {
      return { success: false, error: 'Wine não instalado' };
    }

    try {
      await this.activeXScanner.registerOcx(filePath);
      
      // Atualizar cache após registro
      this.wineInstalledPlugins = await this.activeXScanner.buildPluginIndex();
      
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = PluginManager;
