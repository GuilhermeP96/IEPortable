// ============================================
// Detector e Handler de ActiveX/Plugins
// ============================================

class ActiveXHandler {
  constructor() {
    // CLSIDs conhecidos de ActiveX de DVRs
    this.knownCLSIDs = {
      // Qualvision / Tecvoz / DVRs chineses genéricos
      'E0DA039D-992F-4187-A105-C699A71F5F06': { 
        brand: 'Qualvision/Tecvoz', 
        rtspPort: 554, 
        snapshotPath: '/onvif/device_service',
        rtspPaths: ['/live/ch00_0', '/cam/realmonitor?channel=1&subtype=0']
      },

      // ==========================================
      // Hikvision - Todos os CLSIDs conhecidos
      // ==========================================
      '55F88890-DE29-4E36-B13B-E0774CAC9C5A': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/Streaming/Channels/102', '/h264/ch1/main/av_stream', '/h264/ch1/sub/av_stream']
      },
      '08CF8D24-DA5E-4C0B-B2E3-E72B3C714BAC': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/Streaming/Channels/102', '/h264/ch1/main/av_stream']
      },
      'CCAB80D2-5DCF-44FB-9EAE-0F632B758498': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/h264/ch1/main/av_stream']
      },
      '6263DEED-F971-4C18-AB42-3ABCDE741A89': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/Streaming/Channels/102', '/h264/ch1/main/av_stream']
      },
      // Hikvision Web Components (LocalServiceComponents / iVMS-4200 Web)
      'A4452457-8E0E-4F87-829C-5DE9E0DD4D76': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/Streaming/Channels/201', '/h264/ch1/main/av_stream']
      },
      // Hikvision VideoWebPlugin
      '150B57E6-D57E-45D3-A6E8-2A70F874B70C': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/Streaming/Channels/102']
      },
      // Hikvision WebVideoActiveX (web interface moderna)
      'E7EF736D-B4E6-4A5A-BA94-732D71107808': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/Streaming/Channels/102', '/h264/ch1/main/av_stream']
      },
      // Hikvision WebActiveX (modelos antigos)
      'D8F7B6D8-3E5A-4B27-8C83-F91BAB946D2A': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101', '/h264/ch1/main/av_stream']
      },
      // Hikvision HCWebSDKPlugin
      '5E0E2E49-1BAB-4C2A-B4CE-1B4E56AE7B3E': {
        brand: 'Hikvision',
        rtspPort: 554,
        snapshotPath: '/ISAPI/Streaming/channels/101/picture',
        rtspPaths: ['/Streaming/Channels/101']
      },

      // ==========================================
      // Tecvoz - Todos os CLSIDs conhecidos
      // ==========================================
      // Tecvoz THK Series (baseado em Dahua)
      '3BFEDAE3-B170-4C2E-B6AA-E945E3260C70': {
        brand: 'Tecvoz',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi?channel=1',
        rtspPaths: ['/cam/realmonitor?channel=1&subtype=0', '/cam/realmonitor?channel=1&subtype=1', '/live/ch00_0']
      },
      // Tecvoz WebPlugin (genérico chinês)
      'E23B5E25-AA3A-4B2C-8B5A-1A38E93E2C60': {
        brand: 'Tecvoz',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi?channel=1',
        rtspPaths: ['/cam/realmonitor?channel=1&subtype=0', '/live/ch00_0', '/live']
      },
      // Tecvoz TW (chipset XM/XiongMai)
      'C7B43A36-2B41-4B2F-9B10-68A2E3E53D18': {
        brand: 'Tecvoz',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi',
        rtspPaths: ['/user=admin&password=&channel=1&stream=0.sdp', '/cam/realmonitor?channel=1&subtype=0']
      },
      // Tecvoz T1 Series (XiongMai/HiSilicon)
      'A83053A4-6E5A-4F5E-8B3B-8B9F1C50DA32': {
        brand: 'Tecvoz',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi',
        rtspPaths: ['/user=admin&password=&channel=1&stream=0.sdp', '/live/ch00_0', '/onvif1']
      },

      // ==========================================
      // Dahua / Intelbras
      // ==========================================
      '4B3476C6-3A85-4F86-8418-D1130C952B05': {
        brand: 'Dahua',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi?channel=1',
        rtspPaths: ['/cam/realmonitor?channel=1&subtype=0', '/cam/realmonitor?channel=1&subtype=1']
      },
      '39B06C8F-91A7-4CAC-8B94-C8B8F26B1A8C': {
        brand: 'Dahua',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi?channel=1',
        rtspPaths: ['/cam/realmonitor?channel=1&subtype=0']
      },
      // Intelbras (OEM Dahua)
      '99EC681B-C798-4B2A-A57C-98D8E3E96FAA': {
        brand: 'Intelbras',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi?channel=1',
        rtspPaths: ['/cam/realmonitor?channel=1&subtype=0', '/cam/realmonitor?channel=1&subtype=1']
      },

      // ==========================================
      // Ipega
      // ==========================================
      'B6D5419C-4B84-4C47-ACF6-4E5E0C6C1B7D': {
        brand: 'Ipega',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi',
        rtspPaths: ['/profile0', '/profile1', '/11', '/onvif1', '/live/ch00_0']
      },
      'B6D5419C': {
        brand: 'Ipega',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi',
        rtspPaths: ['/profile0', '/profile1', '/11', '/onvif1']
      },
      'B6D5419C-D381-4687-9CFC-A9E2CD7008F5': {
        brand: 'Ipega',
        rtspPort: 554,
        snapshotPath: '/cgi-bin/snapshot.cgi',
        rtspPaths: ['/profile0', '/profile1', '/11', '/onvif1', '/live/ch00_0']
      }
    };

    this.knownPlugins = {
      // ==========================================
      // Hikvision
      // ==========================================
      'webcomponents.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'LocalServiceComponents.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'WebComponents.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'HCWebSDKPlugin.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'VideoWebPlugin.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'webVideoCtrl.cab': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'codebase.cab': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'HikvisionWebPlugin.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'webplugin.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      'WebComponentsV3.exe': { brand: 'Hikvision', rtspPort: 554, rtspPath: '/Streaming/Channels/101' },
      
      // ==========================================
      // Tecvoz
      // ==========================================
      'tecvoz.ocx': { brand: 'Tecvoz', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'tecvoz.exe': { brand: 'Tecvoz', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'tecvoz.cab': { brand: 'Tecvoz', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'TecVozWebPlugin.exe': { brand: 'Tecvoz', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'TecvozPlugin.ocx': { brand: 'Tecvoz', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'TVActivex.ocx': { brand: 'Tecvoz', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'TVWebPlugin.exe': { brand: 'Tecvoz', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      
      // ==========================================
      // Dahua / Intelbras
      // ==========================================
      'DahuaWeb.exe': { brand: 'Dahua', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'DahuaPlugin.exe': { brand: 'Dahua', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'DHWebPlugin.exe': { brand: 'Dahua', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'intelbras.exe': { brand: 'Intelbras', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      'IntelbrasPlugin.exe': { brand: 'Intelbras', rtspPort: 554, rtspPath: '/cam/realmonitor?channel=1&subtype=0' },
      
      // ==========================================
      // Qualvision
      // ==========================================
      'qualvision.ocx': { brand: 'Qualvision', rtspPort: 554, rtspPath: '/live/ch00_0' },
      
      // ==========================================
      // DVRs genéricos / XiongMai / HiSilicon
      // ==========================================
      'npplugin.exe': { brand: 'Genérico', rtspPort: 554, rtspPath: '/live/ch00_0' },
      'WebPlugin.exe': { brand: 'Genérico', rtspPort: 554, rtspPath: '/live/ch00_0' },
      'ocx.cab': { brand: 'ActiveX OCX', rtspPort: 554, rtspPath: '/stream1' },
      'activex.cab': { brand: 'ActiveX', rtspPort: 554, rtspPath: '/stream1' },
      'vlcplugin.exe': { brand: 'VLC Plugin', rtspPort: 554, rtspPath: '/stream' },
      'XMPlugin.exe': { brand: 'XiongMai', rtspPort: 554, rtspPath: '/user=admin&password=&channel=1&stream=0.sdp' },
      'XMeye.exe': { brand: 'XiongMai/XMEye', rtspPort: 554, rtspPath: '/user=admin&password=&channel=1&stream=0.sdp' },
      
      // ==========================================
      // Ipega
      // ==========================================
      'ipega.ocx': { brand: 'Ipega', rtspPort: 554, rtspPath: '/profile0' },
      'ipega.exe': { brand: 'Ipega', rtspPort: 554, rtspPath: '/profile0' },
      'ipega.cab': { brand: 'Ipega', rtspPort: 554, rtspPath: '/profile0' },
      'HWDVRPlugin.ocx': { brand: 'Ipega', rtspPort: 554, rtspPath: '/profile0' },
      'HWDVRPlugin.exe': { brand: 'Ipega', rtspPort: 554, rtspPath: '/profile0' },
    };

    // Extensões que indicam plugins
    this.pluginExtensions = ['.exe', '.cab', '.ocx', '.dll', '.msi'];
    
    // Palavras-chave em URLs que indicam plugins
    this.pluginKeywords = ['plugin', 'activex', 'webcomponent', 'ocx', 'install', 'download'];
  }

  /**
   * Identifica o DVR pelo CLSID do ActiveX
   */
  identifyByCLSID(clsid) {
    const cleanClsid = clsid.replace(/^CLSID:/i, '').toUpperCase();
    return this.knownCLSIDs[cleanClsid] || null;
  }

  /**
   * Verifica se uma URL é de download de plugin
   */
  isPluginDownload(url) {
    const lowerUrl = url.toLowerCase();
    
    // Verifica extensão
    for (const ext of this.pluginExtensions) {
      if (lowerUrl.endsWith(ext)) {
        return true;
      }
    }
    
    // Verifica palavras-chave
    for (const keyword of this.pluginKeywords) {
      if (lowerUrl.includes(keyword)) {
        // Mas ignora se for uma página HTML normal
        if (!lowerUrl.endsWith('.html') && !lowerUrl.endsWith('.htm')) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Identifica o tipo de plugin pelo nome do arquivo
   */
  identifyPlugin(url) {
    const filename = url.split('/').pop().split('?')[0].toLowerCase();
    
    for (const [pluginFile, info] of Object.entries(this.knownPlugins)) {
      if (filename.includes(pluginFile.toLowerCase())) {
        return info;
      }
    }
    
    // Tenta identificar pela URL
    if (url.includes('hikvision') || url.includes('hik') || url.includes('webcomponents') || url.includes('VideoWebPlugin') || url.includes('HCWebSDK') || url.includes('LocalServiceComponents')) {
      return this.knownPlugins['webcomponents.exe'];
    }
    if (url.includes('tecvoz') || url.includes('tvweb') || url.includes('TVActivex')) {
      return this.knownPlugins['tecvoz.ocx'];
    }
    if (url.includes('dahua') || url.includes('dhweb')) {
      return this.knownPlugins['DahuaWeb.exe'];
    }
    if (url.includes('intelbras')) {
      return this.knownPlugins['intelbras.exe'];
    }
    if (url.includes('ipega') || url.includes('kp-ca')) {
      return this.knownPlugins['ipega.ocx'];
    }
    if (url.includes('xiongmai') || url.includes('xmeye') || url.includes('netsurveillance')) {
      return this.knownPlugins['XMPlugin.exe'];
    }
    
    return { brand: 'Desconhecido', rtspPort: 554, rtspPath: '/stream1' };
  }

  /**
   * Gera URLs RTSP possíveis para um host
   */
  generateRtspUrls(host, username = 'admin', password = 'admin') {
    const commonPaths = [
      // Hikvision
      '/Streaming/Channels/101',
      '/Streaming/Channels/102',
      '/Streaming/Channels/201',
      '/h264/ch1/main/av_stream',
      '/h264/ch1/sub/av_stream',
      
      // Dahua / Intelbras
      '/cam/realmonitor?channel=1&subtype=0',
      '/cam/realmonitor?channel=1&subtype=1',
      
      // Ipega / KP-CA Series
      '/profile0',
      '/profile1',
      '/11',
      '/onvif1',
      
      // ONVIF
      '/onvif/profile1/media.svc/streaming',
      '/MediaInput/h264/stream_1',
      
      // Genéricos
      '/live/ch00_0',
      '/live/ch00_1',
      '/stream1',
      '/stream2',
      '/video1',
      '/video.mjpg',
      '/mjpg/video.mjpg',
      '/cgi-bin/mjpg/video.cgi',
      
      // Axis
      '/axis-cgi/mjpg/video.cgi',
      
      // Foscam
      '/videoMain',
      '/videostream.cgi',
    ];

    const urls = [];
    const baseHost = host.replace(/^https?:\/\//, '').split(':')[0];
    
    for (const path of commonPaths) {
      // RTSP com autenticação
      urls.push(`rtsp://${username}:${password}@${baseHost}:554${path}`);
      // RTSP sem autenticação
      urls.push(`rtsp://${baseHost}:554${path}`);
    }
    
    // MJPEG sobre HTTP
    const mjpegPaths = [
      '/video.mjpg',
      '/mjpg/video.mjpg',
      '/cgi-bin/mjpg/video.cgi',
      '/axis-cgi/mjpg/video.cgi',
      '/videostream.cgi',
    ];
    
    for (const path of mjpegPaths) {
      urls.push(`http://${username}:${password}@${baseHost}${path}`);
      urls.push(`http://${baseHost}${path}`);
    }
    
    return urls;
  }

  /**
   * Gera URLs de snapshot
   */
  generateSnapshotUrls(host, username = 'admin', password = 'admin', detectedClsid = null) {
    const urlObj = this.parseHostUrl(host);
    const baseHost = urlObj.hostname;
    const port = urlObj.port || '80';
    const protocol = urlObj.protocol || 'http:';
    
    const urls = [];
    
    // Se temos um CLSID identificado, priorizar os paths específicos
    if (detectedClsid) {
      const info = this.identifyByCLSID(detectedClsid);
      if (info && info.snapshotPath) {
        urls.push({
          url: `${protocol}//${username}:${password}@${baseHost}:${port}${info.snapshotPath}`,
          brand: info.brand,
          priority: 'high'
        });
        urls.push({
          url: `${protocol}//${baseHost}:${port}${info.snapshotPath}`,
          brand: info.brand,
          priority: 'high'
        });
      }
    }
    
    // Qualvision/Tecvoz (ONVIF)
    urls.push({
      url: `${protocol}//${username}:${password}@${baseHost}:${port}/onvif/device_service`,
      brand: 'Qualvision/Tecvoz',
      priority: 'high'
    });
    urls.push({
      url: `${protocol}//${baseHost}:${port}/onvif/device_service`,
      brand: 'Qualvision/Tecvoz',
      priority: 'high'
    });
    
    // Hikvision
    urls.push({
      url: `${protocol}//${username}:${password}@${baseHost}/ISAPI/Streaming/channels/101/picture`,
      brand: 'Hikvision',
      priority: 'medium'
    });
    
    // Dahua
    urls.push({
      url: `${protocol}//${username}:${password}@${baseHost}/cgi-bin/snapshot.cgi?channel=1`,
      brand: 'Dahua',
      priority: 'medium'
    });
    
    // Genéricos
    const genericPaths = [
      '/snapshot.jpg',
      '/cgi-bin/snapshot.cgi',
      '/image.jpg',
      '/jpg/image.jpg',
      '/capture/image.jpg',
      '/snap.jpg'
    ];
    
    for (const path of genericPaths) {
      urls.push({
        url: `${protocol}//${username}:${password}@${baseHost}:${port}${path}`,
        brand: 'Genérico',
        priority: 'low'
      });
    }
    
    return urls;
  }

  /**
   * Gera URLs RTSP baseadas no CLSID detectado
   */
  generateRtspUrlsByCLSID(host, clsid, username = 'admin', password = 'admin') {
    const urlObj = this.parseHostUrl(host);
    const baseHost = urlObj.hostname;
    const info = this.identifyByCLSID(clsid);
    
    const urls = [];
    
    if (info && info.rtspPaths) {
      const rtspPort = info.rtspPort || 554;
      for (const path of info.rtspPaths) {
        urls.push({
          url: `rtsp://${username}:${password}@${baseHost}:${rtspPort}${path}`,
          brand: info.brand,
          authenticated: true
        });
        urls.push({
          url: `rtsp://${baseHost}:${rtspPort}${path}`,
          brand: info.brand,
          authenticated: false
        });
      }
    }
    
    return urls;
  }

  /**
   * Extrai hostname, porta e protocolo de uma URL
   */
  parseHostUrl(host) {
    try {
      // Se já é uma URL completa
      if (host.includes('://')) {
        const url = new URL(host);
        return {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? '443' : '80')
        };
      }
      // Se é só hostname:port
      const parts = host.split(':');
      return {
        protocol: 'http:',
        hostname: parts[0],
        port: parts[1] || '80'
      };
    } catch (e) {
      return {
        protocol: 'http:',
        hostname: host,
        port: '80'
      };
    }
  }

  /**
   * Detecta CLSID em conteúdo HTML
   */
  detectCLSIDInHtml(html) {
    // Procura por CLSIDs no formato CLSID:XXXX ou classid="clsid:XXXX"
    const patterns = [
      /CLSID[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})/gi,
      /classid\s*=\s*["']?clsid[:\s]*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})["']?/gi
    ];
    
    const found = new Set();
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        found.add(match[1].toUpperCase());
      }
    }
    
    return Array.from(found);
  }

  /**
   * Obtém informações completas para um DVR baseado no CLSID
   */
  getDvrInfo(host, clsid, username = 'admin', password = 'admin') {
    const info = this.identifyByCLSID(clsid);
    
    if (!info) {
      return {
        brand: 'Desconhecido',
        clsid: clsid,
        snapshotUrls: this.generateSnapshotUrls(host, username, password),
        rtspUrls: this.generateRtspUrls(host, username, password),
        detected: false
      };
    }
    
    return {
      brand: info.brand,
      clsid: clsid,
      snapshotUrls: this.generateSnapshotUrls(host, username, password, clsid),
      rtspUrls: this.generateRtspUrlsByCLSID(host, clsid, username, password),
      detected: true
    };
  }

  // ============================================
  // Integração com Wine - Plugins Instalados
  // ============================================

  /**
   * Verifica se um CLSID está instalado no sistema (Wine ou Windows)
   */
  async checkClsidInstalled(clsid) {
    try {
      // Usar IPC para verificar no main process
      if (window.electronAPI && window.electronAPI.checkClsidAvailable) {
        return await window.electronAPI.checkClsidAvailable(clsid);
      }
      return { available: false, error: 'API não disponível' };
    } catch (e) {
      return { available: false, error: e.message };
    }
  }

  /**
   * Obtém lista de plugins instalados no sistema
   */
  async getInstalledPlugins() {
    try {
      if (window.electronAPI && window.electronAPI.getSystemInstalledPlugins) {
        return await window.electronAPI.getSystemInstalledPlugins();
      }
      return { plugins: [], error: 'API não disponível' };
    } catch (e) {
      return { plugins: [], error: e.message };
    }
  }

  /**
   * Escaneia plugins no Wine/Windows
   */
  async scanSystemPlugins() {
    try {
      if (window.electronAPI && window.electronAPI.scanWinePlugins) {
        return await window.electronAPI.scanWinePlugins();
      }
      return { success: false, error: 'API não disponível' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Procura e identifica ActiveX quando uma página solicita
   * Retorna informações sobre como lidar com o ActiveX
   */
  async handleActiveXRequest(clsid, host) {
    const cleanClsid = clsid.replace(/^CLSID:/i, '').toUpperCase();
    
    // 1. Verificar se temos informações locais sobre este CLSID
    const localInfo = this.identifyByCLSID(cleanClsid);
    
    // 2. Verificar se está instalado no Wine/Windows
    const installStatus = await this.checkClsidInstalled(cleanClsid);
    
    // 3. Determinar ação
    const result = {
      clsid: cleanClsid,
      known: !!localInfo,
      installed: installStatus.available,
      source: installStatus.source || null,
      brand: localInfo?.brand || null,
      action: 'unknown'
    };

    if (installStatus.available) {
      // Plugin está instalado - podemos tentar usar
      result.action = 'available';
      result.message = `Plugin ${localInfo?.brand || 'ActiveX'} disponível`;
      result.canUse = true;
      result.info = installStatus.info;
    } else if (localInfo) {
      // Conhecemos o plugin mas não está instalado
      result.action = 'known_not_installed';
      result.message = `Plugin ${localInfo.brand} necessário. Não instalado.`;
      result.canUse = false;
      result.suggestion = 'download';
      
      // Oferecer alternativas
      result.alternatives = {
        snapshotUrls: this.generateSnapshotUrls(host, 'admin', 'admin', cleanClsid),
        rtspUrls: this.generateRtspUrlsByCLSID(host, cleanClsid)
      };
    } else {
      // CLSID desconhecido
      result.action = 'unknown_clsid';
      result.message = `ActiveX desconhecido: ${cleanClsid}`;
      result.canUse = false;
    }

    return result;
  }

  /**
   * Monitora elementos OBJECT/EMBED na página e intercepta ActiveX
   */
  setupPageMonitor() {
    // Observer para detectar novos elementos OBJECT/EMBED
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element
            this.checkElementForActiveX(node);
          }
        }
      }
    });

    // Iniciar observação quando DOM estiver pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
        this.scanExistingElements();
      });
    } else {
      observer.observe(document.body, { childList: true, subtree: true });
      this.scanExistingElements();
    }
  }

  /**
   * Escaneia elementos OBJECT/EMBED existentes
   */
  scanExistingElements() {
    const objects = document.querySelectorAll('object, embed, applet');
    for (const obj of objects) {
      this.checkElementForActiveX(obj);
    }
  }

  /**
   * Verifica um elemento para ActiveX
   */
  async checkElementForActiveX(element) {
    if (!element || !element.tagName) return;
    
    const tag = element.tagName.toLowerCase();
    
    if (tag === 'object') {
      const classid = element.getAttribute('classid') || element.getAttribute('CLASSID');
      if (classid) {
        const clsid = classid.replace(/^clsid:/i, '');
        const result = await this.handleActiveXRequest(clsid, window.location.href);
        
        // Emitir evento para o navegador
        this.emitActiveXEvent('activex-detected', {
          element: element,
          result: result
        });
      }
    }
    
    // Também verificar elementos filhos
    const childObjects = element.querySelectorAll?.('object, embed');
    if (childObjects) {
      for (const child of childObjects) {
        await this.checkElementForActiveX(child);
      }
    }
  }

  /**
   * Emite evento para comunicação com o navegador
   */
  emitActiveXEvent(eventName, data) {
    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
    
    // Também notificar via IPC se disponível
    if (window.electronAPI && window.electronAPI.notifyActiveX) {
      window.electronAPI.notifyActiveX(eventName, data.result);
    }
  }

  /**
   * Adiciona um novo CLSID ao banco de dados (aprendizado)
   */
  learnNewClsid(clsid, brand, config = {}) {
    const cleanClsid = clsid.replace(/^CLSID:/i, '').toUpperCase();
    
    if (!this.knownCLSIDs[cleanClsid]) {
      this.knownCLSIDs[cleanClsid] = {
        brand: brand,
        rtspPort: config.rtspPort || 554,
        snapshotPath: config.snapshotPath || null,
        rtspPaths: config.rtspPaths || [],
        learned: true,
        learnDate: new Date().toISOString()
      };
      
      // Persistir se possível
      if (window.electronAPI && window.electronAPI.saveLearnedClsid) {
        window.electronAPI.saveLearnedClsid(cleanClsid, this.knownCLSIDs[cleanClsid]);
      }
      
      return true;
    }
    
    return false;
  }
}

// Exportar para uso no renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActiveXHandler;
}
