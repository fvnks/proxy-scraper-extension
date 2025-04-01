# Proxy Scraper y Gestor

Una extensión de Chrome para buscar, verificar y gestionar proxies HTTP.

## Características

- Búsqueda automática de proxies de múltiples fuentes
- Verificación de proxies en tiempo real
- Muestra la ubicación geográfica de cada proxy
- Rotación automática de proxies
- Interfaz intuitiva y fácil de usar
- **Nuevo: Persistencia de conexión** - El proxy permanece conectado incluso al cerrar el popup
- **Nuevo: Actualización automática** - La extensión puede actualizarse automáticamente cuando hay nuevas versiones

## Instalación

1. Clona este repositorio:
```bash
git clone https://github.com/fvnks/proxy-scraper-extension.git
```

2. Abre Chrome y ve a `chrome://extensions/`
3. Activa el "Modo desarrollador"
4. Haz clic en "Cargar descomprimida" y selecciona la carpeta `proxy-scraper-extension`

## Uso

1. Haz clic en el icono de la extensión en la barra de herramientas
2. Usa el botón "Buscar Nuevos Proxies" para encontrar proxies
3. Selecciona un proxy de la lista para conectarte
4. Usa el botón "Desconectar Proxy" para volver a conexión directa
5. Activa la "Rotación Automática" para cambiar de proxy periódicamente

## Actualizaciones

La extensión verifica automáticamente cada 6 horas si hay nuevas versiones disponibles. Cuando se encuentra una actualización, tienes tres opciones:

1. **Actualizar ahora**: Te llevará a la página de descarga donde puedes obtener la última versión
2. **Actualizar automáticamente**: Configura la extensión para que se actualice automáticamente en el futuro
3. **Ignorar**: Puedes ignorar la notificación y actualizar más tarde

Si has elegido la actualización automática, la extensión descargará e instalará automáticamente las nuevas versiones cuando estén disponibles.

## Notas de la versión

### Versión 1.0.1
- El proxy permanece conectado incluso al cerrar el popup
- Actualización automática de la extensión
- Mejoras en la interfaz y corrección de errores

### Versión 1.0.0
- Versión inicial

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría hacer.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles. 