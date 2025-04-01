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
  const autoRotateCheckbox = document.getElementById('autoRotate');
  const rotationIntervalInput = document.getElementById('rotationInterval');
  const loadingElement = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');

  // Función para obtener la bandera del país basada en el código ISO
  function getCountryFlag(countryCode) {
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  }

  // Función para obtener el estado del proxy
  function getProxyStatus(proxy) {
    if (!proxy.verified) return 'unverified';
    if (!proxy.working) return 'inactive';
    return 'verified';
  }

  // Función para obtener el texto del estado
  function getStatusText(status) {
    switch (status) {
      case 'verified': return 'Verificado';
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
  function updateStatus(message, status = null, detail = '') {
    statusDisplay.textContent = message;
    statusMessageDisplay.textContent = detail;
    
    // Remover clases anteriores
    statusDisplay.classList.remove('status-verified', 'status-unverified', 'status-inactive');
    
    // Agregar nueva clase de estado
    if (status) {
      statusDisplay.classList.add(`status-${status}`);
    }
  }

  // Función para actualizar la interfaz de usuario
  async function updateUI() {
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
    
    // Actualizar estado y contador
    let statusMessage = 'Listo';
    let statusClass = '';
    let statusDetail = '';

    switch (status.status) {
      case 'green':
        statusMessage = 'Conectado';
        statusClass = 'verified';
        statusDetail = `Usando proxy: ${status.currentProxy?.proxy || 'Ninguno'}`;
        break;
      case 'yellow':
        statusMessage = 'Disponible';
        statusClass = 'unverified';
        statusDetail = `${status.workingProxies.length} proxies disponibles`;
        break;
      case 'red':
        statusMessage = 'Error de conexión';
        statusClass = 'inactive';
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

    // Actualizar proxy actual
    if (status.currentProxy) {
      currentProxyDisplay.innerHTML = `
        <div class="proxy-info">
          <span class="proxy-address">${status.currentProxy.proxy}</span>
          <span class="proxy-location">
            <img class="flag" src="${getCountryFlag(status.currentProxy.countryCode || 'us')}" alt="${status.currentProxy.country || 'Unknown'}">
            ${status.currentProxy.country || 'Unknown'}
          </span>
        </div>
      `;
      disconnectBtn.disabled = false;
    } else {
      currentProxyDisplay.textContent = 'Sin proxy seleccionado';
      disconnectBtn.disabled = true;
    }

    // Actualizar lista de proxies
    proxyList.innerHTML = '';
    for (const proxy of status.workingProxies) {
      const proxyElement = document.createElement('div');
      proxyElement.className = `proxy-item ${proxy.proxy === status.currentProxy?.proxy ? 'active' : ''}`;
      
      const proxyStatus = getProxyStatus(proxy);
      const isOnline = await checkProxyOnline(proxy);
      
      proxyElement.innerHTML = `
        <div class="proxy-info">
          <span class="proxy-address">${proxy.proxy}</span>
          <span class="proxy-location">
            <img class="flag" src="${getCountryFlag(proxy.countryCode || 'us')}" alt="${proxy.country || 'Unknown'}">
            ${proxy.country || 'Unknown'}
          </span>
        </div>
        <div class="proxy-status-container">
          <span class="proxy-status-badge status-${proxyStatus}">
            ${getStatusText(proxyStatus)}
          </span>
          <span class="proxy-status-badge ${isOnline ? 'status-verified' : 'status-inactive'}">
            ${isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      `;

      if (proxy.working && isOnline) {
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
    updateStatus('Conectando...', 'unverified', `Intentando conectar a ${proxy.proxy}`);
    
    try {
      const success = await chrome.runtime.sendMessage({
        action: 'setCurrentProxy',
        proxy: proxy
      });

      if (success) {
        await updateUI();
      } else {
        updateStatus('Error', 'inactive', 'No se pudo establecer la conexión');
        alert('Error al conectar al proxy');
      }
    } catch (error) {
      console.error('Error al seleccionar proxy:', error);
      updateStatus('Error', 'inactive', 'Error al conectar al proxy');
      alert('Error al conectar al proxy');
    } finally {
      loadingElement.classList.remove('active');
    }
  }

  // Event Listeners
  scrapeBtn.addEventListener('click', async () => {
    loadingElement.classList.add('active');
    loadingText.textContent = 'Buscando y verificando proxies...';
    updateStatus('Buscando proxies...', 'unverified', 'Obteniendo lista de proxies disponibles');
    
    try {
      updateStatus('Verificando proxies...', 'unverified', 'Comprobando funcionamiento de cada proxy');
      await chrome.runtime.sendMessage({ action: 'verifyProxies' });
      await updateUI();
    } catch (error) {
      console.error('Error al buscar proxies:', error);
      updateStatus('Error', 'inactive', 'No se pudieron obtener los proxies');
      alert('Error al buscar proxies');
    } finally {
      loadingElement.classList.remove('active');
    }
  });

  clearInactiveBtn.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres eliminar todos los proxies inactivos?')) {
      updateStatus('Limpiando proxies...', 'unverified', 'Eliminando proxies que no responden');
      await chrome.runtime.sendMessage({ action: 'clearInactiveProxies' });
      await updateUI();
    }
  });

  clearBtn.addEventListener('click', async () => {
    if (confirm('¿Estás seguro de que quieres limpiar todos los proxies?')) {
      updateStatus('Limpiando...', 'unverified', 'Eliminando todos los proxies');
      await chrome.runtime.sendMessage({ action: 'clearProxies' });
      await updateUI();
    }
  });

  disconnectBtn.addEventListener('click', async () => {
    updateStatus('Desconectando...', 'unverified', 'Volviendo a conexión directa');
    await chrome.runtime.sendMessage({ action: 'disconnectProxy' });
    await updateUI();
  });

  autoRotateCheckbox.addEventListener('change', async () => {
    const enabled = autoRotateCheckbox.checked;
    const interval = parseInt(rotationIntervalInput.value);
    rotationIntervalInput.disabled = !enabled;
    
    await chrome.runtime.sendMessage({
      action: 'toggleAutoRotate',
      enabled: enabled,
      interval: interval
    });
  });

  rotationIntervalInput.addEventListener('change', async () => {
    if (autoRotateCheckbox.checked) {
      const interval = parseInt(rotationIntervalInput.value);
      await chrome.runtime.sendMessage({
        action: 'toggleAutoRotate',
        enabled: true,
        interval: interval
      });
    }
  });

  // Actualizar UI inicial
  updateUI();
}); 