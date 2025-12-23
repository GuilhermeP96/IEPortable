#!/bin/bash

echo "=========================================="
echo "         IE Portable - Iniciando"
echo "=========================================="
echo

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verifica se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado!"
    echo "Instale com: sudo apt install nodejs npm"
    echo "Ou acesse: https://nodejs.org"
    exit 1
fi

# Verifica se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERRO] Falha ao instalar dependências!"
        exit 1
    fi
    echo
fi

echo "Iniciando IE Portable..."
echo
npm start
