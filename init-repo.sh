#!/bin/bash

# Inicializar el repositorio git
git init

# Agregar todos los archivos
git add .

# Crear el commit inicial
git commit -m "Initial commit: Proxy Scraper y Gestor extension"

# Agregar el repositorio remoto
git remote add origin https://github.com/fvnks/proxy-scraper-extension.git

# Subir al repositorio
git push -u origin main

echo "Repositorio inicializado y subido a GitHub" 