// ============================================
// Wine ActiveX Scanner - Detecta plugins instalados no Wine
// ============================================

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class WineActiveXScanner {
  constructor() {
    this.platform = os.platform();
    this.winePrefix = process.env.WINEPREFIX || path.join(os.homedir(), '.wine');
    this.installedPlugins = new Map(); // CLSID -> Plugin Info
    this.scannedPaths = [];
    this.lastScan = null;
  }

  /**
   * Retorna os caminhos do Program Files no Wine
   */
  getWineProgramFilesPaths() {
    const driveC = path.join(this.winePrefix, 'drive_c');
    
    return [
      path.join(driveC, 'Program Files'),
      path.join(driveC, 'Program Files (x86)'),
      path.join(driveC, 'windows', 'system32'),
      path.join(driveC, 'windows', 'syswow64'),
    ].filter(p => fs.existsSync(p));
  }

  /**
   * Escaneia diretórios em busca de arquivos ActiveX
   */
  async scanForActiveXFiles() {
    if (this.platform === 'win32') {
      return this.scanWindowsRegistry();
    }

    const paths = this.getWineProgramFilesPaths();
    const results = [];

    for (const basePath of paths) {
      try {
        const files = await this.findActiveXFiles(basePath);
        results.push(...files);
      } catch (e) {
        console.warn(`Erro ao escanear ${basePath}:`, e.message);
      }
    }

    this.scannedPaths = paths;
    this.lastScan = new Date().toISOString();

    return results;
  }

  /**
   * Encontra arquivos .ocx, .dll, .ax em um diretório recursivamente
   */
  async findActiveXFiles(dirPath, maxDepth = 6) {
    const results = [];
    const extensions = ['.ocx', '.dll', '.ax'];
    
    // Pastas a ignorar para performance (mas não em níveis rasos)
    const ignoreFolders = ['Windows Defender', 'Windows NT', 'Windows Photo Viewer', 
                          'Windows Mail', 'Windows Media Player', 'Windows Sidebar',
                          'Reference Assemblies', 'MSBuild', 'dotnet'];

    const scan = async (currentPath, depth) => {
      if (depth > maxDepth) return;

      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            // Apenas ignorar pastas específicas do Windows que não contêm ActiveX
            const shouldIgnore = ignoreFolders.some(f => entry.name.includes(f));
            if (!shouldIgnore) {
              await scan(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
              results.push({
                name: entry.name,
                path: fullPath,
                extension: ext,
                relativePath: fullPath.replace(this.winePrefix, ''),
                size: fs.statSync(fullPath).size
              });
            }
          }
        }
      } catch (e) {
        // Ignorar erros de permissão
      }
    };

    await scan(dirPath, 0);
    return results;
  }

  /**
   * Lê o registro do Wine para encontrar CLSIDs registrados
   */
  async readWineRegistry() {
    return new Promise((resolve) => {
      const registryPath = path.join(this.winePrefix, 'system.reg');
      
      if (!fs.existsSync(registryPath)) {
        resolve({ clsids: {}, typelibs: {} });
        return;
      }

      try {
        // Wine registry é geralmente texto simples (não UTF-16)
        const content = fs.readFileSync(registryPath, 'utf-8');
        
        // Verificar se é realmente um arquivo de registro Wine
        if (content.startsWith('WINE REGISTRY')) {
          const clsids = this.parseRegistryForCLSIDs(content);
          resolve({ clsids });
        } else {
          // Pode ser Windows registry em UTF-16LE
          const content16 = fs.readFileSync(registryPath, 'utf-16le');
          const clsids = this.parseRegistryForCLSIDs(content16);
          resolve({ clsids });
        }
      } catch (e) {
        console.warn('Erro ao ler registro do Wine:', e.message);
        resolve({ clsids: {} });
      }
    });
  }

  /**
   * Parse do registro para extrair CLSIDs
   * O formato do Wine tem line wrapping (linhas quebradas no meio de seções)
   */
  parseRegistryForCLSIDs(content) {
    const clsids = {};
    
    // Primeiro, juntar linhas que foram quebradas (linha que não começa com [ ou @ ou " ou # é continuação)
    const lines = content.split(/\r?\n/);
    const joinedLines = [];
    let currentLine = '';
    
    for (const line of lines) {
      if (line.startsWith('[') || line.startsWith('@') || line.startsWith('"') || line.startsWith('#') || line.trim() === '') {
        if (currentLine) {
          joinedLines.push(currentLine);
        }
        currentLine = line;
      } else {
        // Continuação da linha anterior
        currentLine += line;
      }
    }
    if (currentLine) {
      joinedLines.push(currentLine);
    }
    
    // Agora processar as linhas
    let currentSection = '';
    let currentClsid = null;
    
    for (const line of joinedLines) {
      // Detectar início de seção [...]
      if (line.startsWith('[')) {
        currentSection = line;
        
        // Verificar se é uma seção InprocServer32
        // Padrões: CLSID\{...}\InprocServer32 ou Wow6432Node\CLSID\{...}\InprocServer32
        const clsidMatch = line.match(/\\\\CLSID\\\\{([A-F0-9-]+)}\\\\InprocServer32\]/i);
        if (clsidMatch) {
          currentClsid = clsidMatch[1].toUpperCase();
        } else {
          currentClsid = null;
        }
      }
      // Detectar valor default @="..."
      else if (currentClsid && line.startsWith('@=')) {
        const valueMatch = line.match(/@="([^"]+)"/);
        if (valueMatch) {
          const dllPath = valueMatch[1].replace(/\\\\/g, '\\');
          
          if (!clsids[currentClsid]) {
            clsids[currentClsid] = {
              clsid: currentClsid,
              inprocServer: dllPath,
              type: 'InprocServer32'
            };
          }
        }
      }
    }

    return clsids;
  }

  /**
   * Usa o regedit do Wine para consultar CLSIDs específicos
   */
  async queryWineRegistry(clsid) {
    return new Promise((resolve) => {
      const cleanClsid = clsid.replace(/^CLSID:/i, '').toUpperCase();
      const regPath = `HKEY_CLASSES_ROOT\\CLSID\\{${cleanClsid}}`;

      exec(`wine reg query "${regPath}" /s 2>/dev/null`, (error, stdout) => {
        if (error || !stdout) {
          resolve(null);
          return;
        }

        const result = {
          clsid: cleanClsid,
          registered: true,
          details: {}
        };

        // Parse output
        const lines = stdout.split('\n');
        let currentKey = '';

        for (const line of lines) {
          if (line.startsWith('HKEY_')) {
            currentKey = line.trim();
          } else if (line.includes('REG_SZ') || line.includes('REG_EXPAND_SZ')) {
            const parts = line.trim().split(/\s{2,}/);
            if (parts.length >= 3) {
              const valueName = parts[0] || '(Default)';
              const valueData = parts[2];
              
              if (currentKey.includes('InprocServer32')) {
                result.details.inprocServer = valueData;
              } else if (currentKey.includes('ProgID')) {
                result.details.progId = valueData;
              } else if (valueName === '(Default)' && !result.details.name) {
                result.details.name = valueData;
              }
            }
          }
        }

        resolve(result);
      });
    });
  }

  /**
   * Verifica se um CLSID específico está instalado
   */
  async isClsidInstalled(clsid) {
    const cleanClsid = clsid.replace(/^CLSID:/i, '').toUpperCase();

    // Primeiro verificar cache
    if (this.installedPlugins.has(cleanClsid)) {
      return this.installedPlugins.get(cleanClsid);
    }

    // Consultar registro do Wine
    const regResult = await this.queryWineRegistry(cleanClsid);
    
    if (regResult && regResult.registered) {
      this.installedPlugins.set(cleanClsid, regResult);
      return regResult;
    }

    return null;
  }

  /**
   * Registra um OCX/DLL no Wine
   */
  async registerOcx(ocxPath) {
    return new Promise((resolve, reject) => {
      // Converter path para formato Windows
      let winPath = ocxPath;
      
      if (ocxPath.startsWith('/')) {
        // Converter path Unix para Wine
        winPath = ocxPath.replace(this.winePrefix + '/drive_c', 'C:').replace(/\//g, '\\');
      }

      exec(`wine regsvr32 "${winPath}"`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Falha ao registrar: ${stderr || error.message}`));
        } else {
          resolve({ success: true, path: winPath });
        }
      });
    });
  }

  /**
   * Desregistra um OCX/DLL do Wine
   */
  async unregisterOcx(ocxPath) {
    return new Promise((resolve, reject) => {
      let winPath = ocxPath;
      
      if (ocxPath.startsWith('/')) {
        winPath = ocxPath.replace(this.winePrefix + '/drive_c', 'C:').replace(/\//g, '\\');
      }

      exec(`wine regsvr32 /u "${winPath}"`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Falha ao desregistrar: ${stderr || error.message}`));
        } else {
          resolve({ success: true, path: winPath });
        }
      });
    });
  }

  /**
   * Registra automaticamente todos os arquivos OCX/DLL encontrados nos Program Files
   * que ainda não estão registrados
   */
  async autoRegisterAll(onProgress = null) {
    const results = {
      total: 0,
      registered: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    // Pegar apenas arquivos dos Program Files (não system32/syswow64)
    const files = await this.scanForActiveXFiles();
    const programFilesFiles = files.filter(f => 
      (f.path.includes('Program Files') || f.path.includes('Program Files (x86)')) &&
      !f.path.includes('windows/system') &&
      (f.extension === '.ocx' || f.extension === '.dll')
    );

    results.total = programFilesFiles.length;

    for (let i = 0; i < programFilesFiles.length; i++) {
      const file = programFilesFiles[i];
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: results.total,
          file: file.name,
          status: 'registering'
        });
      }

      try {
        await this.registerOcx(file.path);
        results.registered++;
        results.details.push({
          file: file.name,
          path: file.path,
          status: 'success'
        });
      } catch (e) {
        // Alguns DLLs não são ActiveX e vão falhar - isso é normal
        if (e.message.includes('não é um módulo executável') || 
            e.message.includes('not a valid Win32') ||
            e.message.includes('DllRegisterServer')) {
          results.skipped++;
          results.details.push({
            file: file.name,
            path: file.path,
            status: 'skipped',
            reason: 'Não é um ActiveX registrável'
          });
        } else {
          results.failed++;
          results.details.push({
            file: file.name,
            path: file.path,
            status: 'failed',
            error: e.message
          });
        }
      }
    }

    // Recarregar registro após registrar
    await this.readWineRegistry();

    return results;
  }

  /**
   * Registra um arquivo específico pelo nome
   */
  async registerFile(fileName) {
    const files = await this.scanForActiveXFiles();
    const file = files.find(f => f.name.toLowerCase() === fileName.toLowerCase());
    
    if (!file) {
      throw new Error(`Arquivo não encontrado: ${fileName}`);
    }

    return this.registerOcx(file.path);
  }

  /**
   * Escaneia e constrói índice completo de plugins instalados
   */
  async buildPluginIndex() {
    const files = await this.scanForActiveXFiles();
    const registry = await this.readWineRegistry();

    const index = {
      scanDate: new Date().toISOString(),
      winePrefix: this.winePrefix,
      scannedPaths: this.scannedPaths,
      files: files,
      registeredClsids: registry.clsids,
      summary: {
        totalFiles: files.length,
        ocxFiles: files.filter(f => f.extension === '.ocx').length,
        dllFiles: files.filter(f => f.extension === '.dll').length,
        registeredClsids: Object.keys(registry.clsids).length
      }
    };

    // Mapear CLSIDs para arquivos quando possível
    for (const [clsid, info] of Object.entries(registry.clsids)) {
      if (info.inprocServer) {
        // Tentar encontrar o arquivo correspondente
        const serverName = path.basename(info.inprocServer).toLowerCase();
        const matchingFile = files.find(f => f.name.toLowerCase() === serverName);
        
        if (matchingFile) {
          this.installedPlugins.set(clsid, {
            ...info,
            file: matchingFile
          });
        }
      }
    }

    return index;
  }

  /**
   * Procura por um plugin específico pelo nome do fabricante
   */
  findPluginByVendor(vendorName) {
    const vendors = {
      'hikvision': ['webcomponents', 'hikactivex', 'hikvision'],
      'dahua': ['dhactivex', 'dahuaactivex', 'webplugin'],
      'intelbras': ['intelbras', 'mhdx'],
      'qualvision': ['qualvision', 'qvactivex'],
      'tecvoz': ['tecvoz', 'tvzactivex'],
      'axis': ['axisactivex', 'axis'],
      'vivotek': ['vivotek', 'vivotekactivex']
    };

    const keywords = vendors[vendorName.toLowerCase()] || [vendorName.toLowerCase()];
    const results = [];

    for (const [clsid, info] of this.installedPlugins) {
      const inprocLower = (info.inprocServer || '').toLowerCase();
      const nameLower = (info.details?.name || '').toLowerCase();

      for (const keyword of keywords) {
        if (inprocLower.includes(keyword) || nameLower.includes(keyword)) {
          results.push({ clsid, ...info });
          break;
        }
      }
    }

    return results;
  }

  /**
   * Retorna lista de todos os plugins detectados
   */
  getInstalledPlugins() {
    return Array.from(this.installedPlugins.entries()).map(([clsid, info]) => ({
      clsid,
      ...info
    }));
  }

  /**
   * Limpa o cache de plugins
   */
  clearCache() {
    this.installedPlugins.clear();
    this.lastScan = null;
  }
}

module.exports = WineActiveXScanner;
