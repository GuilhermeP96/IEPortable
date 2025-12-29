# Issues Conhecidos / Known Issues

## 🔴 Prioridade Alta / High Priority

### Issue #1: Emulação ActiveX Incompleta
**Status:** Em desenvolvimento  
**Descrição:** O emulador ActiveX consegue interceptar chamadas JavaScript, mas não consegue executar código binário real dos plugins. Alguns DVRs verificam se o plugin está realmente instalado no sistema antes de carregar a interface.

**Sintomas:**
- Tela branca após login em alguns DVRs
- Funcionalidades de vídeo não funcionam
- Erros de "plugin não instalado"

**Workarounds atuais:**
- Usar a opção "Abrir Interface Web" para acessar interfaces alternativas
- Usar software nativo do fabricante (IVMS-4200, SmartPSS, etc.)

---

### Issue #2: Plugins .EXE com DLLs em Program Files
**Status:** Em investigação  
**Descrição:** Ao escanear pastas de plugins instalados via .EXE (que colocam DLLs em `C:\Program Files`), os plugins são importados mas não funcionam corretamente.

**Causa provável:**
- DLLs dependem de outras DLLs que não são importadas
- Registro do Windows não é atualizado corretamente
- Caminhos absolutos codificados nos plugins

**Passos para reproduzir:**
1. Instalar plugin de DVR via instalador .EXE
2. Abrir Gerenciador de Plugins
3. Clicar em "Escanear Pasta"
4. Selecionar `C:\Program Files\[NomeDoPlugin]`
5. Plugins são importados mas não funcionam

---

## 🟡 Prioridade Média / Medium Priority

### Issue #3: Erro ERR_ABORTED ao carregar about:blank
**Status:** Cosmético (não afeta funcionamento)  
**Descrição:** Aparece erro no console ao iniciar: `ERR_ABORTED (-3) loading 'about:blank'`

---

### Issue #4: Avisos de Segurança do Electron
**Status:** Esperado (necessário para compatibilidade)  
**Descrição:** Avisos sobre `webSecurity`, `allowRunningInsecureContent` aparecem no console. São necessários para acessar DVRs que usam HTTP e conteúdo misto.

---

## 🟢 Melhorias Futuras / Future Improvements

- [ ] Integração com Wine para executar plugins ActiveX reais no Linux/macOS
- [ ] Player RTSP embutido usando ffmpeg/libvlc
- [ ] Detecção automática de streams disponíveis via ONVIF
- [ ] Suporte a mais fabricantes de DVR/NVR
- [ ] Interface para configurar credenciais padrão por host

---

## Contribuindo / Contributing

Se você encontrar uma solução para algum desses issues, por favor abra um Pull Request!

If you find a solution for any of these issues, please open a Pull Request!
