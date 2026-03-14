// ============================================
// RTSP Proxy - Converte RTSP para HLS/MJPEG
// Usa ffmpeg para transcodificar streams de câmeras
// ============================================

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

class RtspProxy {
  constructor() {
    this.ffmpegPath = null;
    this.activeStreams = new Map(); // streamId -> process info
    this.hlsDir = path.join(os.tmpdir(), 'ieportable-hls');
    this.httpServer = null;
    this.httpPort = 0; // será alocado automaticamente
    this.mjpegClients = new Map(); // streamId -> Set of response objects
    
    this.initDirectories();
    this.detectFfmpeg();
  }

  /**
   * Cria diretórios necessários
   */
  initDirectories() {
    if (!fs.existsSync(this.hlsDir)) {
      fs.mkdirSync(this.hlsDir, { recursive: true });
    }
  }

  /**
   * Detecta ffmpeg no sistema
   */
  async detectFfmpeg() {
    return new Promise((resolve) => {
      // Locais comuns de ffmpeg
      const candidates = [
        'ffmpeg',
        path.join(__dirname, '..', 'bin', 'ffmpeg'),
        path.join(__dirname, '..', 'bin', 'ffmpeg.exe'),
      ];

      if (os.platform() === 'win32') {
        candidates.push(
          'C:\\ffmpeg\\bin\\ffmpeg.exe',
          path.join(process.env.LOCALAPPDATA || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
          path.join(process.env.ProgramFiles || '', 'ffmpeg', 'bin', 'ffmpeg.exe'),
        );
      }

      const tryNext = (index) => {
        if (index >= candidates.length) {
          console.log('[RtspProxy] ffmpeg não encontrado no sistema');
          resolve(false);
          return;
        }

        const candidate = candidates[index];
        exec(`"${candidate}" -version`, (error, stdout) => {
          if (!error && stdout.includes('ffmpeg version')) {
            this.ffmpegPath = candidate;
            console.log(`[RtspProxy] ffmpeg encontrado: ${candidate}`);
            resolve(true);
          } else {
            tryNext(index + 1);
          }
        });
      };

      tryNext(0);
    });
  }

  /**
   * Verifica se ffmpeg está disponível
   */
  isAvailable() {
    return !!this.ffmpegPath;
  }

  /**
   * Retorna status do proxy
   */
  getStatus() {
    return {
      available: this.isAvailable(),
      ffmpegPath: this.ffmpegPath,
      activeStreams: this.activeStreams.size,
      httpPort: this.httpPort,
      hlsDir: this.hlsDir
    };
  }

  /**
   * Inicia o servidor HTTP local para servir HLS/MJPEG
   */
  async startHttpServer() {
    if (this.httpServer) return this.httpPort;

    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      this.httpServer.listen(0, '127.0.0.1', () => {
        this.httpPort = this.httpServer.address().port;
        console.log(`[RtspProxy] HTTP server rodando em http://127.0.0.1:${this.httpPort}`);
        resolve(this.httpPort);
      });

      this.httpServer.on('error', (err) => {
        console.error('[RtspProxy] Erro no servidor HTTP:', err);
        reject(err);
      });
    });
  }

  /**
   * Manipula requisições HTTP (HLS e MJPEG)
   */
  handleHttpRequest(req, res) {
    const url = req.url;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // HLS - Servir arquivos .m3u8 e .ts
    if (url.endsWith('.m3u8') || url.endsWith('.ts')) {
      const filePath = path.join(this.hlsDir, url.replace(/^\//, ''));
      
      if (fs.existsSync(filePath)) {
        const contentType = url.endsWith('.m3u8') 
          ? 'application/vnd.apple.mpegurl' 
          : 'video/MP2T';
        
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
      return;
    }

    // MJPEG stream
    if (url.startsWith('/mjpeg/')) {
      const streamId = url.split('/')[2];
      
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache'
      });

      // Registrar cliente para receber frames
      if (!this.mjpegClients.has(streamId)) {
        this.mjpegClients.set(streamId, new Set());
      }
      this.mjpegClients.get(streamId).add(res);

      req.on('close', () => {
        const clients = this.mjpegClients.get(streamId);
        if (clients) {
          clients.delete(res);
        }
      });
      return;
    }

    // Status
    if (url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getStatus()));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  }

  /**
   * Inicia conversão RTSP -> HLS
   * @returns {Object} { success, streamId, hlsUrl }
   */
  async startRtspToHls(rtspUrl, username, password) {
    if (!this.ffmpegPath) {
      return { success: false, error: 'ffmpeg não encontrado. Instale em https://ffmpeg.org' };
    }

    await this.startHttpServer();

    const streamId = `stream_${Date.now()}`;
    const streamDir = path.join(this.hlsDir, streamId);
    fs.mkdirSync(streamDir, { recursive: true });

    // Construir URL RTSP com credenciais
    let fullUrl = rtspUrl;
    if (username && password && !rtspUrl.includes('@')) {
      fullUrl = rtspUrl.replace('rtsp://', `rtsp://${username}:${password}@`);
    }

    const playlistPath = path.join(streamDir, 'stream.m3u8');

    // Argumentos ffmpeg para converter RTSP -> HLS
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', fullUrl,
      '-c:v', 'copy',        // Sem transcodificação de vídeo (rápido)
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_filename', path.join(streamDir, 'seg_%d.ts'),
      playlistPath
    ];

    console.log(`[RtspProxy] Iniciando: ffmpeg ${args.join(' ')}`);

    const process = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let lastError = '';
    process.stderr.on('data', (data) => {
      lastError = data.toString();
      // Log apenas erros importantes
      if (lastError.includes('Error') || lastError.includes('error')) {
        console.warn('[RtspProxy] ffmpeg:', lastError.trim());
      }
    });

    process.on('close', (code) => {
      console.log(`[RtspProxy] ffmpeg encerrou com código ${code}`);
      this.activeStreams.delete(streamId);
      // Limpar arquivos
      try {
        fs.rmSync(streamDir, { recursive: true, force: true });
      } catch (e) { /* ignorar */ }
    });

    this.activeStreams.set(streamId, {
      process,
      rtspUrl: fullUrl,
      hlsUrl: `http://127.0.0.1:${this.httpPort}/${streamId}/stream.m3u8`,
      startTime: Date.now(),
      streamDir
    });

    // Esperar o primeiro segmento ser gerado (max 10s)
    const ready = await new Promise((resolve) => {
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (fs.existsSync(playlistPath)) {
          clearInterval(check);
          resolve(true);
        } else if (attempts > 20 || !this.activeStreams.has(streamId)) {
          clearInterval(check);
          resolve(false);
        }
      }, 500);
    });

    if (!ready) {
      this.stopStream(streamId);
      return { 
        success: false, 
        error: `Falha ao conectar ao stream RTSP. Último erro: ${lastError.substring(0, 200)}`,
        suggestion: 'Verifique se a URL RTSP, usuário e senha estão corretos.'
      };
    }

    return {
      success: true,
      streamId,
      hlsUrl: `http://127.0.0.1:${this.httpPort}/${streamId}/stream.m3u8`
    };
  }

  /**
   * Inicia conversão RTSP -> MJPEG
   * @returns {Object} { success, streamId, mjpegUrl }
   */
  async startRtspToMjpeg(rtspUrl, username, password) {
    if (!this.ffmpegPath) {
      return { success: false, error: 'ffmpeg não encontrado' };
    }

    await this.startHttpServer();

    const streamId = `mjpeg_${Date.now()}`;

    let fullUrl = rtspUrl;
    if (username && password && !rtspUrl.includes('@')) {
      fullUrl = rtspUrl.replace('rtsp://', `rtsp://${username}:${password}@`);
    }

    // ffmpeg RTSP -> MJPEG via pipe
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', fullUrl,
      '-f', 'mjpeg',
      '-q:v', '5',
      '-r', '10',           // 10 fps
      '-s', '640x480',      // Resolução reduzida para performance
      'pipe:1'
    ];

    const process = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Buffer para acumular frames JPEG
    let buffer = Buffer.alloc(0);
    const SOI = Buffer.from([0xFF, 0xD8]); // JPEG Start Of Image
    const EOI = Buffer.from([0xFF, 0xD9]); // JPEG End Of Image

    process.stdout.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);

      // Procurar frames JPEG completos
      while (true) {
        const soiIndex = buffer.indexOf(SOI);
        const eoiIndex = buffer.indexOf(EOI, soiIndex + 2);

        if (soiIndex === -1 || eoiIndex === -1) break;

        const frame = buffer.slice(soiIndex, eoiIndex + 2);
        buffer = buffer.slice(eoiIndex + 2);

        // Enviar frame para todos os clientes MJPEG
        const clients = this.mjpegClients.get(streamId);
        if (clients) {
          for (const client of clients) {
            try {
              client.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
              client.write(frame);
              client.write('\r\n');
            } catch (e) {
              clients.delete(client);
            }
          }
        }
      }
    });

    process.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Error')) {
        console.warn('[RtspProxy] MJPEG ffmpeg:', msg.trim());
      }
    });

    process.on('close', () => {
      this.activeStreams.delete(streamId);
      this.mjpegClients.delete(streamId);
    });

    this.activeStreams.set(streamId, {
      process,
      rtspUrl: fullUrl,
      mjpegUrl: `http://127.0.0.1:${this.httpPort}/mjpeg/${streamId}`,
      startTime: Date.now(),
      type: 'mjpeg'
    });

    // Aguardar primeiro frame
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      streamId,
      mjpegUrl: `http://127.0.0.1:${this.httpPort}/mjpeg/${streamId}`
    };
  }

  /**
   * Para um stream específico
   */
  stopStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      try {
        stream.process.kill('SIGTERM');
      } catch (e) { /* ignorar */ }
      this.activeStreams.delete(streamId);
      
      // Limpar diretório HLS se existir
      if (stream.streamDir) {
        try {
          fs.rmSync(stream.streamDir, { recursive: true, force: true });
        } catch (e) { /* ignorar */ }
      }
    }
  }

  /**
   * Para todos os streams
   */
  stopAll() {
    for (const [streamId] of this.activeStreams) {
      this.stopStream(streamId);
    }
  }

  /**
   * Testa uma URL RTSP (verifica se é acessível)
   */
  async testRtspUrl(rtspUrl, username, password, timeout = 8000) {
    if (!this.ffmpegPath) {
      return { success: false, error: 'ffmpeg não encontrado' };
    }

    let fullUrl = rtspUrl;
    if (username && password && !rtspUrl.includes('@')) {
      fullUrl = rtspUrl.replace('rtsp://', `rtsp://${username}:${password}@`);
    }

    return new Promise((resolve) => {
      const args = [
        '-rtsp_transport', 'tcp',
        '-i', fullUrl,
        '-t', '1',           // Ler apenas 1 segundo
        '-f', 'null',
        '-'
      ];

      const proc = spawn(this.ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout
      });

      let output = '';
      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve({ success: false, error: 'Timeout ao conectar' });
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        
        // ffmpeg retorna 0 ou tem output com informações de stream
        if (output.includes('Stream #') || output.includes('Video:') || code === 0) {
          // Extrair informações do stream
          const videoMatch = output.match(/Video: (\w+)/);
          const resMatch = output.match(/(\d{2,4}x\d{2,4})/);
          
          resolve({
            success: true,
            codec: videoMatch ? videoMatch[1] : 'unknown',
            resolution: resMatch ? resMatch[1] : 'unknown',
            url: rtspUrl
          });
        } else {
          resolve({ 
            success: false, 
            error: output.includes('401') ? 'Autenticação falhou' :
                   output.includes('Connection refused') ? 'Conexão recusada' :
                   output.includes('timeout') ? 'Timeout' :
                   'Falha ao conectar'
          });
        }
      });
    });
  }

  /**
   * Tenta várias URLs RTSP e retorna a primeira que funciona
   */
  async findWorkingRtspUrl(host, username, password, brand) {
    const paths = this.getRtspPathsForBrand(brand);
    
    for (const rtspPath of paths) {
      const url = `rtsp://${host}:554${rtspPath}`;
      console.log(`[RtspProxy] Testando: ${url}`);
      
      const result = await this.testRtspUrl(url, username, password, 5000);
      if (result.success) {
        return { ...result, url };
      }
    }
    
    return { success: false, error: 'Nenhuma URL RTSP funcionou' };
  }

  /**
   * Retorna paths RTSP para um fabricante
   */
  getRtspPathsForBrand(brand) {
    const brandLower = (brand || '').toLowerCase();
    
    if (brandLower.includes('hikvision')) {
      return [
        '/Streaming/Channels/101',
        '/Streaming/Channels/102',
        '/Streaming/Channels/201',
        '/h264/ch1/main/av_stream',
        '/h264/ch1/sub/av_stream',
        '/ISAPI/Streaming/Channels/101',
      ];
    }
    
    if (brandLower.includes('tecvoz')) {
      return [
        '/cam/realmonitor?channel=1&subtype=0',
        '/cam/realmonitor?channel=1&subtype=1',
        '/live/ch00_0',
        '/live/ch00_1',
        '/live',
        '/user=admin&password=&channel=1&stream=0.sdp',
        '/onvif1',
      ];
    }
    
    if (brandLower.includes('dahua') || brandLower.includes('intelbras')) {
      return [
        '/cam/realmonitor?channel=1&subtype=0',
        '/cam/realmonitor?channel=1&subtype=1',
        '/live',
      ];
    }
    
    // Genérico - tentar tudo
    return [
      '/Streaming/Channels/101',
      '/cam/realmonitor?channel=1&subtype=0',
      '/live/ch00_0',
      '/live',
      '/stream1',
      '/profile0',
      '/onvif1',
      '/h264/ch1/main/av_stream',
      '/user=admin&password=&channel=1&stream=0.sdp',
    ];
  }

  /**
   * Encerrar e limpar
   */
  destroy() {
    this.stopAll();
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    // Limpar diretório HLS
    try {
      fs.rmSync(this.hlsDir, { recursive: true, force: true });
    } catch (e) { /* ignorar */ }
  }
}

module.exports = RtspProxy;
