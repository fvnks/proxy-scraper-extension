# Proxy Scraper y Gestor

Una extensión para Chrome que te permite buscar, verificar y gestionar proxies HTTP para eludir restricciones web.

## Características

- Búsqueda automática de proxies de fuentes confiables
- Verificación automática del funcionamiento de cada proxy
- Información detallada de la ubicación de cada proxy
- Rotación automática de proxies en intervalos configurables
- Interfaz intuitiva con indicadores de estado
- Identificación de país con banderas
- Sistema de actualizaciones automáticas

## Instalación

### Desde Chrome Web Store (Recomendado)

1. Visita la [página de la extensión en Chrome Web Store](#) (Proximamente)
2. Haz clic en "Añadir a Chrome"

### Instalación Manual

1. Descarga la última versión desde la [página de releases](https://github.com/fvnks/proxy-scraper-extension/releases)
2. Descomprime el archivo ZIP
3. Abre Chrome y navega a `chrome://extensions/`
4. Activa el "Modo desarrollador" con el interruptor en la esquina superior derecha
5. Haz clic en "Cargar descomprimida" y selecciona la carpeta descomprimida

## Uso

1. Haz clic en el icono de la extensión en la barra de herramientas
2. Usa el botón "Buscar Proxies" para encontrar servidores proxy disponibles
3. Haz clic en cualquier proxy de la lista para conectarte
4. Activa la rotación automática para cambiar periódicamente entre proxies

## Desarrollo

### Requisitos

- Node.js (para el empaquetado)
- npm (para las dependencias de desarrollo)

### Configuración para desarrollo

1. Clona este repositorio:
   ```
   git clone https://github.com/fvnks/proxy-scraper-extension.git
   cd proxy-scraper-extension
   ```

2. Instala las dependencias de desarrollo (si necesitas empaquetar como CRX):
   ```
   npm install -g crx
   ```

3. Carga la extensión en Chrome:
   - Abre Chrome y ve a `chrome://extensions/`
   - Activa el "Modo desarrollador"
   - Haz clic en "Cargar descomprimida" y selecciona la carpeta del repositorio

### Empaquetado de la extensión

Para crear un paquete ZIP y actualizar el archivo updates.xml:

```
./manual-package.sh
```

Para crear un archivo CRX (requiere Node.js y el paquete crx):

```
node create-crx.js
```

## Proceso de publicación

1. Actualiza la versión en `manifest.json`
2. Ejecuta `./manual-package.sh` para crear el paquete ZIP y actualizar updates.xml
3. Ejecuta `node create-crx.js` para crear el archivo CRX
4. Crea un nuevo release en GitHub:
   - Tag: v{versión} (ej. v1.0.5)
   - Título: Version {versión}
   - Descripción: Cambios y mejoras
   - Archivos adjuntos: ZIP y CRX generados
5. Publica el release

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 