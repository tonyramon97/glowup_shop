# MiNegocio PWA

Aplicación de gestión para tienda de uniformes médicos y maquillaje.

## Módulos

- 📊 **Dashboard** — resumen de ventas del mes, cuentas por cobrar, stock bajo
- 📦 **Inventario** — productos con precio costo/venta, stock, alertas de stock mínimo
- 👥 **Clientes** — registro de clientes con datos de contacto
- 🧾 **Ventas** — registra ventas, descuenta stock automáticamente, soporta crédito
- 💰 **Cuentas por cobrar** — ventas a crédito y deudas de clientes
- 📤 **Cuentas por pagar** — pagos a proveedores

## Tecnología

- HTML + CSS + JavaScript puro (sin frameworks)
- `localStorage` para persistencia (sin servidor, sin costo)
- PWA con Service Worker (funciona offline)
- Compatible con Safari / iOS para instalar en pantalla de inicio

---

## 🚀 Despliegue en GitHub Pages

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "feat: MiNegocio PWA v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/minegocios.git
git push -u origin main
```

### 2. Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` / `/ (root)`
5. Clic en **Save**

Tu app estará disponible en:  
`https://TU_USUARIO.github.io/minegocios/`

> ⚠️ El Service Worker solo funciona en HTTPS, que GitHub Pages provee automáticamente.

---

## 📱 Instalar como PWA en iPhone (Safari)

1. Abre la URL de tu GitHub Pages en **Safari**
2. Toca el botón **Compartir** (cuadro con flecha hacia arriba)
3. Selecciona **"Añadir a pantalla de inicio"**
4. Escribe el nombre que quieras y toca **Agregar**
5. La app aparecerá en tu pantalla de inicio como una app nativa

> Los datos se guardan en el almacenamiento local del navegador de tu iPhone. No se sincronizan entre dispositivos.

---

## 📁 Estructura de archivos

```
minegocios/
├── index.html      ← Toda la app (HTML + CSS + JS)
├── manifest.json   ← Configuración PWA
├── sw.js           ← Service Worker (offline)
├── icon-192.png    ← Ícono para iOS/Android
├── icon-512.png    ← Ícono alta resolución
└── README.md       ← Este archivo
```

---

## 💾 Respaldo de datos

Los datos viven en `localStorage` del navegador. Para hacer un respaldo manual:

1. Abre la consola del navegador (`F12` o en Safari: Desarrollar → Consola)
2. Ejecuta:
```javascript
JSON.stringify({
  productos: JSON.parse(localStorage.getItem('productos')||'[]'),
  clientes: JSON.parse(localStorage.getItem('clientes')||'[]'),
  ventas: JSON.parse(localStorage.getItem('ventas')||'[]'),
  cobrar: JSON.parse(localStorage.getItem('cobrar')||'[]'),
  pagar: JSON.parse(localStorage.getItem('pagar')||'[]'),
})
```
3. Guarda el resultado en un archivo `.json`

---

## 🔧 Personalización

- Para cambiar el nombre del negocio: busca `"MiNegocio"` y `"Uniformes & Maquillaje"` en `index.html`
- Para cambiar el color principal: modifica `--accent: #7c6fcd` en el CSS (línea ~10)
- Para agregar categorías: busca los `<option>` en el modal de productos
