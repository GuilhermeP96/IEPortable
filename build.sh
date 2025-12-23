#!/bin/bash

echo "=========================================="
echo "         IE Portable - Build"
echo "=========================================="
echo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Função de ajuda
show_help() {
    echo "Uso: ./build.sh [win|linux|all]"
    echo
    echo "Opções:"
    echo "  win   - Build apenas para Windows"
    echo "  linux - Build apenas para Linux"
    echo "  all   - Build para Windows e Linux"
}

# Verifica argumento
if [ -z "$1" ]; then
    show_help
    echo
    read -p "Escolha [win/linux/all]: " choice
else
    choice=$1
fi

# Instala dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
fi

echo
echo "Gerando build para: $choice"
echo

case $choice in
    win)
        npm run build:win
        ;;
    linux)
        npm run build:linux
        ;;
    all)
        npm run build:all
        ;;
    *)
        echo "Opção inválida!"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo
    echo "=========================================="
    echo "Build concluído! Verifique a pasta dist/"
    echo "=========================================="
else
    echo
    echo "[ERRO] Build falhou!"
fi
