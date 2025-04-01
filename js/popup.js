document.addEventListener('DOMContentLoaded', () => {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const clearBtn = document.getElementById('clearBtn');
  const clearInactiveBtn = document.getElementById('clearInactiveBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const proxyList = document.getElementById('proxyList');
  const currentProxyDisplay = document.getElementById('currentProxy');
  const statusDisplay = document.getElementById('status');
  const statusMessageDisplay = document.getElementById('statusMessage');
  const proxyCountDisplay = document.getElementById('proxyCount');
  const inactiveCountDisplay = document.getElementById('inactiveCount');
  const totalCountDisplay = document.getElementById('totalCount');
  const autoRotateCheckbox = document.getElementById('autoRotate');
  const rotationIntervalInput = document.getElementById('rotationInterval');
  const loadingElement = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const updateAvailableBadge = document.getElementById('updateAvailableBadge');
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const currentVersionElement = document.getElementById('currentVersion');
  const updateLink = document.getElementById('updateLink');
  const latestVersionElement = document.getElementById('latestVersion');

  // Función para obtener la bandera del país basada en el código ISO
  function getCountryFlag(countryCode) {
    if (!countryCode) return 'https://flagcdn.com/24x18/un.png';
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  }

  // Función para obtener el estado del proxy
  function getProxyStatus(proxy) {
    if (!proxy.verified) return 'unverified';
    if (!proxy.working) return 'inactive';
    return 'active';
  }

  // Función para obtener el texto del estado
  function getStatusText(status) {
    switch (status) {
      case 'active': return 'Activo';
      case 'unverified': return 'Sin verificar';
      case 'inactive': return 'Inactivo';
      default: return 'Desconocido';
    }
  }

  // Función para verificar si un proxy está online
  async function checkProxyOnline(proxy) {
    try {
      const [host, port] = proxy.proxy.split(':');
      const response = await fetch('https://api.ipify.org?format=json', {
        proxy: `http://${host}:${port}`,
        timeout: 3000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Función para obtener la ubicación de una IP
  async function getIPLocation(ip) {
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await response.json();
      return {
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city,
        region: data.region
      };
    } catch (error) {
      console.error('Error al obtener ubicación:', error);
      return null;
    }
  }

  // Función para actualizar el estado con mensaje detallado
  function updateStatus(message, status = 'idle', detail = '') {
    statusDisplay.textContent = message;
    statusMessageDisplay.textContent = detail;
    
    // Remover clases anteriores
    statusDisplay.classList.remove('status-connected', 'status-searching', 'status-error', 'status-idle');
    
    // Agregar nueva clase de estado
    statusDisplay.classList.add(`status-${status}`);
  }

  // Función para verificar actualizaciones manualmente
  async function checkForUpdatesManually() {
    checkUpdateBtn.classList.add('checking');
    checkUpdateBtn.disabled = true;
    checkUpdateBtn.innerHTML = '<i class="fas fa-sync"></i> Verificando...';
    
    try {
      // Enviar mensaje al background para verificar actualizaciones
      await chrome.runtime.sendMessage({ action: 'checkForUpdates', forceCheck: true });
      
      // Obtener el resultado después de un breve retraso
      setTimeout(async () => {
        await updateVersionInfo();
        checkUpdateBtn.classList.remove('checking');
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.innerHTML = '<i class="fas fa-sync"></i> Verificar Actualizaciones';
      }, 1500);
    } catch (error) {
      console.error('Error al verificar actualizaciones:', error);
      checkUpdateBtn.classList.remove('checking');
      checkUpdateBtn.disabled = false;
      checkUpdateBtn.innerHTML = '<i class="fas fa-sync"></i> Verificar Actualizaciones';
    }
  }

  // Función para actualizar manualmente
  async function updateManually() {
    try {
      // Enviar mensaje al background para descargar e instalar la actualización
      const result = await chrome.runtime.sendMessage({ action: 'downloadAndInstallUpdate' });
      if (result) {
        // La ventana se abrirá automáticamente con la página de descarga
        updateStatus('Actualizando...', 'searching', 'Descargando nueva versión...');
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      updateStatus('Error', 'error', 'No se pudo descargar la actualización');
    }
  }

  // Verificar si hay actualizaciones disponibles y actualizar la interfaz
  async function updateVersionInfo() {
    try {
      // Obtener la versión actual
      const manifest = chrome.runtime.getManifest();
      currentVersionElement.textContent = manifest.version;
      
      // Verificar si hay una actualización disponible
      const updateInfo = await chrome.storage.local.get(['updateAvailable', 'latestVersion', 'downloadUrl']);
      
      if (updateInfo.updateAvailable) {
        updateAvailableBadge.style.display = 'inline-block';
        updateAvailableBadge.textContent = `Nueva v${updateInfo.latestVersion}`;
        
        // Mostrar enlace de actualización
        latestVersionElement.textContent = updateInfo.latestVersion;
        updateLink.style.display = 'flex';
        updateLink.setAttribute('data-url', updateInfo.downloadUrl);
      } else {
        updateAvailableBadge.style.display = 'none';
        updateLink.style.display = 'none';
      }
    } catch (error) {
      console.error('Error al verificar actualizaciones:', error);
    }
  }

  // Función para actualizar la interfaz de usuario
  async function updateUI() {
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
    
    // Verificar actualizaciones
    await updateVersionInfo();
    
    // Actualizar estado y contador
    let statusMessage = 'Listo';
    let statusClass = 'idle';
    let statusDetail = '';

    switch (status.status) {
      case 'green':
        statusMessage = 'Conectado';
        statusClass = 'connected';
        statusDetail = `Usando proxy: ${status.currentProxy?.proxy || 'Ninguno'}`;
        break;
      case 'yellow':
        statusMessage = 'Disponible';
        statusClass = 'searching';
        statusDetail = `${status.workingProxies.length} proxies disponibles`;
        break;
      case 'red':
        statusMessage = 'Error';
        statusClass = 'error';
        statusDetail = 'El proxy actual no está respondiendo';
        break;
      default:
        statusMessage = 'Listo';
        statusDetail = 'Esperando acción...';
    }

    updateStatus(statusMessage, statusClass, statusDetail);

    // Contar proxies activos e inactivos
    const activeProxies = status.workingProxies.filter(p => p.working);
    const inactiveProxies = status.workingProxies.filter(p => !p.working);
    
    proxyCountDisplay.textContent = activeProxies.length;
    inactiveCountDisplay.textContent = inactiveProxies.length;
    totalCountDisplay.textContent = status.workingProxies.length;

    // Actualizar proxy actual
    if (status.currentProxy) {
      currentProxyDisplay.innerHTML = `
        <div class="proxy-info">
          <div class="proxy-address">${status.currentProxy.proxy}</div>
          <div class="proxy-location">
            <img class="flag" src="${getCountryFlag(status.currentProxy.countryCode)}" alt="${status.currentProxy.country || 'Desconocido'}">
            ${status.currentProxy.country || 'Desconocido'}
            ${status.currentProxy.city ? `, ${status.currentProxy.city}` : ''}
          </div>
        </div>
        <div class="proxy-status">
          <span class="status-indicator active"></span>
          <span class="status-text">Conectado</span>
        </div>
      `;
      disconnectBtn.disabled = false;
    } else {
      currentProxyDisplay.innerHTML = `
        <div class="proxy-info">
          <div class="proxy-address">Sin proxy seleccionado</div>
          <div class="proxy-ip">Conectado directamente</div>
        </div>
        <div class="proxy-status">
          <span class="status-indicator"></span>
          <span class="status-text">Desconectado</span>
        </div>
      `;
      disconnectBtn.disabled = true;
    }

    // Actualizar lista de proxies
    proxyList.innerHTML = '';
    
    if (status.workingProxies.length === 0) {
      proxyList.innerHTML = '<div class="empty-list">No hay proxies disponibles. Haz clic en "Buscar Proxies" para encontrar nuevos proxies.</div>';
      return;
    }
    
    for (const proxy of status.workingProxies) {
      const proxyElement = document.createElement('div');
      proxyElement.className = `proxy-item ${proxy.proxy === status.currentProxy?.proxy ? 'active' : ''}`;
      
      const proxyStatus = getProxyStatus(proxy);
      
      proxyElement.innerHTML = `
        <div class="proxy-info">
          <div class="proxy-address">${proxy.proxy}</div>
          <div class="proxy-location">
            <img class="flag" src="${getCountryFlag(proxy.countryCode)}" alt="${proxy.country || 'Desconocido'}">
            ${proxy.country || 'Desconocido'}
          </div>
        </div>
        <span class="proxy-status status-${proxyStatus}">
          ${getStatusText(proxyStatus)}
        </span>
      `;

      if (proxy.working) {
        proxyElement.addEventListener('click', () => selectProxy(proxy));
      }
      proxyList.appendChild(proxyElement);
    }

    // Actualizar estado de rotación automática
    autoRotateCheckbox.checked = status.autoRotate;
    rotationIntervalInput.disabled = !status.autoRotate;
  }

  // Función para seleccionar un proxy
  async function selectProxy(proxy) {
    loadingElement.classList.add('active');
    loadingText.textContent = 'Conectando al proxy...';
    updateStatus('Conectando...', 'searching', `Intentando conectar a ${proxy.proxy}`);
    
    try {
      const success = await chrome.runtime.sendMessage({
        action: 'setCurrentProxy',
        proxy: proxy
      });

      if (success) {
        await updateUI();
      } else {
        updateStatus('Error', 'error', 'No se pudo establecer la conexión');
        alert('Error al conectar al proxy');
      }
    } catch (error) {
      console.error('Error al seleccionar proxy:', error);
      updateStatus('Error', 'error', 'Error al conectar al proxy');
      alert('Error al conectar al proxy');
    } finally {
      loadingElement.classList.remove('active');
    }
  }

  // Event Listeners
  scrapeBtn.addEventListener('click', async () => {
    loadingElement.classList.add('active');
    loadingText.textContent = 'Buscando y verificando proxies...';
    updateStatus('Buscando proxies...', 'searching', 'Obteniendo lista de proxies disponibles');
    
    try {
      updateStatus('Verificando proxies...', 'searching', 'Comprobando funcionamiento de cada proxy');
      await chrome.runtime.sendMessage({ action: 'verifyProxies' });
      await updateUI();
    } catch (error) {
      console.error('Error al buscar proxies:', error);
      updateStatus('Error', 'error', 'No se pudieron obtener los proxies');
      alert('Error al buscar proxies');
    } finally {
      loadingElement.classList.remove('active');
    }
  });

  clearInactiveBtn.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres eliminar todos los proxies inactivos?')) {
      updateStatus('Limpiando proxies...', 'searching', 'Eliminando proxies que no responden');
      await chrome.runtime.sendMessage({ action: 'clearInactiveProxies' });
      await updateUI();
    }
  });

  clearBtn.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres limpiar todos los proxies?')) {
      updateStatus('Limpiando...', 'searching', 'Eliminando todos los proxies');
      await chrome.runtime.sendMessage({ action: 'clearProxies' });
      await updateUI();
    }
  });

  disconnectBtn.addEventListener('click', async () => {
    updateStatus('Desconectando...', 'searching', 'Volviendo a conexión directa');
    await chrome.runtime.sendMessage({ action: 'disconnectProxy' });
    await updateUI();
  });

  // Evento para verificar actualizaciones manualmente
  checkUpdateBtn.addEventListener('click', checkForUpdatesManually);
  
  // Evento para actualizar manualmente
  updateLink.addEventListener('click', (e) => {
    e.preventDefault();
    updateManually();
  });

  autoRotateCheckbox.addEventListener('change', async () => {
    const enabled = autoRotateCheckbox.checked;
    rotationIntervalInput.disabled = !enabled;
    
    if (enabled) {
      const interval = parseInt(rotationIntervalInput.value) || 5;
      await chrome.runtime.sendMessage({
        action: 'toggleAutoRotate',
        enabled: true,
        interval
      });
    } else {
      await chrome.runtime.sendMessage({
        action: 'toggleAutoRotate',
        enabled: false
      });
    }
  });

  rotationIntervalInput.addEventListener('change', async () => {
    if (autoRotateCheckbox.checked) {
      const interval = parseInt(rotationIntervalInput.value) || 5;
      await chrome.runtime.sendMessage({
        action: 'toggleAutoRotate',
        enabled: true,
        interval
      });
    }
  });

  // Actualizar la interfaz al cargar
  updateUI();
}); 