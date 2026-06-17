// ─── DB LAYER ───
const DB = {
  get(k) {
    try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
  },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

// ─── STATE ───
let currentPage = 'dashboard';
let editingId = null;
let saleItems = [];

// ─── SANITIZE ───
const esc = str => {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
};

// ─── DEBOUNCE ───
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ─── UTILS ───
const fmtMoney = n => '$' + (+n || 0).toFixed(2);
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ─── TOAST ───
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'fixed bottom-28 right-4 px-4 py-3 rounded-xl text-sm font-medium z-[999] transition-all duration-300 pointer-events-none max-w-xs shadow-lg ' +
    (type === 'error' ? 'bg-error text-white' : type === 'warning' ? 'bg-amber-600 text-white' : 'bg-[#1c1b20] text-white');
  t.style.transform = 'translateY(0)'; t.style.opacity = '1';
  setTimeout(() => { t.style.transform = 'translateY(20px)'; t.style.opacity = '0'; }, 2800);
}

// ─── CUSTOM CONFIRM ───
function showConfirm(msg) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-confirm');
    document.getElementById('confirm-msg').textContent = msg;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    const yes = document.getElementById('confirm-yes');
    const no = document.getElementById('confirm-no');
    const cleanup = () => {
      overlay.classList.add('hidden'); overlay.classList.remove('flex');
      yes.removeEventListener('click', onYes); no.removeEventListener('click', onNo);
    };
    const onYes = () => { cleanup(); resolve(true); };
    const onNo = () => { cleanup(); resolve(false); };
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
  });
}

// ─── NAVIGATION ───
function navigate(page) {
  console.log('navigate called with:', page);
  const navPage = page === 'cobrar' || page === 'pagar' ? 'finanzas' : page;
  currentPage = navPage;
  document.querySelectorAll('.nav-item').forEach(el => {
    const isActive = el.dataset.page === navPage;
    el.classList.toggle('active', isActive);
    const icon = el.querySelector('.material-symbols-outlined');
    if (isActive) {
      el.classList.remove('text-on-surface-variant/60');
      el.classList.add('text-primary');
      if (icon) icon.style.fontVariationSettings = "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    } else {
      el.classList.remove('text-primary');
      el.classList.add('text-on-surface-variant/60');
      if (icon) icon.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24";
    }
  });
  const titles = {
    dashboard: 'Dashboard', inventario: 'Inventario', clientes: 'Clientes',
    ventas: 'Ventas', cobrar: 'Cuentas por cobrar', pagar: 'Cuentas por pagar',
    finanzas: 'Finanzas',
  };
  const pt = document.getElementById('page-title');
  if (pt) pt.textContent = titles[page] || 'Dashboard';
  // Sync the finanzas tab state when navigating directly to cobrar/pagar
  const ftabEl = document.getElementById('ftab-state');
  if (ftabEl && (page === 'cobrar' || page === 'pagar')) ftabEl.dataset.ftab = page;
  const pages = { dashboard: renderDashboard, inventario: renderInventario, clientes: renderClientes, ventas: renderVentas, cobrar: renderFinanzas, pagar: renderFinanzas, finanzas: renderFinanzas };
  (pages[page] || renderDashboard)();
}

// ─── MODAL HELPERS ───
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById(id).classList.add('flex');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById(id).classList.remove('flex');
  editingId = null;
}

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
function renderDashboard() {
  const ventas = DB.get('ventas');
  const cobrar = DB.get('cobrar');
  const pagar = DB.get('pagar');
  const productos = DB.get('productos');
  const clientes = DB.get('clientes');
  const mes = today().slice(0, 7);
  const ventasMes = ventas.filter(v => v.fecha?.startsWith(mes));
  const totalMes = ventasMes.reduce((s, v) => s + (+v.total || 0), 0);
  const totalCobrar = cobrar.filter(c => c.estado !== 'Pagado').reduce((s, c) => s + (+c.monto || 0), 0);
  const totalPagar = pagar.filter(p => p.estado !== 'Pagado').reduce((s, p) => s + (+p.monto || 0), 0);
  const stockBajo = productos.filter(p => p.stock !== '' && p.stockMin !== '' && +p.stock <= +p.stockMin);
  const recent = [...ventas].sort((a, b) => b.fecha?.localeCompare(a.fecha)).slice(0, 5);
  const totalStock = productos.reduce((s, p) => s + (+p.stock || 0), 0);
  const totalClientes = clientes.length;

  // Trend vs last month
  const mesAnt = new Date(); mesAnt.setMonth(mesAnt.getMonth() - 1);
  const mesAntStr = mesAnt.toISOString().slice(0, 7);
  const totalMesAnt = ventas.filter(v => v.fecha?.startsWith(mesAntStr)).reduce((s, v) => s + (+v.total || 0), 0);
  const trendPct = totalMesAnt > 0 ? Math.round(((totalMes - totalMesAnt) / totalMesAnt) * 100) : 0;

  document.getElementById('content').innerHTML = `
    <section class="mb-xl">
      <h2 class="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Hola Mi Reina</h2>
      <p class="font-body-md text-body-md text-on-surface-variant">As\u00ED va tu negocio hoy.</p>
    </section>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-md">
      <div class="md:col-span-2 glass-card rounded-xl p-md flex flex-col justify-between overflow-hidden relative custom-shadow">
        <div class="relative z-10">
          <div class="flex justify-between items-start mb-md">
            <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">VENTAS DEL MES</span>
            <div class="bg-success-bg text-success px-sm py-xs rounded-full flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">trending_up</span>
              <span class="font-label-sm text-label-sm">${trendPct >= 0 ? '+' : ''}${trendPct}%</span>
            </div>
          </div>
          <div class="mb-lg">
            <span class="font-display text-display text-primary">${fmtMoney(totalMes)}</span>
          </div>
          <div class="flex gap-sm">
            <div class="h-1 flex-1 bg-primary rounded-full"></div>
            <div class="h-1 flex-1 bg-primary/40 rounded-full"></div>
            <div class="h-1 flex-1 bg-primary/20 rounded-full"></div>
            <div class="h-1 flex-1 bg-primary/10 rounded-full"></div>
          </div>
        </div>
        <div class="absolute -right-8 -bottom-8 opacity-5">
          <span class="material-symbols-outlined text-[160px]">payments</span>
        </div>
      </div>

      <div class="md:col-span-1 glass-card rounded-xl p-md custom-shadow ${stockBajo.length > 0 ? 'border border-tertiary/20' : ''}">
        <div class="flex items-center gap-sm mb-md ${stockBajo.length > 0 ? 'text-tertiary' : 'text-on-surface-variant'}">
          <span class="material-symbols-outlined">warning</span>
          <span class="font-label-md text-label-md font-bold">Stock Bajo</span>
        </div>
        ${stockBajo.length === 0
          ? '<p class="text-sm text-on-surface-variant text-center py-4">Todo en orden</p>'
          : `<div class="space-y-md">${stockBajo.slice(0, 3).map(p => `
            <div class="flex justify-between items-center">
              <div>
                <p class="font-label-md text-label-md text-on-surface">${esc(p.nombre)}</p>
                <p class="font-label-sm text-label-sm text-tertiary">Solo ${esc(p.stock)} unidades</p>
              </div>
              <button class="text-primary font-label-sm text-label-sm underline" data-nav="inventario">Reabastecer</button>
            </div>
          `).join('')}${stockBajo.length > 3 ? `<p class="text-xs text-on-surface-variant text-center pt-2">+${stockBajo.length - 3} m\u00E1s</p>` : ''}</div>`
        }
      </div>

      <div class="md:col-span-1 glass-card rounded-xl p-md bg-primary/10 custom-shadow">
        <div class="flex items-center gap-sm mb-sm text-primary">
          <span class="material-symbols-outlined">lightbulb</span>
          <span class="font-label-md text-label-md font-bold">Resumen</span>
        </div>
        <p class="font-body-md text-body-md italic mb-md text-on-surface">
          ${totalCobrar > 0 || totalPagar > 0
            ? `Tienes <strong>${fmtMoney(totalCobrar)}</strong> por cobrar y <strong>${fmtMoney(totalPagar)}</strong> por pagar.`
            : 'Sin cuentas pendientes. \u00A1Todo al d\u00EDa!'}
        </p>
      </div>

      <div class="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-md mt-sm">
        <button class="flex flex-col items-center justify-center p-md bg-white border border-outline-variant rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 group custom-shadow" data-nav="ventas">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-sm group-hover:bg-primary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">add_shopping_cart</span>
          </div>
          <span class="font-label-md text-label-md">Nueva Venta</span>
        </button>
        <button class="flex flex-col items-center justify-center p-md bg-white border border-outline-variant rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 group custom-shadow" data-nav="clientes">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-sm group-hover:bg-primary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">person_add</span>
          </div>
          <span class="font-label-md text-label-md">Clientes</span>
        </button>
        <button class="flex flex-col items-center justify-center p-md bg-white border border-outline-variant rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 group custom-shadow" data-nav="finanzas">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-sm group-hover:bg-primary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">receipt_long</span>
          </div>
          <span class="font-label-md text-label-md">Finanzas</span>
        </button>
        <button class="flex flex-col items-center justify-center p-md bg-white border border-outline-variant rounded-xl hover:border-primary hover:text-primary transition-all active:scale-95 group custom-shadow" data-nav="inventario">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-sm group-hover:bg-primary group-hover:text-white transition-colors">
            <span class="material-symbols-outlined">analytics</span>
          </div>
          <span class="font-label-md text-label-md">Inventario</span>
        </button>
      </div>

      <div class="md:col-span-3 glass-card rounded-xl p-md custom-shadow">
        <div class="flex justify-between items-center mb-lg">
          <h3 class="font-headline-md text-headline-md text-on-surface">\u00DAltimas Ventas</h3>
          <button class="text-primary font-label-md text-label-md" data-nav="ventas">Ver Todo</button>
        </div>
        ${recent.length === 0
          ? '<p class="text-sm text-on-surface-variant text-center py-4">Sin ventas registradas</p>'
          : `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm"><th class="pb-sm px-sm">FECHA</th><th class="pb-sm px-sm">CLIENTE</th><th class="pb-sm px-sm">PAGO</th><th class="pb-sm px-sm text-right">TOTAL</th></tr></thead><tbody class="font-body-md text-body-md">${recent.map(v => `
            <tr class="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
              <td class="py-md px-sm">${fmtDate(v.fecha)}</td>
              <td class="py-md px-sm">${esc(v.clienteNombre || v.cliente || (v.clienteId ? (clientes.find(c => c.id === v.clienteId)?.nombre || '') : '') || '\u2014')}</td>
              <td class="py-md px-sm"><span class="${v.pago === 'Cr\u00E9dito' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'} px-sm py-1 rounded-full text-xs font-bold uppercase">${esc(v.pago || 'Contado')}</span></td>
              <td class="py-md px-sm text-right font-bold text-on-surface">${fmtMoney(v.total)}</td>
            </tr>
          `).join('')}</tbody></table></div>`
        }
      </div>

      <div class="md:col-span-1 flex flex-col gap-md">
        <div class="flex-1 glass-card rounded-xl p-md custom-shadow flex flex-col justify-center items-center text-center">
          <span class="font-label-md text-label-md text-on-surface-variant mb-base">Productos</span>
          <span class="font-headline-lg text-headline-lg text-on-surface">${totalStock}</span>
          <div class="w-full h-2 bg-surface-container rounded-full mt-md overflow-hidden">
            <div class="h-full bg-secondary w-3/4 rounded-full"></div>
          </div>
        </div>
        <div class="flex-1 glass-card rounded-xl p-md custom-shadow flex flex-col justify-center items-center text-center">
          <span class="font-label-md text-label-md text-on-surface-variant mb-base">Clientes</span>
          <span class="font-headline-lg text-headline-lg text-on-surface">${totalClientes}</span>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════
//  INVENTARIO
// ══════════════════════════════════════
function renderInventario() {
  const productos = DB.get('productos');
  const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
  const filtro = document.getElementById('inv-filter-state')?.dataset.filter || 'todos';

  let filtered = [...productos];
  if (q) filtered = filtered.filter(p => p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q));
  if (filtro === 'low') filtered = filtered.filter(p => +p.stock > 0 && +p.stock <= +p.stockMin);
  else if (filtro === 'out') filtered = filtered.filter(p => !p.stock || +p.stock === 0);
  else if (filtro === 'asc') filtered.sort((a, b) => (+a.venta || 0) - (+b.venta || 0));
  else if (filtro.startsWith('cat:')) filtered = filtered.filter(p => p.categoria === filtro.slice(4));

  const cats = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  function chip(label, val) {
    return '<button class="px-md py-sm rounded-full font-label-md whitespace-nowrap active:scale-95 transition-transform ' +
      (filtro === val ? 'bg-primary-container text-on-primary-container' : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low') +
      '" data-filter="' + val + '">' + label + '</button>';
  }

  function card(p) {
    const stock = +p.stock || 0;
    const min = +p.stockMin || 0;
    const low = stock > 0 && stock <= min;
    const out = stock === 0;
    const badgeClass = out ? 'bg-error/10 text-error' : low ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success';
    const badgeText = out ? 'Sin Stock' : low ? 'Stock Bajo' : 'En Stock';
    const badgeCount = out ? '' : ' (' + stock + ')';
    const iconMap = { 'Uniformes m\u00E9dicos': 'medical_services', 'Chompa m\u00E9dica': 'checkroom', Pantal\u00F3n: 'checkroom', Camiseta: 'checkroom', Chaqueta: 'checkroom', Camisa: 'checkroom', Blusa: 'checkroom', Maquillaje: 'palette', Accesorios: 'watch' };
    const icon = iconMap[p.categoria] || 'inventory_2';
    const iconBg = out ? 'bg-gray-100' : low ? 'bg-warning-bg' : 'bg-success-bg';
    const iconColor = out ? 'text-gray-400' : low ? 'text-warning' : 'text-success';
    const imgSrc = p.imagen && p.imagen.startsWith('data:');
    return '<div class="group bg-surface border border-outline-variant rounded-xl p-md flex items-center gap-md hover:shadow-md transition-all cursor-pointer' + (out ? ' opacity-80' : '') + '">' +
      (imgSrc
        ? '<div class="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container-low"><img src="' + p.imagen + '" class="w-full h-full object-cover" loading="lazy"></div>'
        : '<div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ' + iconBg + '">' +
          '<span class="material-symbols-outlined ' + iconColor + '">' + icon + '</span>' +
        '</div>'
      ) +
      '<div class="flex-grow min-w-0">' +
        '<div class="flex justify-between items-start">' +
          '<h3 class="font-body-md font-semibold text-on-surface truncate">' + esc(p.nombre) + '</h3>' +
          '<span class="font-label-md text-primary">' + fmtMoney(p.venta) + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-sm mt-xs">' +
          '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ' + badgeClass + '">' + badgeText + badgeCount + '</span>' +
          '<span class="text-on-surface-variant text-[11px]">' + esc(p.categoria) + '</span>' +
          (p.marca ? '<span class="text-on-surface-variant text-[11px]">\u2022 ' + esc(p.marca) + '</span>' : '') +
          (p.color ? '<span class="text-on-surface-variant text-[11px]">\u2022 ' + esc(p.color) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="flex gap-1 shrink-0">' +
        '<button class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" data-edit="producto" data-id="' + p.id + '">' +
          '<span class="material-symbols-outlined text-lg text-on-surface-variant">edit</span></button>' +
        '<button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-delete="producto" data-id="' + p.id + '">' +
          '<span class="material-symbols-outlined text-lg text-error">delete</span></button>' +
      '</div>' +
    '</div>';
  }

  document.getElementById('content').innerHTML =
    '<section class="mb-lg space-y-md">' +
      '<div class="relative w-full">' +
        '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>' +
        '<input id="inv-search" class="w-full h-12 pl-12 pr-4 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md transition-all" placeholder="Buscar productos..." type="text" value="' + esc(q) + '">' +
      '</div>' +
      '<div class="flex gap-sm overflow-x-auto pb-1" style="scrollbar-width:none;-ms-overflow-style:none;">' +
        chip('Todos', 'todos') +
        chip('Stock Bajo', 'low') +
        chip('Sin Stock', 'out') +
        chip('Precio: \u2191', 'asc') +
        cats.map(function(c) { return chip(esc(c), 'cat:' + c); }).join('') +
      '</div>' +
    '</section>' +
    '<section class="space-y-sm">' +
      (filtered.length === 0
        ? '<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">inventory_2</span><p>' + (productos.length === 0 ? 'Sin productos a\u00FAn' : 'Sin resultados') + '</p></div>'
        : filtered.map(card).join('')
      ) +
    '</section>' +
    '<p class="text-xs text-on-surface-variant mt-2">' + filtered.length + ' producto(s)</p>';

  document.getElementById('inv-search')?.addEventListener('input', debounce(renderInventario, 250));
}

function openProductoForm(id) {
  editingId = id || null;
  const p = id ? DB.get('productos').find(x => x.id === id) : null;
  document.getElementById('modal-producto-title').textContent = p ? 'Editar producto' : 'Nuevo producto';
  ['p-nombre', 'p-marca', 'p-color', 'p-costo', 'p-venta', 'p-stock', 'p-stock-min', 'p-desc'].forEach(f => document.getElementById(f).value = '');
  document.getElementById('p-categoria').value = 'Uniformes médicos';
  removeProductImage();
  if (p) {
    document.getElementById('p-nombre').value = p.nombre || '';
    document.getElementById('p-marca').value = p.marca || '';
    document.getElementById('p-color').value = p.color || '';
    document.getElementById('p-categoria').value = p.categoria || 'Uniformes médicos';
    document.getElementById('p-costo').value = p.costo || '';
    document.getElementById('p-venta').value = p.venta || '';
    document.getElementById('p-stock').value = p.stock || '';
    document.getElementById('p-stock-min').value = p.stockMin || '';
    document.getElementById('p-desc').value = p.descripcion || '';
    if (p.imagen) {
      const img = document.getElementById('p-image-preview');
      img.src = p.imagen;
      img.classList.remove('hidden');
      document.getElementById('p-image-placeholder').classList.add('hidden');
      document.getElementById('p-image-text').classList.add('hidden');
      document.getElementById('p-image-remove').classList.remove('hidden');
    }
  }
  openModal('modal-producto');
}

function previewProductImage(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = document.getElementById('p-image-preview');
    img.src = ev.target.result;
    img.classList.remove('hidden');
    document.getElementById('p-image-placeholder').classList.add('hidden');
    document.getElementById('p-image-text').classList.add('hidden');
    document.getElementById('p-image-remove').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function removeProductImage() {
  const img = document.getElementById('p-image-preview');
  img.src = '';
  img.classList.add('hidden');
  document.getElementById('p-image-input').value = '';
  document.getElementById('p-image-placeholder').classList.remove('hidden');
  document.getElementById('p-image-text').classList.remove('hidden');
  document.getElementById('p-image-remove').classList.add('hidden');
}

function saveProducto() {
  const nombre = document.getElementById('p-nombre').value.trim();
  if (!nombre) { toast('El nombre es requerido', 'error'); return; }
  const producto = {
    id: editingId || uid(),
    nombre,
    marca: document.getElementById('p-marca').value.trim(),
    color: document.getElementById('p-color').value.trim(),
    categoria: document.getElementById('p-categoria').value,
    costo: document.getElementById('p-costo').value,
    venta: document.getElementById('p-venta').value,
    stock: document.getElementById('p-stock').value,
    stockMin: document.getElementById('p-stock-min').value,
    descripcion: document.getElementById('p-desc').value.trim(),
    imagen: document.getElementById('p-image-preview').src || '',
  };
  const lista = DB.get('productos');
  if (editingId) {
    const i = lista.findIndex(x => x.id === editingId);
    if (i >= 0) lista[i] = producto;
  } else {
    lista.push(producto);
  }
  DB.set('productos', lista);
  closeModal('modal-producto');
  toast(editingId ? 'Producto actualizado' : 'Producto agregado');
  renderInventario();
}

async function deleteProducto(id) {
  if (!await showConfirm('¿Eliminar este producto?')) return;
  DB.set('productos', DB.get('productos').filter(x => x.id !== id));
  toast('Producto eliminado');
  renderInventario();
}

// ══════════════════════════════════════
//  CLIENTES
// ══════════════════════════════════════
function renderClientes() {
  var clientes = DB.get('clientes');
  var cobrar = DB.get('cobrar');
  var mes = today().slice(0, 7);
  var totalDeuda = cobrar.filter(function(c) { return c.estado !== 'Pagado'; }).reduce(function(s, c) { return s + (+c.monto || 0); }, 0);
  var nuevosMes = clientes.filter(function(c) { return c.creado && c.creado.startsWith(mes); }).length;

  var deudas = {};
  cobrar.filter(function(c) { return c.estado !== 'Pagado'; }).forEach(function(c) {
    deudas[c.clienteId] = (deudas[c.clienteId] || 0) + (+c.monto || 0);
  });

  var q = (document.getElementById('cli-search') ? document.getElementById('cli-search').value : '').toLowerCase();
  var filtered = clientes.filter(function(c) { return !q || c.nombre.toLowerCase().includes(q) || (c.cedula || '').includes(q) || (c.telefono || '').includes(q); });

  function customerItem(c, idx) {
    var deuda = deudas[c.id] || 0;
    var hasDeuda = deuda > 0;
    return '<div class="p-md border-b border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer group">' +
      '<div class="flex items-center justify-between">' +
        '<div class="flex items-center gap-md">' +
          '<div class="w-12 h-12 rounded-full ' + avatarColors[idx % avatarColors.length] + ' flex items-center justify-center font-bold text-sm shrink-0">' + initials(c.nombre) + '</div>' +
          '<div>' +
            '<p class="font-headline-md text-body-lg font-semibold text-on-surface">' + esc(c.nombre) + '</p>' +
            '<p class="font-label-sm text-on-surface-variant flex items-center gap-xs">' +
              (c.telefono ? '<span class="material-symbols-outlined text-[14px]">call</span>' + esc(c.telefono) : '') +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="text-right">' +
          '<p class="font-headline-md ' + (hasDeuda ? 'text-error' : 'text-secondary') + '">' + (hasDeuda ? fmtMoney(deuda) : fmtMoney(0)) + '</p>' +
          '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ' + (hasDeuda ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container') + '">' + (hasDeuda ? 'Debe' : 'Al d\u00EDa') + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="flex items-center justify-end gap-1 mt-1">' +
        '<button class="p-1 rounded-lg hover:bg-primary/10 transition-colors" data-pdf="cliente" data-id="' + c.id + '" title="Exportar PDF">' +
          '<span class="material-symbols-outlined text-lg text-primary">description</span></button>' +
        '<button class="p-1 rounded-lg hover:bg-primary/10 transition-colors" data-edit="cliente" data-id="' + c.id + '">' +
          '<span class="material-symbols-outlined text-lg text-on-surface-variant">edit</span></button>' +
        '<button class="p-1 rounded-lg hover:bg-error/10 transition-colors" data-delete="cliente" data-id="' + c.id + '">' +
          '<span class="material-symbols-outlined text-lg text-error">delete</span></button>' +
      '</div>' +
    '</div>';
  }

  document.getElementById('content').innerHTML =
    '<section class="mb-lg">' +
      '<div class="relative group">' +
        '<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">' +
          '<span class="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">search</span></div>' +
        '<input id="cli-search" class="block w-full pl-10 pr-3 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-body-md text-on-surface placeholder:text-outline-variant transition-all outline-none" placeholder="Buscar por nombre, c\u00E9dula o tel\u00E9fono..." type="text" value="' + esc(q) + '">' +
      '</div>' +
    '</section>' +

    '<section class="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">' +
      '<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md transition-all hover:border-primary/30">' +
        '<div class="w-12 h-12 rounded-full bg-error-container/20 flex items-center justify-center text-error">' +
          '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">payments</span></div>' +
        '<div>' +
          '<p class="font-label-sm text-on-surface-variant uppercase tracking-wider">Total Pendiente</p>' +
          '<p class="font-headline-md text-error">' + fmtMoney(totalDeuda) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md transition-all hover:border-primary/30">' +
        '<div class="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">' +
          '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">group_add</span></div>' +
        '<div>' +
          '<p class="font-label-sm text-on-surface-variant uppercase tracking-wider">Nuevos Este Mes</p>' +
          '<p class="font-headline-md text-primary">+' + nuevosMes + ' Activo(s)</p>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<div class="flex justify-between items-center mb-md">' +
      '<h2 class="font-headline-md text-on-surface">Directorio de Clientes</h2>' +
      '<span class="text-primary font-label-sm text-label-sm">' + filtered.length + ' cliente(s)</span>' +
    '</div>' +

    '<div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">' +
      (filtered.length === 0
        ? '<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">group</span><p>' + (clientes.length === 0 ? 'Sin clientes a\u00FAn' : 'Sin resultados') + '</p></div>'
        : filtered.map(function(c, i) { return customerItem(c, i); }).join('')
      ) +
    '</div>';

  document.getElementById('cli-search')?.addEventListener('input', debounce(renderClientes, 250));
}

function openClienteForm(id) {
  editingId = id || null;
  const c = id ? DB.get('clientes').find(x => x.id === id) : null;
  document.getElementById('modal-cliente-title').textContent = c ? 'Editar cliente' : 'Nuevo cliente';
  ['c-nombre', 'c-cedula', 'c-telefono', 'c-email', 'c-direccion', 'c-notas'].forEach(f => document.getElementById(f).value = '');
  if (c) {
    document.getElementById('c-nombre').value = c.nombre || '';
    document.getElementById('c-cedula').value = c.cedula || '';
    document.getElementById('c-telefono').value = c.telefono || '';
    document.getElementById('c-email').value = c.email || '';
    document.getElementById('c-direccion').value = c.direccion || '';
    document.getElementById('c-notas').value = c.notas || '';
  }
  openModal('modal-cliente');
}

function saveCliente() {
  const nombre = document.getElementById('c-nombre').value.trim();
  if (!nombre) { toast('El nombre es requerido', 'error'); return; }
  const cliente = {
    id: editingId || uid(),
    nombre,
    cedula: document.getElementById('c-cedula').value.trim(),
    telefono: document.getElementById('c-telefono').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    direccion: document.getElementById('c-direccion').value.trim(),
    notas: document.getElementById('c-notas').value.trim(),
  };
  if (!editingId) cliente.creado = today();
  const lista = DB.get('clientes');
  if (editingId) { const i = lista.findIndex(x => x.id === editingId); if (i >= 0) lista[i] = cliente; }
  else { lista.push(cliente); }
  DB.set('clientes', lista);
  closeModal('modal-cliente');
  toast(editingId ? 'Cliente actualizado' : 'Cliente agregado');
  renderClientes();
}

async function deleteCliente(id) {
  if (!await showConfirm('¿Eliminar este cliente?')) return;
  DB.set('clientes', DB.get('clientes').filter(x => x.id !== id));
  toast('Cliente eliminado');
  renderClientes();
}

function exportClientePDF(id) {
  if (typeof window.jspdf === 'undefined') { toast('Error al cargar la librería PDF', 'error'); return; }
  const clientes = DB.get('clientes');
  const c = clientes.find(x => x.id === id);
  if (!c) { toast('Cliente no encontrado', 'error'); return; }

  const ventas = DB.get('ventas').filter(v => v.clienteId === id).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const cobrar = DB.get('cobrar').filter(x => x.clienteId === id);
  const totalComprado = ventas.reduce((s, v) => s + (+v.total || 0), 0);
  const efectivo = ventas.filter(v => v.pago !== 'Cr\u00E9dito').reduce((s, v) => s + (+v.total || 0), 0);
  const creditoPagado = cobrar.filter(x => x.estado === 'Pagado').reduce((s, x) => s + (+x.monto || 0), 0);
  const deudaPendiente = cobrar.filter(x => x.estado !== 'Pagado').reduce((s, x) => s + (+x.monto || 0), 0);
  const totalPagado = efectivo + creditoPagado;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const primary = [0, 62, 199];
  const primaryLight = [223, 227, 255];
  const surfaceLow = [242, 243, 255];
  const gray = [115, 118, 134];
  const secondary = [0, 110, 47];
  const secondaryLight = [107, 255, 143];
  const error = [186, 26, 26];

  // ── Receipt card background ──
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 10, contentW, 277, 6, 6, 'F');
  doc.setDrawColor(195, 197, 217);
  doc.roundedRect(margin, 10, contentW, 277, 6, 6, 'S');

  let x = margin + 10;
  let y = 24;
  const innerW = contentW - 20;

  // ── Header ──
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Glowup Store', x, y);
  y += 5;
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('REPORTE DE CLIENTE', x, y);

  // Customer & Receipt info
  y += 10;
  doc.setDrawColor(195, 197, 217);
  doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
  doc.roundedRect(x, y, innerW, 28, 4, 4, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(c.nombre || 'Sin nombre', x + 6, y + 8);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(gray[0], gray[1], gray[2]);

  let cX = x + 6;
  let cY = y + 18;
  if (c.cedula) { doc.text('C\u00E9dula: ' + c.cedula, cX, cY); cX += 55; }
  if (c.telefono) { doc.text('Tel: ' + c.telefono, cX, cY); cX += 55; }
  if (c.email) { doc.text(c.email, cX, cY); }

  cX = x + 6; cY += 5;
  if (c.direccion) { doc.text('Dir: ' + c.direccion, cX, cY); }

  y += 38;

  // Right-side info (date)
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Fecha', x + innerW - 40, 42);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(today(), x + innerW - 40, 49);

  // ── Stamp overlay (on top of card) ──
  if (deudaPendiente === 0 && totalPagado > 0) {
    doc.setTextColor(0, 110, 47);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text('PAGADO', x + innerW - 6, 52, { align: 'right', angle: -15 });
  } else if (deudaPendiente > 0) {
    doc.setTextColor(186, 26, 26);
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.text('PENDIENTE', x + innerW - 6, 52, { align: 'right', angle: -15 });
  }

  // ── Summary badges ──
  y += 2;
  const badgeW = (innerW - 8) / 3;
  function badge(cx, label, val, bg) {
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.roundedRect(cx, y, badgeW, 16, 4, 4, 'F');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.text(label, cx + 4, y + 5);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(val, cx + 4, y + 13);
  }
  badge(x, 'Compras', '' + ventas.length, primaryLight);
  badge(x + badgeW + 4, 'Pagado', '$' + totalPagado.toFixed(2), [232, 254, 232]);
  badge(x + (badgeW + 4) * 2, 'Pendiente', '$' + deudaPendiente.toFixed(2), [255, 218, 214]);

  y += 26;

  // ── Sales section ──
  if (ventas.length > 0) {
    doc.setDrawColor(195, 197, 217);
    doc.line(x, y, x + innerW, y);
    y += 2;

    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Historial de Compras', x, y += 6);

    // Table header
    y += 3;
    doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
    doc.rect(x, y, innerW, 6, 'F');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    const colFecha = x + 4;
    const colProd = colFecha + 24;
    const colPago = x + innerW - 36;
    const colTotal = x + innerW - 4;
    doc.text('FECHA', colFecha, y + 4);
    doc.text('PRODUCTO(s)', colProd, y + 4);
    doc.text('PAGO', colPago, y + 4);
    doc.text('TOTAL', colTotal, y + 4, { align: 'right' });
    y += 9;

    ventas.forEach(function(v) {
      if (y > 268) { doc.addPage(); y = 20; }
      const itemsStr = (v.items || []).map(function(it) { return it.nombre + ' x' + it.qty; }).join(', ');
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(fmtDate(v.fecha), colFecha, y);
      doc.text(itemsStr, colProd, y);
      doc.setTextColor(gray[0], gray[1], gray[2]);
      doc.text(v.pago || 'Contado', colPago, y);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('$' + (+v.total || 0).toFixed(2), colTotal, y, { align: 'right' });
      y += 6;
    });
    y += 4;
  }

  // ── Summary box ──
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 4;
  doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
  doc.roundedRect(x, y, innerW, 24, 4, 4, 'F');

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Subtotal comprado', x + 6, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('$' + totalComprado.toFixed(2), x + innerW - 6, y + 7, { align: 'right' });

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Total pagado', x + 6, y + 14);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(secondary[0], secondary[1], secondary[2]);
  doc.text('$' + totalPagado.toFixed(2), x + innerW - 6, y + 14, { align: 'right' });

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Deuda pendiente', x + 6, y + 21);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(error[0], error[1], error[2]);
  doc.text('$' + deudaPendiente.toFixed(2), x + innerW - 6, y + 21, { align: 'right' });

  y += 32;

  // ── Debts detail ──
  if (cobrar.length > 0) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Cuentas por Cobrar', x, y);
    y += 3;

    // Header
    doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
    doc.rect(x, y, innerW, 6, 'F');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    const dc1 = x + 4;
    const dc2 = x + innerW - 50;
    const dc3 = x + innerW - 28;
    const dc4 = x + innerW - 4;
    doc.text('CONCEPTO', dc1, y + 4);
    doc.text('VENCE', dc2, y + 4);
    doc.text('MONTO', dc3, y + 4);
    doc.text('ESTADO', dc4, y + 4, { align: 'right' });
    y += 9;

    cobrar.forEach(function(cb) {
      if (y > 268) { doc.addPage(); y = 20; }
      var venceStr = cb.vence;
      if (!venceStr && cb.fecha) {
        var fd = new Date(cb.fecha + 'T12:00:00');
        fd.setMonth(fd.getMonth() + 1);
        venceStr = fd.toISOString().slice(0, 10);
      }
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(cb.concepto || '', dc1, y);
      doc.setFontSize(8);
      doc.text(venceStr ? fmtDate(venceStr) : '\u2014', dc2, y);
      doc.setFont(undefined, 'bold');
      doc.text('$' + (+cb.monto || 0).toFixed(2), dc3, y);
      doc.setTextColor(cb.estado === 'Pagado' ? secondary[0] : error[0], cb.estado === 'Pagado' ? secondary[1] : error[1], cb.estado === 'Pagado' ? secondary[2] : error[2]);
      doc.setFont(undefined, 'bold');
      doc.text(cb.estado || 'Pendiente', dc4, y, { align: 'right' });
      y += 6;
    });
    y += 4;
  }

  // ── Footer ──
  if (y > 272) { doc.addPage(); y = 20; }
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 5;
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('Generado el ' + new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }), x, y);

  // Decorative dots
  const dotX = x + innerW / 2;
  doc.setFillColor(195, 197, 217);
  [-6, 0, 6].forEach(function(offset) {
    doc.circle(dotX + offset, y + 4, 1, 'F');
  });

  const blob = doc.output('blob');
  showPDFActions(blob, 'cliente_' + (c.nombre || 'cliente').replace(/\s+/g, '_') + '.pdf', c.nombre);
}

function exportVentaPDF(id) {
  if (typeof window.jspdf === 'undefined') { toast('Error al cargar la librer\u00EDa PDF', 'error'); return; }
  var ventas = DB.get('ventas');
  var v = ventas.find(function(x) { return x.id === id; });
  if (!v) { toast('Venta no encontrada', 'error'); return; }

  var cobrar = DB.get('cobrar').filter(function(x) { return x.ventaId === id; });
  var cuotasCount = cobrar.length;
  var montoCuota = cuotasCount > 0 ? (+v.total / cuotasCount) : 0;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const primary = [0, 62, 199];
  const surfaceLow = [242, 243, 255];
  const gray = [115, 118, 134];
  const secondary = [0, 110, 47];

  var x = margin + 10;
  var y = 24;
  const innerW = contentW - 20;

  // Receipt card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 10, contentW, 277, 6, 6, 'F');
  doc.setDrawColor(195, 197, 217);
  doc.roundedRect(margin, 10, contentW, 277, 6, 6, 'S');

  // Header
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Glowup Store', x, y);
  y += 5;
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('COMPROBANTE', x, y);

  // Client & sale info card
  y += 10;
  doc.setDrawColor(195, 197, 217);
  doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
  doc.roundedRect(x, y, innerW, 22, 4, 4, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(v.clienteNombre || 'Consumidor final', x + 6, y + 8);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Fecha: ' + fmtDate(v.fecha), x + 6, y + 16);
  doc.text('Pago: ' + (v.pago || 'Contado'), x + innerW - 6, y + 8, { align: 'right' });

  y += 30;

  // ── ITEMS table ──
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 2;
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Art\u00EDculos', x, y += 6);

  // Header
  y += 3;
  doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
  doc.rect(x, y, innerW, 6, 'F');
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(7);
  doc.setFont(undefined, 'bold');
  var c1 = x + 4;
  var c2 = x + innerW - 60;
  var c3 = x + innerW - 34;
  var c4 = x + innerW - 4;
  doc.text('PRODUCTO', c1, y + 4);
  doc.text('CANT', c2, y + 4);
  doc.text('PRECIO', c3, y + 4);
  doc.text('TOTAL', c4, y + 4, { align: 'right' });
  y += 9;

  (v.items || []).forEach(function(item) {
    if (y > 262) { doc.addPage(); y = 20; }
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(item.nombre || 'Producto', c1, y);
    doc.text('' + item.qty, c2, y);
    doc.text('$' + (+item.precio || 0).toFixed(2), c3, y);
    doc.setFont(undefined, 'bold');
    doc.text('$' + (+item.qty * +item.precio || 0).toFixed(2), c4, y, { align: 'right' });
    y += 7;
  });

  y += 2;

  // ── Total box ──
  if (y > 252) { doc.addPage(); y = 20; }
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 2;
  doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
  doc.roundedRect(x, y, innerW, 14, 4, 4, 'F');
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Total', x + 6, y + 9);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('$' + (+v.total || 0).toFixed(2), x + innerW - 6, y + 9, { align: 'right' });
  y += 22;

  // ── Installments info (if credit) ──
  if (cuotasCount > 0) {
    doc.setDrawColor(195, 197, 217);
    doc.line(x, y, x + innerW, y);
    y += 2;
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Detalle de Cuotas', x, y += 6);
    y += 2;

    // Header
    doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
    doc.rect(x, y, innerW, 6, 'F');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    var q1 = x + 4;
    var q2 = x + innerW - 50;
    var q3 = x + innerW - 4;
    doc.text('CUOTA', q1, y + 4);
    doc.text('VENCE', q2, y + 4);
    doc.text('MONTO', q3, y + 4, { align: 'right' });
    y += 9;

    cobrar.forEach(function(cb, i) {
      if (y > 268) { doc.addPage(); y = 20; }
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Cuota ' + (i + 1) + '/' + cuotasCount, q1, y);
      doc.text(cb.vence ? fmtDate(cb.vence) : '\u2014', q2, y);
      doc.setFont(undefined, 'bold');
      doc.text('$' + (+cb.monto || 0).toFixed(2), q3, y, { align: 'right' });
      y += 7;
    });
    y += 4;
  }

  // ── Footer ──
  if (y > 272) { doc.addPage(); y = 20; }
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 5;
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('Generado el ' + new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }), x, y);

  // Decorative dots
  doc.setFillColor(195, 197, 217);
  [-6, 0, 6].forEach(function(offset) {
    doc.circle(x + innerW / 2 + offset, y + 4, 1, 'F');
  });

  var blob = doc.output('blob');
  showPDFActions(blob, 'venta_' + (v.id || 'venta') + '.pdf', 'Venta');
}

function exportCobrarPDF(id) {
  if (typeof window.jspdf === 'undefined') { toast('Error al cargar la librer\u00EDa PDF', 'error'); return; }
  var cobrarList = DB.get('cobrar');
  var item = cobrarList.find(function(x) { return x.id === id; });
  if (!item) { toast('Registro no encontrado', 'error'); return; }

  var esCobrar = !item.proveedor;
  var nameField = esCobrar ? 'clienteNombre' : 'proveedor';
  var name = item[nameField] || '\u2014';

  // Calcular pendiente si pertenece a una venta con m\u00FAltiples cuotas
  var pendiente = 0;
  if (item.ventaId) {
    pendiente = cobrarList.filter(function(x) { return x.ventaId === item.ventaId && x.estado !== 'Pagado'; }).reduce(function(s, x) { return s + (+x.monto || 0); }, 0);
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const primary = [0, 62, 199];
  const surfaceLow = [242, 243, 255];
  const gray = [115, 118, 134];
  const secondary = [0, 110, 47];
  const error = [186, 26, 26];

  var x = margin + 10;
  var y = 24;
  const innerW = contentW - 20;

  // Receipt card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 10, contentW, 277, 6, 6, 'F');
  doc.setDrawColor(195, 197, 217);
  doc.roundedRect(margin, 10, contentW, 277, 6, 6, 'S');

  // Header
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Glowup Store', x, y);
  y += 5;
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(esCobrar ? 'COMPROBANTE DE COBRO' : 'COMPROBANTE DE PAGO', x, y);

  // Info card
  y += 10;
  doc.setDrawColor(195, 197, 217);
  doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
  doc.roundedRect(x, y, innerW, 20, 4, 4, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(name, x + 6, y + 8);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Fecha: ' + fmtDate(item.fecha), x + 6, y + 15);
  doc.text('Estado: ' + (item.estado || 'Pendiente'), x + innerW - 6, y + 8, { align: 'right' });

  y += 30;

  // Concepto
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 4;
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('Concepto', x, y);
  y += 4;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(item.concepto || '\u2014', x, y);
  y += 10;

  // Vence
  if (item.vence) {
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Vencimiento', x, y);
    y += 4;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(fmtDate(item.vence), x, y);
    y += 10;
  }

  // ── Amount box ──
  if (y > 252) { doc.addPage(); y = 20; }
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 2;
  doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
  doc.roundedRect(x, y, innerW, 12, 4, 4, 'F');
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text('Monto', x + 6, y + 8);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('$' + (+item.monto || 0).toFixed(2), x + innerW - 6, y + 8, { align: 'right' });
  y += 20;

  // ── Pending balance ──
  if (item.ventaId) {
    doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
    doc.roundedRect(x, y, innerW, 10, 4, 4, 'F');
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text('Saldo pendiente', x + 6, y + 7);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(pendiente > 0 ? error[0] : secondary[0], pendiente > 0 ? error[1] : secondary[1], pendiente > 0 ? error[2] : secondary[2]);
    doc.text('$' + pendiente.toFixed(2), x + innerW - 6, y + 7, { align: 'right' });
    y += 16;
  }

  // ── Related installments ──
  if (item.ventaId) {
    var hermanas = cobrarList.filter(function(x) { return x.ventaId === item.ventaId; });
    if (hermanas.length > 1) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setDrawColor(195, 197, 217);
      doc.line(x, y, x + innerW, y);
      y += 2;
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Cuotas Relacionadas', x, y += 6);
      y += 2;

      // Header
      doc.setFillColor(surfaceLow[0], surfaceLow[1], surfaceLow[2]);
      doc.rect(x, y, innerW, 6, 'F');
      doc.setTextColor(gray[0], gray[1], gray[2]);
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      var q1 = x + 4;
      var q2 = x + innerW - 50;
      var q3 = x + innerW - 4;
      doc.text('DESCRIPCI\u00D3N', q1, y + 4);
      doc.text('VENCE', q2, y + 4);
      doc.text('MONTO', q3, y + 4, { align: 'right' });
      y += 9;

      hermanas.forEach(function(h) {
        if (y > 268) { doc.addPage(); y = 20; }
        var isThis = h.id === item.id;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(isThis ? primary[0] : 0, isThis ? primary[1] : 0, isThis ? primary[2] : 0);
        doc.text((h.concepto || 'Cuota').substring(0, 30), q1, y);
        doc.text(h.vence ? fmtDate(h.vence) : '\u2014', q2, y);
        doc.setFont(undefined, isThis ? 'bold' : 'normal');
        doc.text('$' + (+h.monto || 0).toFixed(2), q3, y, { align: 'right' });
        if (isThis) {
          y += 3;
          doc.setTextColor(secondary[0], secondary[1], secondary[2]);
          doc.setFontSize(6);
          doc.text('\u2190 Este comprobante', q1, y);
          doc.setTextColor(0, 0, 0);
        }
        y += 5;
      });
      y += 4;
    }
  }

  // ── Footer ──
  if (y > 272) { doc.addPage(); y = 20; }
  doc.setDrawColor(195, 197, 217);
  doc.line(x, y, x + innerW, y);
  y += 5;
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(7);
  doc.setFont(undefined, 'normal');
  doc.text('Generado el ' + new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }), x, y);

  doc.setFillColor(195, 197, 217);
  [-6, 0, 6].forEach(function(offset) {
    doc.circle(x + innerW / 2 + offset, y + 4, 1, 'F');
  });

  var blob = doc.output('blob');
  showPDFActions(blob, (esCobrar ? 'cobro_' : 'pago_') + (item.id || '') + '.pdf', name);
}

function showPDFActions(blob, fileName, title) {
  var blobUrl = URL.createObjectURL(blob);

  var oldBar = document.getElementById('pdf-actions');
  if (oldBar) oldBar.remove();

  var bar = document.createElement('div');
  bar.id = 'pdf-actions';
  bar.className = 'fixed bottom-24 left-4 right-4 z-[999] bg-surface/90 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl shadow-xl p-3 flex items-center gap-2 animate-slide-up';
  bar.innerHTML =
    '<span class="text-sm font-semibold text-on-surface flex-1 truncate">' + esc(title) + '</span>' +
    '<button class="pdf-action-btn px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 flex items-center gap-1.5 text-sm font-medium" data-action="pdf-download">' +
      '<span class="material-symbols-outlined text-lg">download</span> Guardar</button>' +
    '<button class="pdf-action-btn px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 flex items-center gap-1.5 text-sm font-medium" data-action="pdf-print">' +
      '<span class="material-symbols-outlined text-lg">print</span> Imprimir</button>' +
    (navigator.share
      ? '<button class="pdf-action-btn px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1.5 text-sm font-medium" data-action="pdf-share">' +
        '<span class="material-symbols-outlined text-lg">share</span> Compartir</button>'
      : ''
    );

  document.body.appendChild(bar);

  bar.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;
    if (action === 'pdf-download') {
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      toast('PDF descargado');
    } else if (action === 'pdf-print') {
      var w = window.open(blobUrl);
      if (w) { w.onload = function() { w.print(); }; }
    } else if (action === 'pdf-share') {
      navigator.share({ files: [new File([blob], fileName, { type: 'application/pdf' })], title: fileName }).catch(function() {});
    }
    bar.remove();
  });

  setTimeout(function() {
    var closeHandler = function(ev) {
      if (!bar.contains(ev.target)) {
        bar.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 100);

  toast('PDF listo');
}

// ══════════════════════════════════════
//  VENTAS
// ══════════════════════════════════════
function initials(name) {
  if (!name) return 'CF';
  return name.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
}
var avatarColors = ['bg-surface-variant text-on-surface-variant', 'bg-primary-fixed text-on-primary-fixed', 'bg-tertiary-fixed text-on-tertiary-fixed', 'bg-secondary-fixed text-on-secondary-fixed'];

function renderVentas() {
  var ventas = DB.get('ventas');
  var mes = today().slice(0, 7);
  var ventasMes = ventas.filter(function(v) { return v.fecha && v.fecha.startsWith(mes); });
  var totalMes = ventasMes.reduce(function(s, v) { return s + (+v.total || 0); }, 0);
  var totalTrans = ventasMes.length;
  var promedio = totalTrans > 0 ? totalMes / totalTrans : 0;

  var d = new Date(); d.setMonth(d.getMonth() - 1);
  var totalMesAnt = ventas.filter(function(v) { return v.fecha && v.fecha.startsWith(d.toISOString().slice(0, 7)); }).reduce(function(s, v) { return s + (+v.total || 0); }, 0);
  var trendPct = totalMesAnt > 0 ? Math.round(((totalMes - totalMesAnt) / totalMesAnt) * 100) : 0;

  var dailyTotals = [];
  for (var i = 6; i >= 0; i--) {
    var dd = new Date(); dd.setDate(dd.getDate() - i);
    var ds = dd.toISOString().slice(0, 10);
    dailyTotals.push(ventas.filter(function(v) { return v.fecha === ds; }).reduce(function(s, v) { return s + (+v.total || 0); }, 0));
  }
  var maxDaily = Math.max.apply(null, dailyTotals) || 1;
  var dayLabels = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
  var todayIdx = new Date().getDay();
  var weekLabels = [];
  for (var i = 0; i < 7; i++) weekLabels.push(dayLabels[(todayIdx - 6 + i + 7) % 7]);

  var q = (document.getElementById('ven-search') ? document.getElementById('ven-search').value : '').toLowerCase();
  var filtered = [...ventas].sort(function(a, b) { return b.fecha && a.fecha ? b.fecha.localeCompare(a.fecha) : 0; }).filter(function(v) { return !q || (v.clienteNombre || '').toLowerCase().includes(q) || (v.notas || '').toLowerCase().includes(q) || (v.pago || '').toLowerCase().includes(q); });

  function transItem(v, idx) {
    var pago = v.pago || 'Contado';
    var completed = pago !== 'Cr\u00E9dito';
    var amtColor = completed ? 'text-secondary' : 'text-on-surface';
    var amtSign = completed ? '+' : '';
    var badgeClass = completed ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant';
    return '<div class="p-md flex items-center gap-md hover:bg-surface-container transition-colors cursor-pointer group">' +
      '<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ' + avatarColors[idx % avatarColors.length] + '">' + initials(v.clienteNombre) + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex justify-between items-start">' +
          '<h4 class="font-body-md text-body-md font-semibold text-on-surface truncate">' + esc(v.clienteNombre || 'Consumidor final') + '</h4>' +
          '<span class="font-body-md text-body-md font-bold ' + amtColor + '">' + amtSign + fmtMoney(v.total) + '</span>' +
        '</div>' +
        '<div class="flex justify-between items-center mt-1">' +
          '<p class="font-label-sm text-label-sm text-on-surface-variant">' + fmtDate(v.fecha) + '</p>' +
          '<div class="flex items-center gap-1">' +
            '<span class="px-sm py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ' + badgeClass + '">' + esc(pago) + '</span>' +
            '<button class="p-1 rounded-lg hover:bg-primary/10 transition-colors" data-pdf="venta" data-id="' + v.id + '" title="Exportar PDF">' +
              '<span class="material-symbols-outlined text-base text-primary">description</span></button>' +
            '<button class="p-1 rounded-lg hover:bg-error/10 transition-colors" data-delete="venta" data-id="' + v.id + '">' +
              '<span class="material-symbols-outlined text-base text-error">delete</span></button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  document.getElementById('content').innerHTML =
    '<div class="grid grid-cols-1 md:grid-cols-4 gap-md mb-lg">' +
      '<div class="md:col-span-2 bg-primary-container text-on-primary p-lg rounded-xl shadow-sm relative overflow-hidden group">' +
        '<div class="relative z-10">' +
          '<p class="font-label-md text-label-md opacity-80 mb-base">Total Ventas (Este Mes)</p>' +
          '<h2 class="font-display text-[32px] md:text-display font-bold mb-md">' + fmtMoney(totalMes) + '</h2>' +
          '<div class="flex items-center gap-xs text-secondary-fixed">' +
            '<span class="material-symbols-outlined text-sm">trending_up</span>' +
            '<span class="font-label-sm text-label-sm">' + (trendPct >= 0 ? '+' : '') + trendPct + '% vs mes anterior</span>' +
          '</div>' +
        '</div>' +
        '<div class="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125"></div>' +
      '</div>' +
      '<div class="bg-surface border border-outline-variant p-md rounded-xl flex items-center gap-md">' +
        '<div class="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg">' +
          '<span class="material-symbols-outlined text-primary">receipt_long</span></div>' +
        '<div>' +
          '<p class="font-label-sm text-label-sm text-on-surface-variant">Transacciones</p>' +
          '<p class="font-headline-md text-headline-md text-on-surface">' + totalTrans + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="bg-surface border border-outline-variant p-md rounded-xl flex items-center gap-md">' +
        '<div class="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg">' +
          '<span class="material-symbols-outlined text-primary">analytics</span></div>' +
        '<div>' +
          '<p class="font-label-sm text-label-sm text-on-surface-variant">Valor Promedio</p>' +
          '<p class="font-headline-md text-headline-md text-on-surface">' + fmtMoney(promedio) + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="flex gap-sm mb-lg overflow-x-auto pb-base" style="scrollbar-width:none;">' +
      '<button class="bg-primary text-on-primary px-lg py-sm rounded-full font-label-md text-label-md flex items-center gap-sm whitespace-nowrap active:scale-95 transition-transform" data-modal="modal-venta" data-new="venta">' +
        '<span class="material-symbols-outlined text-[20px]">add</span>Nueva Venta</button>' +
      '<div class="relative flex-1 min-w-0">' +
        '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>' +
        '<input id="ven-search" class="w-full h-[40px] pl-10 pr-3 rounded-full border border-outline-variant bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-md transition-all" placeholder="Buscar..." type="text" value="' + esc(q) + '">' +
      '</div>' +
    '</div>' +

    '<div class="bg-surface border border-outline-variant rounded-xl overflow-hidden mb-xl">' +
      '<div class="px-md py-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">' +
        '<h3 class="font-label-md text-label-md text-on-surface uppercase tracking-wider">Transacciones Recientes</h3>' +
        '<span class="text-primary font-label-sm text-label-sm">' + filtered.length + ' registro(s)</span>' +
      '</div>' +
      '<div class="divide-y divide-outline-variant">' +
        (filtered.length === 0
          ? '<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">payments</span><p>' + (ventas.length === 0 ? 'Sin ventas a\u00FAn' : 'Sin resultados') + '</p></div>'
          : filtered.map(function(v, i) { return transItem(v, i); }).join('')
        ) +
      '</div>' +
    '</div>' +

    '<div class="h-48 w-full bg-surface-container-low rounded-xl border border-outline-variant p-md flex flex-col">' +
      '<h3 class="font-label-sm text-label-sm text-on-surface-variant mb-md">Distribuci\u00F3n de Ventas (7 d\u00EDas)</h3>' +
      '<div class="flex-1 flex items-end gap-sm">' +
        dailyTotals.map(function(t) {
          var h = Math.round((t / maxDaily) * 100);
          return '<div class="bg-primary flex-1 rounded-t-sm transition-all duration-500" style="height:' + Math.max(h, 2) + '%"></div>';
        }).join('') +
      '</div>' +
      '<div class="flex justify-between mt-sm">' +
        weekLabels.map(function(l) { return '<span class="text-[10px] text-on-surface-variant font-medium">' + l + '</span>'; }).join('') +
      '</div>' +
    '</div>';

  document.getElementById('ven-search')?.addEventListener('input', debounce(renderVentas, 250));
}

function toggleCuotas() {
  const pago = document.getElementById('v-pago').value;
  document.getElementById('v-cuotas-container').classList.toggle('hidden', pago !== 'Crédito');
}

function openVentaForm() {
  saleItems = [];
  editingId = null;
  document.getElementById('v-fecha').value = today();
  document.getElementById('v-notas').value = '';
  document.getElementById('v-pago').value = 'Efectivo';
  document.getElementById('v-cuotas').value = 1;
  toggleCuotas();
  const sel = document.getElementById('v-cliente');
  sel.innerHTML = '<option value="">— Consumidor final —</option>' + DB.get('clientes').map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  renderSaleItems();
  openModal('modal-venta');
}

function addSaleItem() {
  saleItems.push({ productoId: '', nombre: '', qty: 1, precio: 0 });
  renderSaleItems();
}

function renderSaleItems() {
  const productos = DB.get('productos');
  const opts = productos.map(p => `<option value="${p.id}" data-precio="${p.venta}" data-nombre="${esc(p.nombre)}">${esc(p.nombre)} (${fmtMoney(p.venta)})</option>`).join('');
  const container = document.getElementById('sale-items');
  if (saleItems.length === 0) {
    container.innerHTML = '<p class="text-center py-4 text-on-surface-variant text-sm">Agrega al menos un producto</p>';
    updateSaleTotal();
    return;
  }
  container.innerHTML = saleItems.map((item, i) => `
    <div class="grid grid-cols-[1fr_60px_90px_30px] gap-2 items-center mb-2">
      <select class="px-2 py-1.5 border border-outline-variant rounded-lg text-sm bg-white" data-sel-idx="${i}">
        <option value="">Seleccionar...</option>${opts}
      </select>
      <input type="number" min="1" value="${item.qty}" class="px-2 py-1.5 border border-outline-variant rounded-lg text-sm w-full" data-qty-idx="${i}">
      <input type="number" value="${item.precio}" step="0.01" class="px-2 py-1.5 border border-outline-variant rounded-lg text-sm w-full" data-price-idx="${i}">
      <button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-remove-idx="${i}">
        <span class="material-symbols-outlined text-lg text-error">close</span>
      </button>
    </div>`).join('');
  // Restore values
  container.querySelectorAll('select').forEach(sel => {
    const idx = +sel.dataset.selIdx;
    if (saleItems[idx]?.productoId) sel.value = saleItems[idx].productoId;
  });
  updateSaleTotal();
}

function updateSaleTotal() {
  const total = saleItems.reduce((s, item) => s + (item.qty * item.precio), 0);
  document.getElementById('v-total').textContent = fmtMoney(total);
}

function saveVenta() {
  if (saleItems.length === 0) { toast('Agrega al menos un producto', 'error'); return; }
  const itemsValidos = saleItems.filter(i => i.productoId && i.qty > 0);
  if (itemsValidos.length === 0) { toast('Selecciona un producto válido', 'error'); return; }

  const clienteId = document.getElementById('v-cliente').value;
  const clientes = DB.get('clientes');
  const clienteNombre = clienteId ? (clientes.find(c => c.id === clienteId)?.nombre || '') : '';
  const total = itemsValidos.reduce((s, i) => s + i.qty * i.precio, 0);
  const pago = document.getElementById('v-pago').value;

  const venta = {
    id: uid(), fecha: document.getElementById('v-fecha').value,
    clienteId, clienteNombre, items: itemsValidos, total, pago,
    notas: document.getElementById('v-notas').value,
  };

  const productos = DB.get('productos');
  itemsValidos.forEach(item => {
    const p = productos.find(x => x.id === item.productoId);
    if (p && p.stock !== '') p.stock = Math.max(0, +p.stock - item.qty);
  });
  DB.set('productos', productos);

  const ventas = DB.get('ventas');
  ventas.push(venta);
  DB.set('ventas', ventas);

  if (pago === 'Crédito' && clienteId) {
    const cuotas = Math.max(1, parseInt(document.getElementById('v-cuotas').value) || 1);
    const montoCuota = +(total / cuotas).toFixed(2);
    const cobrar = DB.get('cobrar');
    const fechaBase = venta.fecha ? new Date(venta.fecha + 'T12:00:00') : new Date();
    for (let i = 0; i < cuotas; i++) {
      const vence = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i + 2, 0);
      cobrar.push({
        id: uid(), clienteId, clienteNombre,
        monto: i === cuotas - 1 ? +(total - montoCuota * (cuotas - 1)).toFixed(2) : montoCuota,
        fecha: venta.fecha, vence: vence.toISOString().slice(0, 10),
        concepto: `Cuota ${i + 1}/${cuotas} - ${itemsValidos.map(i => i.nombre).join(', ')}`,
        estado: 'Pendiente', ventaId: venta.id,
      });
    }
    DB.set('cobrar', cobrar);
  }

  closeModal('modal-venta');
  toast('Venta registrada');
  renderVentas();
}

async function deleteVenta(id) {
  if (!await showConfirm('¿Eliminar esta venta?')) return;
  const venta = DB.get('ventas').find(x => x.id === id);
  if (venta) {
    const productos = DB.get('productos');
    (venta.items || []).forEach(item => {
      const p = productos.find(x => x.id === item.productoId);
      if (p && p.stock !== '') p.stock = +p.stock + item.qty;
    });
    DB.set('productos', productos);
  }
  DB.set('ventas', DB.get('ventas').filter(x => x.id !== id));
  DB.set('cobrar', DB.get('cobrar').filter(x => x.ventaId !== id));
  toast('Venta eliminada');
  renderVentas();
}

// ══════════════════════════════════════
//  CUENTAS POR COBRAR
// ══════════════════════════════════════
function renderFinanzas() {
  var ftab = document.getElementById('ftab-state')?.dataset.ftab || 'cobrar';
  var isCobrar = ftab === 'cobrar';
  var cobrar = DB.get('cobrar');
  var pagar = DB.get('pagar');
  var totalCobrar = cobrar.filter(function(c) { return c.estado !== 'Pagado'; }).reduce(function(s, c) { return s + (+c.monto || 0); }, 0);
  var totalPagar = pagar.filter(function(p) { return p.estado !== 'Pagado'; }).reduce(function(s, p) { return s + (+p.monto || 0); }, 0);

  var subEl = document.getElementById(isCobrar ? 'cobrar-tab' : 'pagar-tab');
  var sub = (subEl ? subEl.dataset.tab : null) || 'pendientes';
  var allData = isCobrar ? cobrar : pagar;
  var filtered = sub === 'pendientes'
    ? allData.filter(function(x) { return x.estado !== 'Pagado'; })
    : allData.filter(function(x) { return x.estado === 'Pagado'; });

  var searchId = isCobrar ? 'cobrar-search' : 'pagar-search';
  var q = (document.getElementById(searchId) ? document.getElementById(searchId).value : '').toLowerCase();
  var nameField = isCobrar ? 'clienteNombre' : 'proveedor';
  filtered = filtered.filter(function(x) {
    return !q || (x[nameField] || '').toLowerCase().includes(q) || (x.concepto || '').toLowerCase().includes(q);
  });

  function invoiceCard(item) {
    var name = item[nameField] || '\u2014';
    var vencido = item.vence && item.vence < today() && item.estado !== 'Pagado';
    var isPaid = item.estado === 'Pagado';
    var statusClass = isPaid ? 'bg-secondary-container text-on-secondary-container' : vencido ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface-variant border border-outline-variant';
    var statusDot = isPaid ? 'bg-secondary' : vencido ? 'bg-error' : 'bg-outline';
    var statusText = isPaid ? 'Pagado' : vencido ? 'Vencido' : 'Pendiente';
    var actionLabel = isCobrar ? 'Cobrar' : 'Pagar';
    var actionAttr = isCobrar ? 'cobrar' : 'pagar';
    var concept = item.concepto ? esc(item.concepto) : '';
    var venceStr = item.vence ? 'Vence: ' + fmtDate(item.vence) : '';
    var subtitle = concept + (concept && venceStr ? ' \u2022 ' : '') + venceStr;
    if (!subtitle) subtitle = fmtDate(item.fecha);

    return '<div class="p-md bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col gap-sm">' +
      '<div class="flex justify-between items-start">' +
        '<div>' +
          '<p class="font-headline-md text-headline-md text-on-surface">' + esc(name) + '</p>' +
          '<p class="font-label-sm text-label-sm text-on-surface-variant">' + subtitle + '</p>' +
        '</div>' +
        '<div class="px-sm py-xs rounded-full flex items-center gap-xs ' + statusClass + '">' +
          '<div class="w-1.5 h-1.5 rounded-full ' + statusDot + '"></div>' +
          '<span class="text-[10px] font-bold uppercase">' + statusText + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="flex justify-between items-center mt-xs">' +
        '<p class="font-headline-md text-headline-md text-on-surface">' + fmtMoney(item.monto) + '</p>' +
        '<div class="flex gap-1">' +
          (!isPaid
            ? '<button class="bg-primary-container text-on-primary px-md py-sm rounded-xl font-label-md text-label-md hover:bg-primary active:scale-95 transition-all shadow-sm" data-action="' + actionAttr + '" data-id="' + item.id + '">' +
                '<span class="material-symbols-outlined text-sm align-middle">check</span> ' + actionLabel + '</button>'
            : ''
          ) +
          '<button class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" data-pdf="' + actionAttr + '" data-id="' + item.id + '" title="PDF">' +
            '<span class="material-symbols-outlined text-lg text-primary">description</span></button>' +
          '<button class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" data-edit="' + actionAttr + '" data-id="' + item.id + '">' +
            '<span class="material-symbols-outlined text-lg text-on-surface-variant">edit</span></button>' +
          '<button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-delete="' + actionAttr + '" data-id="' + item.id + '">' +
            '<span class="material-symbols-outlined text-lg text-error">delete</span></button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  document.getElementById('content').innerHTML =
    '<section class="mb-lg">' +
      '<h2 class="font-headline-md text-headline-md mb-md">Resumen de Flujo</h2>' +
      '<div class="grid grid-cols-2 gap-md">' +
        '<div class="p-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">' +
          '<p class="font-label-sm text-label-sm text-on-surface-variant mb-xs">Por Cobrar</p>' +
          '<p class="font-headline-md text-headline-md text-secondary">' + fmtMoney(totalCobrar) + '</p>' +
        '</div>' +
        '<div class="p-md bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">' +
          '<p class="font-label-sm text-label-sm text-on-surface-variant mb-xs">Por Pagar</p>' +
          '<p class="font-headline-md text-headline-md text-tertiary">' + fmtMoney(totalPagar) + '</p>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<div class="mb-lg">' +
      '<div class="flex p-1 bg-surface-container-high rounded-xl gap-1 mb-3">' +
        '<button class="flex-1 py-sm px-md rounded-lg font-label-md text-label-md transition-all duration-200 ' + (isCobrar ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant') + '" data-ftab="cobrar">Por Cobrar</button>' +
        '<button class="flex-1 py-sm px-md rounded-lg font-label-md text-label-md transition-all duration-200 ' + (!isCobrar ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant') + '" data-ftab="pagar">Por Pagar</button>' +
      '</div>' +
      '<div class="flex gap-2 mb-3 flex-wrap items-center">' +
        '<div class="flex gap-1 bg-surface-container-low p-1 rounded-xl">' +
          '<button class="px-3 py-1.5 text-sm rounded-lg font-medium transition-all ' + (sub === 'pendientes' ? 'bg-white shadow-sm' : 'text-on-surface-variant/60') + '" data-tab="' + (isCobrar ? 'cobrar' : 'pagar') + '" data-value="pendientes">' + (isCobrar ? 'Pendientes' : 'Pendientes') + ' (' + allData.filter(function(x) { return x.estado !== 'Pagado'; }).length + ')</button>' +
          '<button class="px-3 py-1.5 text-sm rounded-lg font-medium transition-all ' + (sub === 'pagadas' ? 'bg-white shadow-sm' : 'text-on-surface-variant/60') + '" data-tab="' + (isCobrar ? 'cobrar' : 'pagar') + '" data-value="pagadas">' + (isCobrar ? 'Cobradas' : 'Pagadas') + ' (' + allData.filter(function(x) { return x.estado === 'Pagado'; }).length + ')</button>' +
        '</div>' +
        '<div class="relative flex-1 min-w-[140px]">' +
          '<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>' +
          '<input type="search" id="' + searchId + '" placeholder="Buscar..." class="w-full pl-10 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" value="' + esc(q) + '">' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<section class="space-y-md">' +
      '<div class="flex justify-between items-center mb-sm">' +
        '<h3 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">' + (isCobrar ? 'Cuentas por Cobrar' : 'Cuentas por Pagar') + '</h3>' +
        '<span class="text-primary font-label-md text-label-md">' + filtered.length + ' registro(s)</span>' +
      '</div>' +
      (filtered.length === 0
        ? '<div class="text-center py-12 text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-xl"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">' + (isCobrar ? 'receipt_long' : 'account_balance') + '</span><p>' + (allData.length === 0 ? (isCobrar ? 'Sin cuentas por cobrar' : 'Sin cuentas por pagar') : 'Sin resultados') + '</p></div>'
        : filtered.map(function(item) { return invoiceCard(item); }).join('')
      ) +
    '</section>' +

    '<div class="mt-xl h-36 rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r from-primary/80 to-primary/40 flex flex-col justify-center items-center text-white text-center">' +
      '<p class="font-headline-md text-headline-md">Control Financiero</p>' +
      '<p class="text-sm text-white/80">Mant\u00E9n tus cuentas al d\u00EDa</p>' +
    '</div>';

  var searchEl = document.getElementById(searchId);
  if (searchEl) searchEl.addEventListener('input', debounce(renderFinanzas, 250));
}

function openCobrarForm(id) {
  editingId = id || null;
  const c = id ? DB.get('cobrar').find(x => x.id === id) : null;
  document.getElementById('modal-cobrar-title').textContent = c ? 'Editar cuenta por cobrar' : 'Nueva cuenta por cobrar';
  document.getElementById('cc-monto').value = c ? c.monto : '';
  document.getElementById('cc-concepto').value = c ? c.concepto : '';
  document.getElementById('cc-fecha').value = c ? c.fecha : today();
  document.getElementById('cc-vence').value = c ? c.vence : '';
  const sel = document.getElementById('cc-cliente');
  sel.innerHTML = '<option value="">Seleccionar...</option>' + DB.get('clientes').map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  if (c && c.clienteId) sel.value = c.clienteId;
  openModal('modal-cobrar');
}

function saveCuentaCobrar() {
  const clienteId = document.getElementById('cc-cliente').value;
  const monto = document.getElementById('cc-monto').value;
  if (!clienteId || !monto) { toast('Cliente y monto son requeridos', 'error'); return; }
  const clientes = DB.get('clientes');
  const cuenta = {
    id: editingId || uid(),
    clienteId,
    clienteNombre: clientes.find(c => c.id === clienteId)?.nombre || '',
    monto,
    fecha: document.getElementById('cc-fecha').value,
    vence: document.getElementById('cc-vence').value,
    concepto: document.getElementById('cc-concepto').value,
    estado: 'Pendiente',
  };
  const lista = DB.get('cobrar');
  if (editingId) {
    const i = lista.findIndex(x => x.id === editingId);
    if (i >= 0) {
      const old = lista[i];
      lista[i] = { ...old, ...cuenta, estado: old.estado };
      // Auto-recalcular cuotas hermanas si pertenece a una venta
      if (old.ventaId && old.estado !== 'Pagado') {
        const hermanas = lista.filter(function(x) { return x.ventaId === old.ventaId && x.id !== editingId && x.estado !== 'Pagado'; });
        if (hermanas.length > 0) {
          var totalVenta = DB.get('ventas').find(function(v) { return v.id === old.ventaId; });
          var totalRef = totalVenta ? +totalVenta.total : hermanas.reduce(function(s, x) { return s + (+x.monto || 0); }, 0) + (+lista[i].monto || 0);
          var pagadasSum = lista.filter(function(x) { return x.ventaId === old.ventaId && x.estado === 'Pagado'; }).reduce(function(s, x) { return s + (+x.monto || 0); }, 0);
          var restante = totalRef - pagadasSum - (+lista[i].monto || 0);
          var montoHermana = +(restante / hermanas.length).toFixed(2);
          hermanas.forEach(function(h, idx) {
            var j = lista.findIndex(function(x) { return x.id === h.id; });
            if (j >= 0) {
              lista[j].monto = idx === hermanas.length - 1 ? +(restante - montoHermana * (hermanas.length - 1)).toFixed(2) : montoHermana;
            }
          });
        }
      }
    }
  } else { lista.push(cuenta); }
  DB.set('cobrar', lista);
  closeModal('modal-cobrar');
  toast(editingId ? 'Cuenta actualizada' : 'Cuenta registrada');
  renderFinanzas();
}

function marcarCobrado(id) {
  const lista = DB.get('cobrar');
  const i = lista.findIndex(x => x.id === id);
  if (i >= 0) { lista[i].estado = 'Pagado'; lista[i].fechaPago = today(); }
  DB.set('cobrar', lista);
  toast('Marcada como cobrada');
  renderFinanzas();
}

async function deleteCobrar(id) {
  if (!await showConfirm('¿Eliminar esta cuenta?')) return;
  DB.set('cobrar', DB.get('cobrar').filter(x => x.id !== id));
  toast('Cuenta eliminada');
  renderFinanzas();
}

// ══════════════════════════════════════
//  CUENTAS POR PAGAR
// ══════════════════════════════════════
function openPagarForm(id) {
  editingId = id || null;
  const p = id ? DB.get('pagar').find(x => x.id === id) : null;
  document.getElementById('modal-pagar-title').textContent = p ? 'Editar cuenta por pagar' : 'Nueva cuenta por pagar';
  document.getElementById('cp-proveedor').value = p ? p.proveedor : '';
  document.getElementById('cp-monto').value = p ? p.monto : '';
  document.getElementById('cp-fecha').value = p ? p.fecha : today();
  document.getElementById('cp-vence').value = p ? p.vence : '';
  document.getElementById('cp-concepto').value = p ? p.concepto : '';
  openModal('modal-pagar');
}

function saveCuentaPagar() {
  const proveedor = document.getElementById('cp-proveedor').value.trim();
  const monto = document.getElementById('cp-monto').value;
  if (!proveedor || !monto) { toast('Proveedor y monto son requeridos', 'error'); return; }
  const cuenta = {
    id: editingId || uid(), proveedor, monto,
    fecha: document.getElementById('cp-fecha').value,
    vence: document.getElementById('cp-vence').value,
    concepto: document.getElementById('cp-concepto').value,
    estado: 'Pendiente',
  };
  const lista = DB.get('pagar');
  if (editingId) { const i = lista.findIndex(x => x.id === editingId); if (i >= 0) lista[i] = { ...lista[i], ...cuenta, estado: lista[i].estado }; }
  else { lista.push(cuenta); }
  DB.set('pagar', lista);
  closeModal('modal-pagar');
  toast(editingId ? 'Cuenta actualizada' : 'Cuenta registrada');
  renderFinanzas();
}

function marcarPagado(id) {
  const lista = DB.get('pagar');
  const i = lista.findIndex(x => x.id === id);
  if (i >= 0) { lista[i].estado = 'Pagado'; lista[i].fechaPago = today(); }
  DB.set('pagar', lista);
  toast('Marcada como pagada');
  renderFinanzas();
}

async function deletePagar(id) {
  if (!await showConfirm('¿Eliminar esta cuenta?')) return;
  DB.set('pagar', DB.get('pagar').filter(x => x.id !== id));
  toast('Cuenta eliminada');
  renderFinanzas();
}

// ══════════════════════════════════════
//  IMPORT / EXPORT
// ══════════════════════════════════════
function exportData() {
  const data = {
    productos: DB.get('productos'), clientes: DB.get('clientes'),
    ventas: DB.get('ventas'), cobrar: DB.get('cobrar'), pagar: DB.get('pagar'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `minegocios_backup_${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Datos exportados');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!await showConfirm('¿Importar datos? Esto reemplazará todos los datos actuales.')) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.productos) DB.set('productos', data.productos);
      if (data.clientes) DB.set('clientes', data.clientes);
      if (data.ventas) DB.set('ventas', data.ventas);
      if (data.cobrar) DB.set('cobrar', data.cobrar);
      if (data.pagar) DB.set('pagar', data.pagar);
      toast('Datos importados correctamente');
      navigate(currentPage);
    } catch { toast('Archivo inválido', 'error'); }
  };
  input.click();
}

function triggerFab() {
  if (currentPage === 'inventario') openProductoForm();
  else if (currentPage === 'clientes') openClienteForm();
  else if (currentPage === 'ventas') openVentaForm();
  else if (currentPage === 'finanzas') {
    const ftab = document.getElementById('ftab-state')?.dataset.ftab || 'cobrar';
    if (ftab === 'cobrar') openCobrarForm();
    else openPagarForm();
  }
}

// ══════════════════════════════════════
//  EVENT DELEGATION
// ══════════════════════════════════════
document.addEventListener('click', e => {
  const t = e.target.closest('[data-nav]');
  if (t) { console.log('nav click:', t.dataset.nav); e.preventDefault(); navigate(t.dataset.nav); return; }
  const fab = e.target.closest('[data-fab]');
  if (fab) { triggerFab(); return; }
  const pg = e.target.closest('[data-page]');
  if (pg) { e.preventDefault(); navigate(pg.dataset.page); return; }

  const modal = e.target.closest('[data-modal]');
  if (modal) {
    const type = modal.dataset.new;
    if (type === 'producto') openProductoForm();
    else if (type === 'cliente') openClienteForm();
    else if (type === 'venta') openVentaForm();
    else if (type === 'cobrar') openCobrarForm();
    else if (type === 'pagar') openPagarForm();
    return;
  }

  const edit = e.target.closest('[data-edit]');
  if (edit) {
    const type = edit.dataset.edit;
    if (type === 'producto') openProductoForm(edit.dataset.id);
    else if (type === 'cliente') openClienteForm(edit.dataset.id);
    else if (type === 'cobrar') openCobrarForm(edit.dataset.id);
    else if (type === 'pagar') openPagarForm(edit.dataset.id);
    return;
  }

  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) { closeModal(closeBtn.dataset.close); return; }

  const del = e.target.closest('[data-delete]');
  if (del) {
    const type = del.dataset.delete;
    if (type === 'producto') deleteProducto(del.dataset.id);
    else if (type === 'cliente') deleteCliente(del.dataset.id);
    else if (type === 'venta') deleteVenta(del.dataset.id);
    else if (type === 'cobrar') deleteCobrar(del.dataset.id);
    else if (type === 'pagar') deletePagar(del.dataset.id);
    return;
  }

  const pdfBtn = e.target.closest('[data-pdf]');
  if (pdfBtn) {
    const type = pdfBtn.dataset.pdf;
    if (type === 'cliente') exportClientePDF(pdfBtn.dataset.id);
    else if (type === 'venta') exportVentaPDF(pdfBtn.dataset.id);
    else if (type === 'cobrar' || type === 'pagar') exportCobrarPDF(pdfBtn.dataset.id);
    return;
  }

  const action = e.target.closest('[data-action]');
  if (action) {
    const type = action.dataset.action;
    if (type === 'cobrar') marcarCobrado(action.dataset.id);
    else if (type === 'pagar') marcarPagado(action.dataset.id);
    else if (type === 'export') exportData();
    else if (type === 'import') importData();
    return;
  }

  // Finanzas main tab switching
  const ftab = e.target.closest('[data-ftab]');
  if (ftab) {
    const el = document.getElementById('ftab-state');
    if (el) el.dataset.ftab = ftab.dataset.ftab;
    renderFinanzas();
    return;
  }

  // Inventory filter chips
  const invFiltro = e.target.closest('[data-filter]');
  if (invFiltro) {
    const el = document.getElementById('inv-filter-state');
    if (el) el.dataset.filter = invFiltro.dataset.filter;
    renderInventario();
    return;
  }

  // Sub-tab switching (pendientes/pagadas)
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    const key = tab.dataset.tab;
    const el = document.getElementById(key + '-tab') || tab;
    el.dataset.tab = tab.dataset.value;
    renderFinanzas();
    // Also sync the ftab-state for main finanzas tab
    const ftabEl = document.getElementById('ftab-state');
    if (ftabEl && key === 'cobrar') ftabEl.dataset.ftab = 'cobrar';
    else if (ftabEl && key === 'pagar') ftabEl.dataset.ftab = 'pagar';
    return;
  }

  // Modal overlay close (click outside)
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
    e.target.classList.remove('flex');
    editingId = null;
  }
});

// Sale items event delegation
document.addEventListener('change', e => {
  const sel = e.target.closest('[data-sel-idx]');
  if (sel) {
    const i = +sel.dataset.selIdx;
    const productos = DB.get('productos');
    const p = productos.find(x => x.id === sel.value);
    saleItems[i].productoId = sel.value;
    saleItems[i].nombre = p?.nombre || '';
    saleItems[i].precio = +(p?.venta || 0);
    renderSaleItems();
    return;
  }
  const qty = e.target.closest('[data-qty-idx]');
  if (qty) { saleItems[+qty.dataset.qtyIdx].qty = +qty.value || 1; updateSaleTotal(); return; }
  const price = e.target.closest('[data-price-idx]');
  if (price) { saleItems[+price.dataset.priceIdx].precio = +price.value || 0; updateSaleTotal(); return; }
});

document.addEventListener('click', e => {
  const rm = e.target.closest('[data-remove-idx]');
  if (rm) { saleItems.splice(+rm.dataset.removeIdx, 1); renderSaleItems(); }
});

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');

  document.getElementById('fab-add')?.addEventListener('click', triggerFab);

  // Export / Import via data-action delegation + direct buttons
  document.getElementById('btn-export')?.addEventListener('click', exportData);
  document.getElementById('btn-import')?.addEventListener('click', importData);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
});
