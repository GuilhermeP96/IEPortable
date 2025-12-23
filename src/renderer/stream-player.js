// ============================================
// Player de Stream Integrado (RTSP/MJPEG/HLS)
// ============================================

class StreamPlayer {
  constructor(container) {
    this.container = container;
    this.currentStream = null;
    this.ffmpegProcess = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="stream-player">
        <div class="stream-toolbar">
          <span class="stream-title">Player de Stream</span>
          <div class="stream-controls">
            <button class="stream-btn" id="stream-snapshot" title="Capturar imagem">📷</button>
            <button class="stream-btn" id="stream-fullscreen" title="Tela cheia">⛶</button>
            <button class="stream-btn" id="stream-close" title="Fechar">✕</button>
          </div>
        </div>
        
        <div class="stream-content">
          <video id="stream-video" autoplay muted playsinline></video>
          <img id="stream-image" style="display: none;" />
          <canvas id="stream-canvas" style="display: none;"></canvas>
          
          <div class="stream-overlay" id="stream-overlay">
            <div class="stream-message">
              <div class="stream-icon">📹</div>
              <div class="stream-text">Conectando ao stream...</div>
              <div class="stream-spinner"></div>
            </div>
          </div>
          
          <div class="stream-error" id="stream-error" style="display: none;">
            <div class="error-icon">⚠️</div>
            <div class="error-text"></div>
            <button class="retry-btn">Tentar novamente</button>
          </div>
        </div>
        
        <div class="stream-info">
          <span id="stream-status">Desconectado</span>
          <span id="stream-url"></span>
        </div>
      </div>
    `;
    
    this.setupElements();
    this.setupEvents();
  }

  setupElements() {
    this.video = this.container.querySelector('#stream-video');
    this.image = this.container.querySelector('#stream-image');
    this.canvas = this.container.querySelector('#stream-canvas');
    this.overlay = this.container.querySelector('#stream-overlay');
    this.errorDiv = this.container.querySelector('#stream-error');
    this.statusSpan = this.container.querySelector('#stream-status');
    this.urlSpan = this.container.querySelector('#stream-url');
  }

  setupEvents() {
    // Botão fechar
    this.container.querySelector('#stream-close').addEventListener('click', () => {
      this.stop();
      this.container.style.display = 'none';
    });
    
    // Botão tela cheia
    this.container.querySelector('#stream-fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });
    
    // Botão snapshot
    this.container.querySelector('#stream-snapshot').addEventListener('click', () => {
      this.takeSnapshot();
    });
    
    // Retry
    this.container.querySelector('.retry-btn').addEventListener('click', () => {
      if (this.currentStream) {
        this.play(this.currentStream);
      }
    });
    
    // Eventos do vídeo
    this.video.addEventListener('playing', () => {
      this.hideOverlay();
      this.setStatus('Reproduzindo', 'success');
    });
    
    this.video.addEventListener('error', (e) => {
      this.handleError('Erro ao reproduzir vídeo');
    });
    
    this.video.addEventListener('stalled', () => {
      this.setStatus('Buffering...', 'warning');
    });
  }

  /**
   * Reproduz um stream
   * @param {Object} options - Opções do stream
   */
  async play(options) {
    this.currentStream = options;
    this.retryCount = 0;
    this.container.style.display = 'block';
    
    this.showOverlay('Conectando ao stream...');
    this.hideError();
    
    const { url, type, username, password } = options;
    this.urlSpan.textContent = this.sanitizeUrl(url);
    
    try {
      switch (type || this.detectStreamType(url)) {
        case 'mjpeg':
          await this.playMjpeg(url);
          break;
        case 'hls':
          await this.playHls(url);
          break;
        case 'rtsp':
          await this.playRtsp(url, username, password);
          break;
        case 'image':
          await this.playImageRefresh(url);
          break;
        default:
          // Tenta como vídeo direto primeiro
          await this.playDirect(url);
      }
    } catch (error) {
      this.handleError(error.message);
    }
  }

  /**
   * Detecta o tipo de stream pela URL
   */
  detectStreamType(url) {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.startsWith('rtsp://')) return 'rtsp';
    if (lowerUrl.includes('.m3u8')) return 'hls';
    if (lowerUrl.includes('mjpg') || lowerUrl.includes('mjpeg')) return 'mjpeg';
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif)(\?|$)/)) return 'image';
    
    return 'direct';
  }

  /**
   * Reproduz stream MJPEG
   */
  async playMjpeg(url) {
    this.video.style.display = 'none';
    this.image.style.display = 'block';
    
    return new Promise((resolve, reject) => {
      this.image.onload = () => {
        this.hideOverlay();
        this.setStatus('MJPEG Ativo', 'success');
        resolve();
      };
      
      this.image.onerror = () => {
        reject(new Error('Falha ao carregar stream MJPEG'));
      };
      
      this.image.src = url;
    });
  }

  /**
   * Reproduz stream HLS
   */
  async playHls(url) {
    this.image.style.display = 'none';
    this.video.style.display = 'block';
    
    // Se o navegador suporta HLS nativamente
    if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = url;
      await this.video.play();
      return;
    }
    
    // Caso contrário, usa hls.js (se disponível)
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(this.video);
      
      return new Promise((resolve, reject) => {
        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          await this.video.play();
          resolve();
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            reject(new Error('Erro HLS: ' + data.type));
          }
        });
      });
    }
    
    throw new Error('HLS não suportado. O stream pode não funcionar.');
  }

  /**
   * Reproduz stream RTSP via proxy WebSocket
   */
  async playRtsp(url, username, password) {
    // RTSP não funciona diretamente no browser
    // Precisamos de um proxy ou conversão
    
    this.showOverlay('RTSP requer conversão...');
    
    // Mostra instruções para o usuário
    this.showRtspInstructions(url, username, password);
  }

  /**
   * Reproduz vídeo direto (MP4, WebM, etc)
   */
  async playDirect(url) {
    this.image.style.display = 'none';
    this.video.style.display = 'block';
    
    this.video.src = url;
    await this.video.play();
  }

  /**
   * Reproduz imagem com refresh automático
   */
  async playImageRefresh(url, interval = 1000) {
    this.video.style.display = 'none';
    this.image.style.display = 'block';
    
    const refresh = () => {
      const timestamp = new Date().getTime();
      const separator = url.includes('?') ? '&' : '?';
      this.image.src = `${url}${separator}_t=${timestamp}`;
    };
    
    this.image.onload = () => {
      this.hideOverlay();
      this.setStatus('Snapshot Ativo', 'success');
    };
    
    refresh();
    this.refreshInterval = setInterval(refresh, interval);
  }

  /**
   * Mostra instruções para stream RTSP
   */
  showRtspInstructions(url, username, password) {
    const authUrl = url.replace('rtsp://', `rtsp://${username || 'admin'}:${password || 'admin'}@`);
    
    this.hideOverlay();
    this.errorDiv.style.display = 'flex';
    this.errorDiv.innerHTML = `
      <div class="rtsp-instructions">
        <h3>📹 Stream RTSP Detectado</h3>
        <p>Streams RTSP não podem ser reproduzidos diretamente no navegador.</p>
        
        <div class="rtsp-options">
          <h4>Opções:</h4>
          
          <div class="rtsp-option">
            <strong>1. VLC Media Player</strong>
            <p>Copie a URL e abra no VLC:</p>
            <code class="copyable" onclick="navigator.clipboard.writeText(this.textContent)">${authUrl}</code>
            <small>Clique para copiar</small>
          </div>
          
          <div class="rtsp-option">
            <strong>2. Converter para Web</strong>
            <p>Use o conversor integrado (requer ffmpeg):</p>
            <button class="btn-convert" onclick="streamPlayer.startConverter('${url}', '${username}', '${password}')">
              🔄 Iniciar Conversão
            </button>
          </div>
          
          <div class="rtsp-option">
            <strong>3. Tentar Snapshot</strong>
            <p>Alguns DVRs oferecem imagens estáticas:</p>
            <button class="btn-snapshot" onclick="streamPlayer.trySnapshots()">
              📷 Buscar Snapshots
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Inicia conversor RTSP -> WebSocket
   */
  async startConverter(rtspUrl, username, password) {
    // Esta função seria implementada com um servidor local
    // que usa ffmpeg para converter RTSP para WebSocket/HLS
    
    this.showOverlay('Iniciando conversão com ffmpeg...');
    
    try {
      // Envia para o main process iniciar a conversão
      if (window.iePortable && window.iePortable.startRtspProxy) {
        const result = await window.iePortable.startRtspProxy(rtspUrl, username, password);
        if (result.success) {
          // Conecta ao stream convertido
          await this.playHls(result.hlsUrl);
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('Conversor não disponível. Instale o ffmpeg.');
      }
    } catch (error) {
      this.handleError('Falha na conversão: ' + error.message);
    }
  }

  /**
   * Tenta encontrar snapshots
   */
  async trySnapshots() {
    if (!this.currentStream) return;
    
    const host = new URL(this.currentStream.url.replace('rtsp://', 'http://')).host;
    const handler = new ActiveXHandler();
    const urls = handler.generateSnapshotUrls(
      host,
      this.currentStream.username,
      this.currentStream.password
    );
    
    this.showOverlay('Testando URLs de snapshot...');
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { 
          mode: 'no-cors',
          credentials: 'include'
        });
        
        // Se chegou aqui, a URL pode funcionar
        await this.playImageRefresh(url, 2000);
        return;
      } catch (e) {
        continue;
      }
    }
    
    this.handleError('Nenhum snapshot encontrado. Tente usar VLC.');
  }

  /**
   * Para o stream atual
   */
  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    this.video.pause();
    this.video.src = '';
    this.image.src = '';
    
    this.currentStream = null;
    this.setStatus('Desconectado', 'default');
  }

  /**
   * Captura snapshot do stream atual
   */
  takeSnapshot() {
    const canvas = this.canvas;
    const ctx = canvas.getContext('2d');
    
    let source = this.video.style.display !== 'none' ? this.video : this.image;
    
    canvas.width = source.videoWidth || source.naturalWidth || source.width;
    canvas.height = source.videoHeight || source.naturalHeight || source.height;
    
    ctx.drawImage(source, 0, 0);
    
    // Download
    const link = document.createElement('a');
    link.download = `snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    this.setStatus('Snapshot salvo!', 'success');
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    const elem = this.container.querySelector('.stream-content');
    
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => {
        console.error('Erro ao entrar em tela cheia:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Helpers de UI
  showOverlay(message) {
    this.overlay.style.display = 'flex';
    this.overlay.querySelector('.stream-text').textContent = message;
  }

  hideOverlay() {
    this.overlay.style.display = 'none';
  }

  showError(message) {
    this.errorDiv.style.display = 'flex';
    this.errorDiv.querySelector('.error-text').textContent = message;
  }

  hideError() {
    this.errorDiv.style.display = 'none';
  }

  handleError(message) {
    this.hideOverlay();
    this.showError(message);
    this.setStatus('Erro', 'error');
    
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
    }
  }

  setStatus(text, type = 'default') {
    this.statusSpan.textContent = text;
    this.statusSpan.className = `status-${type}`;
  }

  sanitizeUrl(url) {
    // Remove credenciais da URL para exibição
    return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  }
}

// Estilos do player
const streamPlayerStyles = `
<style>
.stream-player {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a1a;
  color: white;
}

.stream-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #444;
}

.stream-title {
  font-weight: 500;
}

.stream-controls {
  display: flex;
  gap: 4px;
}

.stream-btn {
  background: transparent;
  border: none;
  color: white;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
}

.stream-btn:hover {
  background: #444;
}

.stream-content {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.stream-content video,
.stream-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.stream-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stream-message {
  text-align: center;
}

.stream-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.stream-text {
  font-size: 16px;
  margin-bottom: 16px;
}

.stream-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #444;
  border-top-color: #0078d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stream-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-text {
  margin-bottom: 16px;
  text-align: center;
}

.retry-btn, .btn-convert, .btn-snapshot {
  background: #0078d4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover, .btn-convert:hover, .btn-snapshot:hover {
  background: #005a9e;
}

.stream-info {
  display: flex;
  justify-content: space-between;
  padding: 6px 12px;
  background: #2d2d2d;
  font-size: 12px;
  color: #aaa;
}

.status-success { color: #4caf50; }
.status-warning { color: #ff9800; }
.status-error { color: #f44336; }

/* Instruções RTSP */
.rtsp-instructions {
  max-width: 500px;
  text-align: left;
}

.rtsp-instructions h3 {
  margin-bottom: 12px;
}

.rtsp-instructions p {
  margin-bottom: 16px;
  color: #aaa;
}

.rtsp-options {
  background: #2d2d2d;
  padding: 16px;
  border-radius: 8px;
}

.rtsp-option {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #444;
}

.rtsp-option:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.rtsp-option strong {
  display: block;
  margin-bottom: 8px;
  color: #0078d4;
}

.rtsp-option p {
  margin-bottom: 8px;
  font-size: 13px;
}

code.copyable {
  display: block;
  background: #1a1a1a;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
  cursor: pointer;
  margin-bottom: 4px;
}

code.copyable:hover {
  background: #333;
}

.rtsp-option small {
  color: #666;
  font-size: 11px;
}
</style>
`;

// Injetar estilos
document.head.insertAdjacentHTML('beforeend', streamPlayerStyles);

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StreamPlayer;
}
