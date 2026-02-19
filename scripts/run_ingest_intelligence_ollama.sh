#!/bin/zsh
set -euo pipefail
cd '/Users/veland/Downloads/Epstein Files/epstein-archive'
export DB_PATH='./epstein-archive.db'
export AI_PROVIDER='local_ollama'
export OLLAMA_HOST='http://127.0.0.1:11434'
export OLLAMA_MODEL='llama3.2:1b'
export INGEST_CONCURRENCY='30'
exec ./node_modules/.bin/tsx scripts/ingest_intelligence.ts
