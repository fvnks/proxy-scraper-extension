// Este archivo sirve como entry point para el service worker

// Configurar polyfills y utilidades globales
if (typeof DOMParser === 'undefined') {
  // Implementación mínima de DOMParser para service workers
  self.DOMParser = class DOMParser {
    parseFromString(text, mimeType) {
      const div = { 
        querySelector: function(selector) {
          // Extraer atributos del texto XML usando expresiones regulares
          if (selector === 'updatecheck') {
            const versionMatch = text.match(/version=["']([^"']*)["']/i);
            const codebaseMatch = text.match(/codebase=["']([^"']*)["']/i);
            
            return {
              getAttribute: function(attr) {
                if (attr === 'version' && versionMatch) {
                  return versionMatch[1];
                } else if (attr === 'codebase' && codebaseMatch) {
                  return codebaseMatch[1];
                }
                return null;
              }
            };
          }
          return null;
        }
      };
      return div;
    }
  };
}

// Configurar listeners para el service worker
self.addEventListener('install', (event) => {
  console.log('Service worker instalado');
  self.skipWaiting();
});
  
self.addEventListener('activate', (event) => {
  console.log('Service worker activado');
  event.waitUntil(self.clients.claim());
});

// Importar scripts
try {
  console.log('Cargando background.js...');
  self.importScripts('./background.js');
  console.log('Service worker cargado correctamente');
} catch (e) {
  console.error('Error al cargar el service worker:', e);
}

// Listener para mantener el service worker activo en caso de error
self.addEventListener('fetch', (event) => {
  // No es necesario responder a todos los fetch, solo mantener el service worker activo
  if (event.request.url.includes('keep-alive')) {
    event.respondWith(new Response('Service worker activo'));
  }
});

// Listener para mensajes que pueden reactivar el service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    event.ports[0].postMessage('PONG');
  } else if (event.data && event.data.type === 'CHECK_UPDATES') {
    // Ruta adicional para verificar actualizaciones
    try {
      if (typeof checkForUpdates === 'function') {
        checkForUpdates(true).then(result => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
              type: 'UPDATE_CHECK_RESULT',
              result: result
            });
          }
        }).catch(error => {
          console.error('Error al verificar actualizaciones desde mensaje:', error);
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
              type: 'UPDATE_CHECK_ERROR',
              error: error.message || 'Error desconocido'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error al manejar mensaje de verificación de actualizaciones:', error);
    }
  }
}); 