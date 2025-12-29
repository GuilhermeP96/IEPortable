// ============================================
// ActiveX Emulator - Emula controles ActiveX de DVR
// ============================================

class ActiveXEmulator {
  constructor() {
    this.controls = new Map(); // id -> controle emulado
    this.videoPlayers = new Map(); // id -> elemento de vídeo
    
    // CLSIDs conhecidos e seus handlers
    this.knownCLSIDs = {
      // Ipega / Qualvision / Tecvoz
      'B6D5419C-D381-4687-9CFC-A9E2CD7008F5': 'IpegaControl',
      
      // Hikvision
      '6263DEED-F971-4C18-AB42-3ABCDE741A89': 'HikvisionControl',
      '08CF8D24-DA5E-4C0B-B2E3-E72B3C714BAC': 'HikvisionControl',
      'CCAB80D2-5DCF-44FB-9EAE-0F632B758498': 'HikvisionControl',
      
      // Dahua
      '4B3476C6-3A85-4C2C-BD55-BD8F1E028B00': 'DahuaControl',
      '39B06C8F-91A7-4CAC-8B94-C8B8F26B1A8C': 'DahuaControl',
    };
    
    // Configurações padrão
    this.defaultConfig = {
      rtspPort: 554,
      httpPort: 80,
      username: 'admin',
      password: 'admin'
    };
  }

  /**
   * Cria um controle emulado para um elemento <object>
   */
  createControl(element, clsid) {
    const controlType = this.knownCLSIDs[clsid] || 'GenericControl';
    const controlId = element.id || `activex_${Date.now()}`;
    
    console.log(`[ActiveX Emulator] Criando controle ${controlType} para CLSID ${clsid}`);
    
    let control;
    switch (controlType) {
      case 'IpegaControl':
        control = new IpegaActiveXControl(element, clsid, this);
        break;
      case 'HikvisionControl':
        control = new HikvisionActiveXControl(element, clsid, this);
        break;
      case 'DahuaControl':
        control = new DahuaActiveXControl(element, clsid, this);
        break;
      default:
        control = new GenericActiveXControl(element, clsid, this);
    }
    
    this.controls.set(controlId, control);
    return control;
  }

  /**
   * Obtém um controle existente
   */
  getControl(id) {
    return this.controls.get(id);
  }

  /**
   * Cria um player de vídeo substituto
   */
  createVideoPlayer(element, streamUrl) {
    const container = document.createElement('div');
    container.className = 'activex-video-container';
    container.style.cssText = `
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;
    
    // Tentar diferentes métodos de reprodução
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.controls = true;
    video.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
    
    // Para RTSP, usar img com MJPEG como fallback
    const img = document.createElement('img');
    img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; display: none;';
    
    // Mensagem de status
    const status = document.createElement('div');
    status.className = 'activex-video-status';
    status.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
    `;
    status.textContent = 'Conectando...';
    
    container.appendChild(video);
    container.appendChild(img);
    container.appendChild(status);
    
    // Substituir o elemento original
    element.style.display = 'none';
    element.parentNode.insertBefore(container, element.nextSibling);
    
    return { container, video, img, status };
  }
}

// ============================================
// Controle Base
// ============================================

class BaseActiveXControl {
  constructor(element, clsid, emulator) {
    this.element = element;
    this.clsid = clsid;
    this.emulator = emulator;
    this.host = null;
    this.port = 80;
    this.username = 'admin';
    this.password = 'admin';
    this.loggedIn = false;
    this.channels = [];
    this.currentChannel = 0;
    this.videoPlayer = null;
    
    // Estado
    this.readyState = 4;
    this.valid = 1;
    
    // Aplicar métodos ao elemento
    this.applyToElement();
  }

  applyToElement() {
    const self = this;
    const methods = [
      'Login', 'Logout', 'Init', 'Play', 'Stop', 'Pause', 'Resume',
      'StartRealPlay', 'StopRealPlay', 'SetChannel', 'GetChannel',
      'PTZControl', 'PTZControlEx', 'StartRecord', 'StopRecord',
      'Playback', 'DeviceConfig', 'GetConfig', 'SetConfig',
      'GetDeviceInfo', 'CapturePicture', 'SavePicture',
      'QueryRecordFile', 'QueryRecordFileEx', 'ConnectRealPlay',
      'DisconnectRealPlay', 'SetDisplayRegion', 'Refresh'
    ];
    
    methods.forEach(method => {
      if (typeof this[method] === 'function') {
        this.element[method] = this[method].bind(this);
      } else {
        this.element[method] = () => {
          console.log(`[ActiveX] ${method}() chamado (stub)`);
          return 1;
        };
      }
    });
    
    // Propriedades
    Object.defineProperty(this.element, 'readyState', {
      get: () => this.readyState,
      configurable: true
    });
    
    Object.defineProperty(this.element, 'valid', {
      get: () => this.valid,
      configurable: true
    });
    
    Object.defineProperty(this.element, 'object', {
      get: () => this.element,
      configurable: true
    });
  }

  // Métodos base - sobrescrever nas subclasses
  Login(host, port, username, password) {
    console.log(`[ActiveX] Login: ${host}:${port} user=${username}`);
    this.host = host;
    this.port = port || 80;
    this.username = username || 'admin';
    this.password = password || 'admin';
    this.loggedIn = true;
    return 1;
  }

  Logout() {
    console.log('[ActiveX] Logout');
    this.loggedIn = false;
    return 1;
  }

  Init() {
    console.log('[ActiveX] Init');
    return 1;
  }

  Play() {
    console.log('[ActiveX] Play');
    this.startVideoStream();
    return 1;
  }

  Stop() {
    console.log('[ActiveX] Stop');
    this.stopVideoStream();
    return 1;
  }

  StartRealPlay(channel) {
    console.log(`[ActiveX] StartRealPlay: channel=${channel}`);
    this.currentChannel = channel || 0;
    this.startVideoStream();
    return 1;
  }

  StopRealPlay() {
    console.log('[ActiveX] StopRealPlay');
    this.stopVideoStream();
    return 1;
  }

  SetChannel(channel) {
    console.log(`[ActiveX] SetChannel: ${channel}`);
    this.currentChannel = channel;
    return 1;
  }

  GetChannel() {
    return this.currentChannel;
  }

  // Métodos de vídeo
  startVideoStream() {
    if (!this.host) {
      console.warn('[ActiveX] Host não definido');
      return;
    }
    
    const streamUrls = this.getStreamUrls();
    console.log('[ActiveX] URLs de stream:', streamUrls);
    
    if (!this.videoPlayer) {
      this.videoPlayer = this.emulator.createVideoPlayer(this.element, streamUrls[0]);
    }
    
    this.tryStreamUrls(streamUrls);
  }

  stopVideoStream() {
    if (this.videoPlayer) {
      if (this.videoPlayer.video) {
        this.videoPlayer.video.pause();
        this.videoPlayer.video.src = '';
      }
      if (this.videoPlayer.img) {
        this.videoPlayer.img.src = '';
      }
    }
  }

  getStreamUrls() {
    // Sobrescrever nas subclasses
    return [
      `http://${this.host}/cgi-bin/snapshot.cgi`,
      `http://${this.host}/snap.jpg`,
      `http://${this.host}/image.jpg`
    ];
  }

  async tryStreamUrls(urls) {
    if (!this.videoPlayer) return;
    
    const { video, img, status } = this.videoPlayer;
    
    for (const url of urls) {
      status.textContent = `Tentando: ${url}`;
      console.log('[ActiveX] Tentando URL:', url);
      
      try {
        if (url.includes('rtsp://')) {
          // RTSP não funciona diretamente em browsers
          status.textContent = 'RTSP requer player externo';
          continue;
        }
        
        if (url.includes('.mjpg') || url.includes('mjpeg') || url.includes('video.cgi')) {
          // MJPEG stream
          img.style.display = 'block';
          video.style.display = 'none';
          img.src = url;
          
          // Verificar se carregou
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(reject, 5000);
          });
          
          status.textContent = 'Conectado (MJPEG)';
          return;
        }
        
        // Tentar como imagem estática (snapshot)
        const response = await fetch(url, {
          mode: 'no-cors',
          credentials: 'include'
        });
        
        if (response.ok || response.type === 'opaque') {
          img.style.display = 'block';
          video.style.display = 'none';
          img.src = url;
          
          // Auto-refresh para simular vídeo
          this.snapshotInterval = setInterval(() => {
            img.src = url + '?t=' + Date.now();
          }, 1000);
          
          status.textContent = 'Conectado (Snapshot)';
          return;
        }
      } catch (e) {
        console.log('[ActiveX] Falha em:', url, e.message);
      }
    }
    
    status.textContent = 'Não foi possível conectar. Clique para configurar.';
    status.style.cursor = 'pointer';
    status.onclick = () => {
      window.postMessage({ type: 'ACTIVEX_SHOW_PLAYER', clsid: this.clsid }, '*');
    };
  }
}

// ============================================
// Controle Ipega / Qualvision / Tecvoz
// ============================================

class IpegaActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Ipega';
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // Snapshot URLs
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi?channel=${ch}`,
      `http://${auth}${this.host}/snap.jpg?channel=${ch}`,
      `http://${auth}${this.host}/tmpfs/auto.jpg`,
      `http://${auth}${this.host}/image/jpeg.cgi`,
      
      // MJPEG URLs
      `http://${auth}${this.host}/cgi-bin/mjpeg.cgi?channel=${ch}`,
      `http://${auth}${this.host}/video.mjpg`,
      `http://${auth}${this.host}/mjpeg/1`,
      
      // RTSP (precisa de player externo)
      `rtsp://${auth}${this.host}:554/user=admin&password=&channel=${ch}&stream=0.sdp`,
      `rtsp://${auth}${this.host}:554/cam/realmonitor?channel=${ch}&subtype=0`,
    ];
  }

  // Métodos específicos Ipega
  Login(ip, port, user, pass) {
    super.Login(ip, port, user, pass);
    
    // Tentar autenticar via HTTP
    this.authenticate();
    return 1;
  }

  async authenticate() {
    try {
      // Tentar login via HTTP
      const loginUrls = [
        `http://${this.host}/cgi-bin/global.login?userName=${this.username}&password=${this.password}`,
        `http://${this.host}/RPC_Login/${this.username}/${this.password}`,
        `http://${this.host}/ISAPI/Security/sessionLogin`
      ];
      
      for (const url of loginUrls) {
        try {
          const response = await fetch(url, { 
            method: 'GET',
            mode: 'no-cors',
            credentials: 'include'
          });
          console.log('[Ipega] Login tentado:', url);
        } catch (e) {
          // Ignorar erros
        }
      }
    } catch (e) {
      console.warn('[Ipega] Erro na autenticação:', e);
    }
  }
}

// ============================================
// Controle Hikvision
// ============================================

class HikvisionActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Hikvision';
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // ISAPI Snapshot
      `http://${auth}${this.host}/ISAPI/Streaming/channels/${ch}01/picture`,
      `http://${auth}${this.host}/Streaming/channels/${ch}01/picture`,
      
      // Snapshot legado
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi`,
      `http://${auth}${this.host}/snap.jpg`,
      
      // MJPEG
      `http://${auth}${this.host}/ISAPI/Streaming/channels/${ch}01/httpPreview`,
      
      // RTSP
      `rtsp://${auth}${this.host}:554/Streaming/Channels/${ch}01`,
      `rtsp://${auth}${this.host}:554/h264/ch${ch}/main/av_stream`,
    ];
  }
}

// ============================================
// Controle Dahua
// ============================================

class DahuaActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Dahua';
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // Snapshot
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi?channel=${ch}`,
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi`,
      
      // MJPEG
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi?channel=${ch}`,
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi`,
      
      // RTSP
      `rtsp://${auth}${this.host}:554/cam/realmonitor?channel=${ch}&subtype=0`,
      `rtsp://${auth}${this.host}:554/live`,
    ];
  }
}

// ============================================
// Controle Genérico
// ============================================

class GenericActiveXControl extends BaseActiveXControl {
  constructor(element, clsid, emulator) {
    super(element, clsid, emulator);
    this.brand = 'Generic';
  }

  getStreamUrls() {
    const ch = this.currentChannel || 1;
    const auth = this.username && this.password 
      ? `${this.username}:${this.password}@` 
      : '';
    
    return [
      // URLs comuns
      `http://${auth}${this.host}/cgi-bin/snapshot.cgi`,
      `http://${auth}${this.host}/snap.jpg`,
      `http://${auth}${this.host}/image.jpg`,
      `http://${auth}${this.host}/tmpfs/auto.jpg`,
      `http://${auth}${this.host}/cgi-bin/mjpg/video.cgi`,
      `http://${auth}${this.host}/video.mjpg`,
      `http://${auth}${this.host}/mjpeg/1`,
      
      // ONVIF comum
      `http://${auth}${this.host}/onvif-http/snapshot`,
      
      // RTSP genérico
      `rtsp://${auth}${this.host}:554/stream1`,
      `rtsp://${auth}${this.host}:554/ch0`,
      `rtsp://${auth}${this.host}:554/live`,
    ];
  }
}

// Exportar para uso global
window.ActiveXEmulator = ActiveXEmulator;
window.IpegaActiveXControl = IpegaActiveXControl;
window.HikvisionActiveXControl = HikvisionActiveXControl;
window.DahuaActiveXControl = DahuaActiveXControl;
window.GenericActiveXControl = GenericActiveXControl;
