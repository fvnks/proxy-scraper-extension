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
let currentProxyIndex = -1; // Inicialmente sin proxy
let autoRotateInterval = null;
let proxyStatus = 'gray'; // gray, yellow, red, green

// Inicializar extensión
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['workingProxies', 'currentProxyIndex', 'autoRotate', 'rotationInterval'], (result) => {
    if (result.workingProxies) {
      workingProxies = result.workingProxies;
    }
    
    if (result.currentProxyIndex !== undefined) {
      currentProxyIndex = result.currentProxyIndex;
      // Restaurar la configuración del proxy
      updateProxyConfig();
    }
    
    updateIconColor();
    
    if (result.autoRotate) {
      startAutoRotation(result.rotationInterval || 5);
    }
  });
});

// También restaurar al inicio del navegador
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['workingProxies', 'currentProxyIndex', 'autoRotate', 'rotationInterval'], (result) => {
    if (result.workingProxies) {
      workingProxies = result.workingProxies;
    }
    
    if (result.currentProxyIndex !== undefined) {
      currentProxyIndex = result.currentProxyIndex;
      // Restaurar la configuración del proxy
      updateProxyConfig();
    }
    
    updateIconColor();
    
    if (result.autoRotate) {
      startAutoRotation(result.rotationInterval || 5);
    }
  });
});

// Actualizar color del icono según el estado del proxy
async function updateIconColor() {
  const iconSizes = [16, 48, 128];
  const iconColors = {
    gray: 'gray',
    yellow: 'yellow',
    red: 'red',
    green: 'green'
  };

  const color = iconColors[proxyStatus];
  
  for (const size of iconSizes) {
    const path = {
      16: `images/icon16-${color}.png`,
      48: `images/icon48-${color}.png`,
      128: `images/icon128-${color}.png`
    };
    
    await chrome.action.setIcon({
      path: path[size],
      tabId: null
    });
  }
}

// Verificar si el proxy actual está funcionando
async function checkProxyStatus() {
  if (workingProxies.length === 0 || currentProxyIndex === -1 || currentProxyIndex >= workingProxies.length) {
    proxyStatus = 'gray';
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
  const [host, port] = proxy.split(':');
  console.log(`Verificando proxy: ${proxy}`);
  
  try {
    // Verificar con múltiples sitios para mayor confiabilidad
    const testUrls = [
      'https://api.ipify.org?format=json',
      'https://www.google.com',
      'https://www.cloudflare.com'
    ];

    let working = false;
    let ip = null;
    let locationData = null;

    for (const url of testUrls) {
      try {
        const response = await fetch(url, {
          proxy: `http://${host}:${port}`,
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (response.ok) {
          working = true;
          if (url.includes('ipify.org')) {
            const data = await response.json();
            ip = data.ip;
            
            // Obtener información de ubicación
            try {
              const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`);
              locationData = await locationResponse.json();
              console.log(`Ubicación obtenida para ${proxy}: ${locationData.country_name}`);
            } catch (locationError) {
              console.log(`Error al obtener ubicación para ${proxy}:`, locationError);
            }
          }
          break; // Si un sitio funciona, no necesitamos verificar los demás
        }
      } catch (error) {
        console.log(`Error al verificar ${proxy} con ${url}:`, error);
      }
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
  }
  
  return {
    proxy,
    working: false,
    verified: true,
    error: 'Verificación fallida'
  };
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

// Iniciar rotación automática
function startAutoRotation(interval) {
  stopAutoRotation();
  autoRotateInterval = setInterval(() => {
    if (workingProxies.length > 0) {
      currentProxyIndex = (currentProxyIndex + 1) % workingProxies.length;
      updateProxyConfig();
      checkProxyStatus();
    }
  }, interval * 60 * 1000);
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
  if (workingProxies.length === 0 || currentProxyIndex === -1 || currentProxyIndex >= workingProxies.length) {
    // No hay proxies o índice inválido, configurar a modo directo
    chrome.proxy.settings.set({
      value: { mode: "direct" },
      scope: "regular"
    });
    proxyStatus = 'gray';
    updateIconColor();
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
  });
  
  // Actualizar el estado al conectar
  proxyStatus = 'green';
  updateIconColor();
  
  // Guardar el índice actual en el almacenamiento local
  chrome.storage.local.set({ currentProxyIndex });
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
  if (currentProxyIndex !== -1 && currentProxyIndex < workingProxies.length) {
    // El proxy actual es válido, lo desconectamos
    currentProxyIndex = -1;
    proxyStatus = 'gray';
    
    // Guardar el cambio en el almacenamiento local
    await chrome.storage.local.set({ currentProxyIndex });
    
    // Actualizar la configuración del proxy (conectará en modo directo)
    updateProxyConfig();
    return true;
  }
  return false;
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

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'scrapeProxies':
      scrapeProxies().then(sendResponse);
      return true;
    case 'verifyProxies':
      verifyProxies().then(sendResponse);
      return true;
    case 'clearProxies':
      clearProxies().then(sendResponse);
      return true;
    case 'clearInactiveProxies':
      clearInactiveProxies().then(sendResponse);
      return true;
    case 'toggleAutoRotate':
      toggleAutoRotate(request.enabled, request.interval).then(sendResponse);
      return true;
    case 'getStatus':
      sendResponse({
        workingProxies,
        currentProxy: workingProxies[currentProxyIndex],
        autoRotate: !!autoRotateInterval,
        status: proxyStatus
      });
      return true;
    case 'setCurrentProxy':
      setCurrentProxy(request.proxy).then(sendResponse);
      return true;
    case 'disconnectProxy':
      disconnectProxy().then(sendResponse);
      return true;
  }
});

// Establecer proxy actual manualmente
async function setCurrentProxy(proxy) {
  const index = workingProxies.findIndex(p => p.proxy === proxy.proxy);
  if (index !== -1) {
    currentProxyIndex = index;
    
    // Guardar el índice actual en el almacenamiento local
    await chrome.storage.local.set({ currentProxyIndex });
    
    // Actualizar la configuración del proxy
    updateProxyConfig();
    await checkProxyStatus();
    return true;
  }
  return false;
}

// Verificar actualizaciones
async function checkForUpdates() {
  try {
    console.log("Verificando actualizaciones...");
    const response = await fetch('https://raw.githubusercontent.com/fvnks/proxy-scraper-extension/main/updates.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const updateCheck = xmlDoc.querySelector('updatecheck');
    if (updateCheck) {
      const latestVersion = updateCheck.getAttribute('version');
      const currentVersion = chrome.runtime.getManifest().version;
      const downloadUrl = updateCheck.getAttribute('codebase');
      
      console.log(`Versión actual: ${currentVersion}, Última versión: ${latestVersion}`);
      
      if (latestVersion && latestVersion !== currentVersion) {
        // Guardar la información de actualización en almacenamiento local
        await chrome.storage.local.set({ 
          updateAvailable: true,
          latestVersion: latestVersion,
          downloadUrl: downloadUrl
        });
        
        // Verificar que el API de notificaciones esté disponible
        if (chrome.notifications) {
          // Mostrar notificación de actualización
          chrome.notifications.create('update-notification', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Nueva versión disponible',
            message: `Hay una nueva versión (${latestVersion}) de Proxy Scraper y Gestor disponible.`,
            buttons: [
              { title: 'Actualizar ahora' },
              { title: 'Actualizar automáticamente' }
            ],
            priority: 2,
            requireInteraction: true
          });
        } else {
          console.log(`Nueva versión disponible: ${latestVersion}`);
        }
        
        // Cambiar el color del icono para indicar que hay una actualización
        proxyStatus = 'yellow';
        updateIconColor();
        
        return true;
      } else {
        await chrome.storage.local.set({ updateAvailable: false });
        return false;
      }
    }
  } catch (error) {
    console.error('Error al verificar actualizaciones:', error);
    return false;
  }
}

// Descargar e instalar actualización
async function downloadAndInstallUpdate() {
  try {
    const updateInfo = await chrome.storage.local.get(['downloadUrl']);
    if (updateInfo.downloadUrl) {
      // Abrir la página de descarga en una nueva pestaña
      chrome.tabs.create({
        url: updateInfo.downloadUrl
      });
      
      // Mostrar instrucciones de instalación
      if (chrome.notifications) {
        chrome.notifications.create('install-instructions', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Instrucciones de instalación',
          message: 'Descarga la nueva versión y arrastra el archivo .crx a la página de extensiones de Chrome para instalarla. Si tienes problemas, descomprime el archivo y usa "Cargar descomprimida".',
          priority: 2
        });
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al descargar la actualización:', error);
    return false;
  }
}

// Verificar actualizaciones cada 6 horas en lugar de 24
chrome.alarms.create('checkUpdates', { periodInMinutes: 360 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkUpdates') {
    checkForUpdates().then(hasUpdate => {
      if (hasUpdate) {
        // Verificar si el usuario eligió actualizaciones automáticas
        chrome.storage.local.get(['autoUpdate'], result => {
          if (result.autoUpdate) {
            // Realizar actualización automática
            downloadAndInstallUpdate();
          }
        });
      }
    });
  }
});

// Verificar actualizaciones al iniciar
chrome.runtime.onStartup.addListener(() => {
  checkForUpdates().then(hasUpdate => {
    if (hasUpdate) {
      // Verificar si el usuario eligió actualizaciones automáticas
      chrome.storage.local.get(['autoUpdate'], result => {
        if (result.autoUpdate) {
          // Realizar actualización automática
          downloadAndInstallUpdate();
        }
      });
    }
  });
});

// También verificar al instalar/actualizar
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update' || details.reason === 'install') {
    setTimeout(() => {
      checkForUpdates();
    }, 5000); // Esperar 5 segundos después de la instalación
  }
});

// Escuchar clic en la notificación de actualización (solo si el API está disponible)
if (chrome.notifications && chrome.notifications.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'update-notification') {
      if (buttonIndex === 0) {
        // Actualizar ahora
        downloadAndInstallUpdate();
      } else if (buttonIndex === 1) {
        // Configurar actualizaciones automáticas
        chrome.storage.local.set({ autoUpdate: true });
        downloadAndInstallUpdate();
      }
    }
  });
} 