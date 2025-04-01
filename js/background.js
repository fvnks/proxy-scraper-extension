// Fuentes de proxies
const PROXY_SOURCES = [
  // APIs oficiales y confiables
  'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
  'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
  'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt',
  'https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/http.txt',
  
  // APIs alternativas
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt'
];

// Almacenamiento de proxies funcionando
let workingProxies = [];
let currentProxyIndex = -1;
let autoRotateInterval = null;
let rotationInterval = 5; // Minutos entre rotaciones
let proxyStatus = 'gray'; // gray, yellow, red, green

// Inicializar extensión
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['workingProxies', 'autoRotate', 'rotationInterval'], (result) => {
    if (result.workingProxies) {
      workingProxies = result.workingProxies;
      updateIconColor();
    }
    if (result.rotationInterval) {
      rotationInterval = result.rotationInterval;
    }
    if (result.autoRotate) {
      startAutoRotation(rotationInterval);
    }
  });
});

// Actualizar color del icono según el estado del proxy
async function updateIconColor() {
  try {
    // Usar los íconos estándar en lugar de intentar cargar íconos de color específicos
    // que no están disponibles
    const iconPath = {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png'
    };
    
    // Establecer el ícono estándar
    await chrome.action.setIcon({
      path: iconPath
    });
    
    // Establecer el título de la extensión según el estado
    let title = "Proxy Scraper y Gestor";
    
    switch (proxyStatus) {
      case 'green':
        title += " - Conectado";
        break;
      case 'yellow':
        title += " - Disponible";
        break;
      case 'red':
        title += " - Error";
        break;
      default:
        title += " - Inactivo";
    }
    
    await chrome.action.setTitle({ title });
    
    // Guardar estado actual
    const currentStatus = {
      status: proxyStatus,
      workingProxies: workingProxies,
      currentProxy: currentProxyIndex >= 0 ? workingProxies[currentProxyIndex] : null,
      autoRotate: autoRotateInterval !== null,
      rotationInterval: autoRotateInterval ? autoRotateInterval / 60000 : 5
    };
    
    // Guardar los datos en el storage
    await chrome.storage.local.set({ 
      currentStatus: currentStatus,
      workingProxies: workingProxies 
    });
    
  } catch (error) {
    console.error('Error al actualizar el ícono:', error);
  }
}

// Verificar si el proxy actual está funcionando
async function checkProxyStatus() {
  if (workingProxies.length === 0) {
    proxyStatus = 'gray';
    updateIconColor();
    return;
  }

  if (currentProxyIndex === -1) {
    proxyStatus = 'yellow';
    updateIconColor();
    return;
  }

  const currentProxy = workingProxies[currentProxyIndex];
  const [host, port] = currentProxy.proxy.split(':');

  try {
    const response = await fetch('https://www.google.com', {
      proxy: `http://${host}:${port}`,
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (response.ok) {
      proxyStatus = 'green';
    } else {
      proxyStatus = 'red';
    }
  } catch (error) {
    console.error('Error al verificar el estado del proxy:', error);
    proxyStatus = 'red';
  }

  updateIconColor();
}

// Verificar si un proxy está funcionando
async function verifyProxy(proxy) {
  if (!chrome.proxy || !chrome.proxy.settings) {
    console.error('La API de proxy no está disponible en este contexto de service worker');
    return {
      proxy,
      working: false,
      verified: false,
      error: 'API de proxy no disponible'
    };
  }
  
  const [host, port] = proxy.split(':');
  console.log(`Verificando proxy: ${proxy}`);
  
  try {
    // Intentar obtener datos a través del proxy configurando temporalmente
    let working = false;
    let ip = null;
    let locationData = null;
    
    // Configurar proxy para la verificación
    await new Promise((resolve) => {
      chrome.proxy.settings.set({
        value: {
          mode: "fixed_servers",
          rules: {
            singleProxy: {
              scheme: "http",
              host: host,
              port: parseInt(port)
            }
          }
        },
        scope: "regular"
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error al configurar proxy para verificación:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
    
    // Esperar un momento para que la configuración surta efecto
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Intentar cargar recursos a través del proxy
    try {
      // Usamos AbortController para limitar el tiempo de espera
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        working = true;
        const data = await response.json();
        ip = data.ip;
        
        // Obtener información de ubicación
        try {
          const locationController = new AbortController();
          const locationTimeoutId = setTimeout(() => locationController.abort(), 3000);
          
          const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
            signal: locationController.signal
          });
          
          clearTimeout(locationTimeoutId);
          
          if (locationResponse.ok) {
            locationData = await locationResponse.json();
            console.log(`Ubicación obtenida para ${proxy}: ${locationData.country_name}`);
          }
        } catch (locationError) {
          console.log(`Error al obtener ubicación para ${proxy}:`, locationError);
        }
      }
    } catch (error) {
      console.log(`Error al verificar ${proxy}:`, error);
    } finally {
      // Restaurar la configuración original del proxy
      await restoreProxySettings();
    }
    
    if (working) {
      console.log(`Proxy ${proxy} verificado exitosamente, IP: ${ip}`);
      return {
        proxy,
        ip: ip,
        country: locationData?.country_name,
        countryCode: locationData?.country_code,
        city: locationData?.city,
        region: locationData?.region,
        working: true,
        verified: true
      };
    }
  } catch (error) {
    console.log(`Error al verificar ${proxy}:`, error);
    // Asegurarse de restaurar la configuración del proxy en caso de error
    await restoreProxySettings();
  }
  
  return {
    proxy,
    working: false,
    verified: true,
    error: 'Verificación fallida'
  };
}

// Restaurar configuración original del proxy
async function restoreProxySettings() {
  if (!chrome.proxy || !chrome.proxy.settings) {
    console.error('La API de proxy no está disponible en este contexto');
    return;
  }
  
  try {
    if (currentProxyIndex >= 0 && workingProxies.length > 0) {
      updateProxyConfig();
    } else {
      await new Promise((resolve) => {
        chrome.proxy.settings.set({
          value: { mode: "direct" },
          scope: "regular"
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error al restablecer proxy:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    }
  } catch (error) {
    console.error('Error al restaurar configuración de proxy:', error);
  }
}

// Verificar todos los proxies
async function verifyProxies() {
  console.log('Iniciando verificación de proxies...');
  const proxies = await scrapeProxies();
  workingProxies = [];
  
  // Verificar solo los primeros 50 proxies para mayor velocidad
  const proxiesToCheck = proxies.slice(0, 50);
  
  for (const proxy of proxiesToCheck) {
    const result = await verifyProxy(proxy);
    if (result.working) {
      workingProxies.push(result);
      console.log(`Proxy ${proxy} agregado a la lista de funcionando`);
    }
  }
  
  console.log(`Total de proxies funcionando: ${workingProxies.length}`);
  await chrome.storage.local.set({ workingProxies });
  proxyStatus = workingProxies.length > 0 ? 'yellow' : 'gray';
  updateIconColor();
  return workingProxies;
}

// Obtener proxies de las fuentes
async function scrapeProxies() {
  const proxies = new Set();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache'
  };
  
  for (const source of PROXY_SOURCES) {
    try {
      console.log(`Intentando obtener proxies de: ${source}`);
      const response = await fetch(source, {
        headers: headers,
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`Error al obtener ${source}: ${response.status}`);
        continue;
      }
      
      let text = await response.text();
      console.log(`Respuesta recibida de ${source}, longitud: ${text.length}`);
      
      // Procesar el texto para encontrar proxies
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Buscar patrones de IP:puerto
        const ipPortPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s*:?\s*(\d+)/;
        const match = trimmedLine.match(ipPortPattern);
        
        if (match) {
          const [_, ip, port] = match;
          // Validar que la IP y el puerto sean válidos
          if (isValidIP(ip) && isValidPort(port)) {
            proxies.add(`${ip}:${port}`);
          }
        }
      }
      
      console.log(`Proxies encontrados en ${source}: ${proxies.size}`);
    } catch (error) {
      console.error(`Error al obtener proxies de ${source}:`, error);
    }
  }
  
  const proxyArray = Array.from(proxies);
  console.log(`Total de proxies únicos encontrados: ${proxyArray.length}`);
  return proxyArray;
}

// Validar IP
function isValidIP(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

// Validar puerto
function isValidPort(port) {
  const num = parseInt(port, 10);
  return num >= 1 && num <= 65535;
}

// Limpiar todos los proxies
async function clearProxies() {
  workingProxies = [];
  currentProxyIndex = -1;
  proxyStatus = 'gray';
  await chrome.storage.local.set({ workingProxies });
  updateProxyConfig();
  updateIconColor();
  return true;
}

// Activar/desactivar rotación automática
async function toggleAutoRotate(enabled, interval) {
  if (enabled) {
    startAutoRotation(interval);
  } else {
    stopAutoRotation();
  }
  await chrome.storage.local.set({ autoRotate: enabled, rotationInterval: interval });
  return true;
}

// Activar la rotación automática
function startAutoRotation(interval = null) {
  stopAutoRotation();
  
  if (interval) {
    rotationInterval = interval;
  }
  
  const intervalMs = rotationInterval * 60 * 1000; // Convertir minutos a milisegundos
  
  console.log(`Iniciando rotación automática cada ${rotationInterval} minutos (${intervalMs}ms)`);
  
  autoRotateInterval = setInterval(() => {
    if (workingProxies.length > 0) {
      currentProxyIndex = (currentProxyIndex + 1) % workingProxies.length;
      updateProxyConfig();
      checkProxyStatus();
    }
  }, intervalMs);
  
  // Guardar la configuración de rotación automática
  chrome.storage.local.set({ 
    autoRotate: true, 
    rotationInterval: rotationInterval 
  });
}

// Detener rotación automática
function stopAutoRotation() {
  if (autoRotateInterval) {
    clearInterval(autoRotateInterval);
    autoRotateInterval = null;
  }
}

// Actualizar configuración del proxy
function updateProxyConfig() {
  if (!chrome.proxy || !chrome.proxy.settings) {
    console.error('La API de proxy no está disponible en este contexto');
    return;
  }

  if (workingProxies.length === 0 || currentProxyIndex < 0) {
    chrome.proxy.settings.set({
      value: { mode: "direct" },
      scope: "regular"
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error al establecer proxy directo:', chrome.runtime.lastError);
      }
    });
    return;
  }
  
  const proxy = workingProxies[currentProxyIndex];
  const [host, port] = proxy.proxy.split(':');
  
  chrome.proxy.settings.set({
    value: {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: "http",
          host: host,
          port: parseInt(port)
        }
      }
    },
    scope: "regular"
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error al establecer proxy:', chrome.runtime.lastError);
    }
  });
}

// Manejar errores de proxy
chrome.proxy.onProxyError.addListener((details) => {
  console.error('Error de proxy:', details);
  // Eliminar proxy fallido y cambiar al siguiente
  workingProxies = workingProxies.filter(p => p.proxy !== details.proxy);
  if (workingProxies.length > 0) {
    currentProxyIndex = (currentProxyIndex + 1) % workingProxies.length;
    updateProxyConfig();
    checkProxyStatus();
  } else {
    updateProxyConfig(); // Restablecer a conexión directa si no quedan proxies
    proxyStatus = 'gray';
    updateIconColor();
  }
});

// Desconectar del proxy actual
async function disconnectProxy() {
  workingProxies = workingProxies.filter(p => p.proxy !== workingProxies[currentProxyIndex]?.proxy);
  currentProxyIndex = -1;
  proxyStatus = 'gray';
  await chrome.storage.local.set({ workingProxies });
  updateProxyConfig();
  updateIconColor();
  return true;
}

// Limpiar proxies inactivos
async function clearInactiveProxies() {
  workingProxies = workingProxies.filter(proxy => proxy.working);
  if (currentProxyIndex >= workingProxies.length) {
    currentProxyIndex = workingProxies.length - 1;
  }
  await chrome.storage.local.set({ workingProxies });
  updateProxyConfig();
  checkProxyStatus();
  return true;
}

// Listener para mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Mensaje recibido:', request.action);
  
  try {
    switch (request.action) {
      case 'getStatus':
        sendResponse(getStatus());
        return true;
        
      case 'setCurrentProxy':
        if (request.proxy) {
          const proxyIndex = workingProxies.findIndex(p => p.proxy === request.proxy.proxy);
          if (proxyIndex !== -1) {
            currentProxyIndex = proxyIndex;
            updateProxyConfig();
            checkProxyStatus();
            sendResponse(true);
          } else {
            sendResponse(false);
          }
        } else {
          sendResponse(false);
        }
        return true;
        
      case 'verifyProxies':
        scrapeAndVerifyProxies().then(() => {
          sendResponse(true);
        }).catch(error => {
          console.error('Error en verifyProxies:', error);
          sendResponse(false);
        });
        return true;
        
      case 'clearProxies':
        clearProxies().then(() => {
          sendResponse(true);
        }).catch(error => {
          console.error('Error en clearProxies:', error);
          sendResponse(false);
        });
        return true;
        
      case 'clearInactiveProxies':
        clearInactiveProxies().then(() => {
          sendResponse(true);
        }).catch(error => {
          console.error('Error en clearInactiveProxies:', error);
          sendResponse(false);
        });
        return true;
        
      case 'disconnectProxy':
        disconnectProxy().then(() => {
          sendResponse(true);
        }).catch(error => {
          console.error('Error en disconnectProxy:', error);
          sendResponse(false);
        });
        return true;
        
      case 'toggleAutoRotate':
        if (request.enabled) {
          const interval = request.interval || rotationInterval;
          startAutoRotation(interval);
        } else {
          stopAutoRotation();
        }
        sendResponse(true);
        return true;
        
      case 'checkForUpdates':
        checkForUpdates(request.forceCheck || false).then(result => {
          sendResponse(result);
        }).catch(error => {
          console.error('Error al verificar actualizaciones:', error);
          sendResponse(false);
        });
        return true;
        
      case 'downloadAndInstallUpdate':
        downloadAndInstallUpdate().then(result => {
          sendResponse(result);
        }).catch(error => {
          console.error('Error al descargar actualización:', error);
          sendResponse(false);
        });
        return true;
        
      default:
        console.warn('Acción desconocida:', request.action);
        sendResponse({error: 'Acción desconocida'});
        return false;
    }
  } catch (error) {
    console.error('Error general al procesar mensaje:', error);
    sendResponse({error: error.message || 'Error desconocido'});
    return true;
  }
});

// Obtener el estado actual para el popup
function getStatus() {
  return {
    status: proxyStatus,
    workingProxies: workingProxies,
    currentProxy: currentProxyIndex >= 0 && workingProxies.length > 0 ? workingProxies[currentProxyIndex] : null,
    autoRotate: autoRotateInterval !== null,
    rotationInterval: rotationInterval
  };
}

// Función para parsear XML simple (reemplazo para DOMParser que no está disponible en service workers)
function parseXML(xmlText) {
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, 'text/xml');
}

// Función para verificar actualizaciones
async function checkForUpdates(forceCheck = false) {
  try {
    console.log('Verificando actualizaciones...');
    
    // Si no es una verificación forzada, verificamos si ya revisamos actualizaciones hoy
    if (!forceCheck) {
      const lastCheck = await chrome.storage.local.get('lastUpdateCheck');
      if (lastCheck.lastUpdateCheck) {
        const lastCheckDate = new Date(lastCheck.lastUpdateCheck);
        const now = new Date();
        // Si ya revisamos hoy, no volvemos a verificar
        if (lastCheckDate.toDateString() === now.toDateString() && !forceCheck) {
          console.log('Ya se verificaron actualizaciones hoy.');
          return false;
        }
      }
    }
    
    // Guardamos la fecha de última verificación
    await chrome.storage.local.set({ lastUpdateCheck: new Date().toISOString() });
    
    // Intentar obtener información de actualización del XML
    try {
      // Usamos la URL del repositorio actual
      const updateUrl = 'https://raw.githubusercontent.com/fvnks/proxy-scraper-extension/main/updates.xml';
      console.log('Obteniendo información de actualización desde:', updateUrl);
      
      const response = await fetch(updateUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener el archivo de actualizaciones (${response.status})`);
      }
      
      const xmlText = await response.text();
      console.log('Contenido XML recibido:', xmlText.substring(0, 200) + '...');
      
      // Primero intentamos extraer con expresiones regulares
      let latestVersion = null;
      let downloadUrl = null;
      
      // Probamos diferentes patrones para mayor compatibilidad
      const patrones = [
        /<updatecheck[^>]*version=["']([^"']*)["'][^>]*codebase=["']([^"']*)["'][^>]*>/i,
        /<updatecheck[^>]*codebase=["']([^"']*)["'][^>]*version=["']([^"']*)["'][^>]*>/i,
        /<updatecheck[^>]*version=["']([^"']*)["'][^>]*/i,
        /<updatecheck[^>]*codebase=["']([^"']*)["'][^>]*/i
      ];
      
      for (const patron of patrones) {
        const match = xmlText.match(patron);
        if (match) {
          if (patron === patrones[0]) {
            latestVersion = match[1];
            downloadUrl = match[2];
            break;
          } else if (patron === patrones[1]) {
            downloadUrl = match[1];
            latestVersion = match[2];
            break;
          } else if (patron === patrones[2]) {
            latestVersion = match[1];
          } else if (patron === patrones[3]) {
            downloadUrl = match[1];
          }
        }
      }
      
      // Si no se pudo extraer la versión, intentamos con DOMParser como fallback
      if (!latestVersion) {
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          const updatecheckElement = xmlDoc.querySelector('updatecheck');
          if (updatecheckElement) {
            latestVersion = updatecheckElement.getAttribute('version');
            if (!downloadUrl) {
              downloadUrl = updatecheckElement.getAttribute('codebase');
            }
          }
        } catch (parseError) {
          console.error('Error al parsear XML con DOMParser:', parseError);
        }
      }
      
      // Si todavía no tenemos versión, usamos la versión actual + 0.0.1 como fallback
      if (!latestVersion) {
        const currentVersion = chrome.runtime.getManifest().version;
        const versionParts = currentVersion.split('.').map(Number);
        versionParts[2] += 1; // Incrementar la versión de parche
        latestVersion = versionParts.join('.');
        console.warn(`No se pudo extraer la versión del XML. Usando versión calculada: ${latestVersion}`);
      }
      
      // Si no tenemos URL de descarga, usamos la URL del repositorio
      if (!downloadUrl) {
        downloadUrl = 'https://github.com/fvnks/proxy-scraper-extension/releases';
      }
      
      // Obtener la versión actual
      const currentVersion = chrome.runtime.getManifest().version;
      
      console.log(`Versión actual: ${currentVersion}, Última versión detectada: ${latestVersion}`);
      
      // Comparar versiones
      const isNewer = compareVersions(latestVersion, currentVersion) > 0;
      
      if (isNewer) {
        console.log('¡Hay una nueva versión disponible!');
        
        // Guardar información de actualización
        await chrome.storage.local.set({ 
          updateAvailable: true, 
          latestVersion: latestVersion,
          downloadUrl: downloadUrl
        });
        
        // Mostrar notificación solo si es una verificación automática y la API está disponible
        if (!forceCheck && chrome.notifications && typeof chrome.notifications.create === 'function') {
          try {
            chrome.notifications.create('update-available', {
              type: 'basic',
              iconUrl: '/icons/icon128.png',
              title: 'Actualización Disponible',
              message: `Hay una nueva versión disponible (v${latestVersion}). Haz clic para actualizar.`,
              buttons: [
                { title: 'Ver actualización' }
              ]
            });
          } catch (notifError) {
            console.error('Error al mostrar notificación:', notifError);
          }
        }
        
        return true;
      } else {
        console.log('Estás usando la versión más reciente.');
        await chrome.storage.local.set({ 
          updateAvailable: false,
          latestVersion: latestVersion
        });
        return false;
      }
    } catch (fetchError) {
      console.error('Error al obtener el archivo de actualizaciones:', fetchError);
      await chrome.storage.local.set({ 
        updateAvailable: false,
        updateError: 'Error al obtener información de actualización: ' + fetchError.message
      });
      return false;
    }
  } catch (error) {
    console.error('Error general al verificar actualizaciones:', error);
    // En caso de cualquier error, asumimos que no hay actualizaciones
    await chrome.storage.local.set({ 
      updateAvailable: false,
      updateError: error.message || 'Error desconocido'
    });
    return false;
  }
}

// Función para comparar versiones (retorna 1 si v1 > v2, -1 si v1 < v2, 0 si son iguales)
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// Función para descargar e instalar la actualización
async function downloadAndInstallUpdate() {
  try {
    const updateInfo = await chrome.storage.local.get(['downloadUrl']);
    if (updateInfo.downloadUrl) {
      // Abrir página de descarga en una nueva pestaña
      chrome.tabs.create({ url: updateInfo.downloadUrl });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al descargar actualización:', error);
    return false;
  }
}

// Establece un intervalo para verificar actualizaciones (cada 24 horas)
chrome.alarms.create('checkUpdateAlarm', {
  periodInMinutes: 24 * 60 // 24 horas
});

// Listener para verificar actualizaciones cuando se activa la alarma
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'checkUpdateAlarm') {
    checkForUpdates();
  }
});

// Listener para el clic en la notificación (verificar si existe primero)
if (chrome.notifications && chrome.notifications.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'update-available' && buttonIndex === 0) {
      downloadAndInstallUpdate();
    }
  });
} else {
  console.log('notifications.onButtonClicked no está disponible en este contexto');
  // Alternativa: crear un listener para chrome.action.onClicked si es necesario
  chrome.action.onClicked.addListener(() => {
    checkForUpdates(true);
  });
}

// Verificar actualizaciones al iniciar
checkForUpdates(); 