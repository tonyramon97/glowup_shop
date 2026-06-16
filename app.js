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
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
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
  const mes = today().slice(0, 7);
  const ventasMes = ventas.filter(v => v.fecha?.startsWith(mes));
  const totalMes = ventasMes.reduce((s, v) => s + (+v.total || 0), 0);
  const totalCobrar = cobrar.filter(c => c.estado !== 'Pagado').reduce((s, c) => s + (+c.monto || 0), 0);
  const totalPagar = pagar.filter(p => p.estado !== 'Pagado').reduce((s, p) => s + (+p.monto || 0), 0);
  const stockBajo = productos.filter(p => p.stock !== '' && p.stockMin !== '' && +p.stock <= +p.stockMin);
  const recent = [...ventas].sort((a, b) => b.fecha?.localeCompare(a.fecha)).slice(0, 5);

  const totalCobrarPct = totalCobrar + totalPagar > 0 ? (totalCobrar / (totalCobrar + totalPagar)) * 100 : 70;
  const totalPagarPct = 100 - totalCobrarPct;

  document.getElementById('content').innerHTML = `
    <section class="space-y-1">
      <h2 class="font-headline-lg text-headline-lg text-on-surface">Dashboard</h2>
      <p class="font-body-md text-on-surface-variant opacity-80">Resumen de tu negocio</p>
    </section>

    <div class="bento-grid">
      <div class="col-span-2 glass-card rounded-xl p-5 flex flex-col justify-between min-h-[160px]">
        <div class="flex justify-between items-start">
          <span class="font-label-md text-label-md uppercase text-on-surface-variant tracking-widest opacity-60">VENTAS DEL MES</span>
          <div class="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
            <span class="material-symbols-outlined">payments</span>
          </div>
        </div>
        <div>
          <div class="text-[36px] font-bold text-primary tracking-tight">${fmtMoney(totalMes)}</div>
          <div class="flex items-center gap-1.5 text-on-tertiary-fixed-variant font-medium mt-1">
            <span class="material-symbols-outlined text-sm">trending_up</span>
            <span class="text-sm">${ventasMes.length} transacciones</span>
          </div>
        </div>
      </div>
      <div class="glass-card rounded-xl p-5 flex flex-col justify-between min-h-[140px]">
        <div class="flex justify-between items-start">
          <span class="font-label-md text-label-md uppercase text-on-surface-variant tracking-widest opacity-60">STOCK BAJO</span>
          <span class="material-symbols-outlined text-error">inventory_2</span>
        </div>
        <div>
          <div class="font-headline-md text-headline-md text-error">${stockBajo.length} Items</div>
          <p class="text-xs text-on-surface-variant mt-1 font-medium">Requieren atención</p>
        </div>
      </div>
      <div class="glass-card rounded-xl p-5 flex flex-col justify-between min-h-[140px]">
        <div class="flex justify-between items-start">
          <span class="font-label-md text-label-md uppercase text-on-surface-variant tracking-widest opacity-60">POR COBRAR</span>
          <span class="material-symbols-outlined text-primary">receipt_long</span>
        </div>
        <div>
          <div class="font-headline-md text-headline-md">${fmtMoney(totalCobrar)}</div>
          <p class="text-xs text-on-surface-variant mt-1 font-medium">${cobrar.filter(c => c.estado !== 'Pagado').length} pendientes</p>
        </div>
      </div>
    </div>

    <section class="glass-card rounded-xl p-5 space-y-5">
      <div class="flex justify-between items-center">
        <h3 class="font-label-md text-label-md uppercase text-on-surface-variant tracking-widest opacity-60">CUENTAS OVERVIEW</h3>
        <span class="material-symbols-outlined text-on-surface-variant opacity-40">more_horiz</span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex-1 space-y-1">
          <p class="text-[11px] font-bold text-on-surface-variant/60 uppercase">POR COBRAR</p>
          <p class="text-xl font-bold text-on-tertiary-fixed-variant">${fmtMoney(totalCobrar)}</p>
        </div>
        <div class="w-px h-10 bg-outline-variant/30 mx-4"></div>
        <div class="flex-1 space-y-1 text-right">
          <p class="text-[11px] font-bold text-on-surface-variant/60 uppercase">POR PAGAR</p>
          <p class="text-xl font-bold text-error">${fmtMoney(totalPagar)}</p>
        </div>
      </div>
      <div class="w-full bg-surface-container-high/50 rounded-full h-2.5 flex overflow-hidden p-0.5 border border-white/40">
        <div class="bg-primary h-full rounded-full" style="width:${Math.round(totalCobrarPct)}%"></div>
        <div class="bg-error h-full rounded-full ml-1" style="width:${Math.round(totalPagarPct)}%"></div>
      </div>
    </section>

    <section class="glass-card rounded-xl p-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-label-md text-label-md uppercase text-on-surface-variant tracking-widest opacity-60">ÚLTIMAS VENTAS</h3>
        <button class="text-[11px] font-bold text-primary px-3 py-1 bg-primary/5 rounded-full" data-nav="ventas">VER TODO</button>
      </div>
      ${recent.length === 0
        ? '<p class="text-sm text-on-surface-variant text-center py-4">Sin ventas registradas</p>'
        : `<table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-on-surface-variant/60 uppercase tracking-wider"><th class="pb-3 font-bold">Fecha</th><th class="pb-3 font-bold">Total</th><th class="pb-3 font-bold">Pago</th></tr></thead><tbody>${recent.map(v => `<tr class="border-t border-outline-variant/20"><td class="py-2.5 text-sm">${fmtDate(v.fecha)}</td><td class="py-2.5 font-bold">${fmtMoney(v.total)}</td><td class="py-2.5"><span class="inline-block text-[11px] px-2.5 py-1 rounded-full font-bold ${v.pago === 'Crédito' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}">${esc(v.pago)}</span></td></tr>`).join('')}</tbody></table>`}
    </section>

    ${stockBajo.length > 0 ? `
    <section class="glass-card rounded-xl p-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-label-md text-label-md uppercase text-on-surface-variant tracking-widest opacity-60">⚠️ STOCK BAJO</h3>
        <button class="text-[11px] font-bold text-primary px-3 py-1 bg-primary/5 rounded-full" data-nav="inventario">VER TODO</button>
      </div>
      <table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-on-surface-variant/60 uppercase tracking-wider"><th class="pb-3 font-bold">Producto</th><th class="pb-3 font-bold">Stock</th><th class="pb-3 font-bold">Mínimo</th></tr></thead><tbody>${stockBajo.map(p => `<tr class="border-t border-outline-variant/20"><td class="py-2.5 font-medium">${esc(p.nombre)}</td><td class="py-2.5 text-error font-bold">${esc(p.stock)}</td><td class="py-2.5">${esc(p.stockMin)}</td></tr>`).join('')}</tbody></table>
    </section>` : ''}
  `;
}

// ══════════════════════════════════════
//  INVENTARIO
// ══════════════════════════════════════
function renderInventario() {
  const productos = DB.get('productos');
  const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
  const cat = document.getElementById('inv-cat')?.value || '';
  const filtered = productos.filter(p =>
    (!q || p.nombre.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q)) &&
    (!cat || p.categoria === cat)
  );

  document.getElementById('content').innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline-md font-headline-md" style="font-size:20px;line-height:28px;font-weight:600;">Inventario</h2>
      <button class="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-all active:scale-95" data-modal="modal-producto" data-new="producto">
        <span class="material-symbols-outlined text-lg">add</span>
        Nuevo
      </button>
    </div>

    <div class="flex gap-2 mb-4 flex-wrap">
      <div class="relative flex-1 min-w-[180px]">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
        <input type="search" id="inv-search" placeholder="Buscar producto..." class="w-full pl-10 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20" value="${esc(q)}">
      </div>
      <select id="inv-cat" class="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 min-w-[140px]">
        <option value="">Todas</option>
        <option value="Uniformes médicos" ${cat === 'Uniformes médicos' ? 'selected' : ''}>Uniformes médicos</option>
        <option value="Maquillaje" ${cat === 'Maquillaje' ? 'selected' : ''}>Maquillaje</option>
        <option value="Accesorios" ${cat === 'Accesorios' ? 'selected' : ''}>Accesorios</option>
        <option value="Otro" ${cat === 'Otro' ? 'selected' : ''}>Otro</option>
      </select>
    </div>

    <div class="glass-card-solid rounded-xl overflow-hidden">
      ${filtered.length === 0
        ? `<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">inventory_2</span><p>${productos.length === 0 ? 'Sin productos aún' : 'Sin resultados'}</p></div>`
        : `<table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-on-surface-variant/60 uppercase tracking-wider"><th class="px-4 py-3 font-bold">Producto</th><th class="px-4 py-3 font-bold">Categoría</th><th class="px-4 py-3 font-bold">Costo</th><th class="px-4 py-3 font-bold">Venta</th><th class="px-4 py-3 font-bold">Stock</th><th class="px-4 py-3"></th></tr></thead><tbody>${filtered.map(p => {
          const low = p.stock !== '' && p.stockMin !== '' && +p.stock <= +p.stockMin;
          return `<tr class="border-t border-outline-variant/20 hover:bg-primary/5 transition-colors"><td class="px-4 py-3"><div class="flex items-center gap-2">${low ? '<span class="w-2 h-2 rounded-full bg-error shrink-0"></span>' : ''}<div><span class="font-medium">${esc(p.nombre)}</span>${p.descripcion ? `<br><span class="text-on-surface-variant text-[12px]">${esc(p.descripcion)}</span>` : ''}</div></div></td><td class="px-4 py-3"><span class="text-[11px] px-2.5 py-1 rounded-full font-bold bg-primary/10 text-primary">${esc(p.categoria)}</span></td><td class="px-4 py-3">${fmtMoney(p.costo)}</td><td class="px-4 py-3 font-semibold">${fmtMoney(p.venta)}</td><td class="px-4 py-3"><span class="text-[11px] px-2.5 py-1 rounded-full font-bold ${low ? 'bg-error/10 text-error' : 'bg-green-50 text-green-700'}">${esc(p.stock)}</span></td><td class="px-4 py-3"><div class="flex gap-1"><button class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" data-edit="producto" data-id="${p.id}"><span class="material-symbols-outlined text-lg text-on-surface-variant">edit</span></button><button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-delete="producto" data-id="${p.id}"><span class="material-symbols-outlined text-lg text-error">delete</span></button></div></td></tr>`;
        }).join('')}</tbody></table>`}
    </div>
    <p class="text-xs text-on-surface-variant mt-2">${filtered.length} producto(s)</p>
  `;

  // Hook up debounced search
  document.getElementById('inv-search')?.addEventListener('input', debounce(renderInventario, 250));
  document.getElementById('inv-cat')?.addEventListener('change', renderInventario);
}

function openProductoForm(id) {
  editingId = id || null;
  const p = id ? DB.get('productos').find(x => x.id === id) : null;
  document.getElementById('modal-producto-title').textContent = p ? 'Editar producto' : 'Nuevo producto';
  ['p-nombre', 'p-costo', 'p-venta', 'p-stock', 'p-stock-min', 'p-desc'].forEach(f => document.getElementById(f).value = '');
  document.getElementById('p-categoria').value = 'Uniformes médicos';
  if (p) {
    document.getElementById('p-nombre').value = p.nombre || '';
    document.getElementById('p-categoria').value = p.categoria || 'Uniformes médicos';
    document.getElementById('p-costo').value = p.costo || '';
    document.getElementById('p-venta').value = p.venta || '';
    document.getElementById('p-stock').value = p.stock || '';
    document.getElementById('p-stock-min').value = p.stockMin || '';
    document.getElementById('p-desc').value = p.descripcion || '';
  }
  openModal('modal-producto');
}

function saveProducto() {
  const nombre = document.getElementById('p-nombre').value.trim();
  if (!nombre) { toast('El nombre es requerido', 'error'); return; }
  const producto = {
    id: editingId || uid(),
    nombre,
    categoria: document.getElementById('p-categoria').value,
    costo: document.getElementById('p-costo').value,
    venta: document.getElementById('p-venta').value,
    stock: document.getElementById('p-stock').value,
    stockMin: document.getElementById('p-stock-min').value,
    descripcion: document.getElementById('p-desc').value.trim(),
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
  const clientes = DB.get('clientes');
  const q = (document.getElementById('cli-search')?.value || '').toLowerCase();
  const filtered = clientes.filter(c => !q || c.nombre.toLowerCase().includes(q) || (c.cedula || '').includes(q) || (c.telefono || '').includes(q));

  document.getElementById('content').innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline-md font-headline-md" style="font-size:20px;line-height:28px;font-weight:600;">Clientes</h2>
      <button class="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-all active:scale-95" data-modal="modal-cliente" data-new="cliente">
        <span class="material-symbols-outlined text-lg">add</span>
        Nuevo
      </button>
    </div>
    <div class="relative mb-4">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
      <input type="search" id="cli-search" placeholder="Buscar por nombre, cédula o teléfono..." class="w-full pl-10 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20" value="${esc(q)}">
    </div>
    <div class="glass-card-solid rounded-xl overflow-hidden">
      ${filtered.length === 0
        ? `<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">group</span><p>${clientes.length === 0 ? 'Sin clientes aún' : 'Sin resultados'}</p></div>`
        : `<table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-on-surface-variant/60 uppercase tracking-wider"><th class="px-4 py-3 font-bold">Nombre</th><th class="px-4 py-3 font-bold">Cédula</th><th class="px-4 py-3 font-bold">Teléfono</th><th class="px-4 py-3 font-bold">Email</th><th class="px-4 py-3"></th></tr></thead><tbody>${filtered.map(c => `<tr class="border-t border-outline-variant/20 hover:bg-primary/5 transition-colors"><td class="px-4 py-3"><div><span class="font-medium">${esc(c.nombre)}</span>${c.notas ? `<br><span class="text-on-surface-variant text-[12px]">${esc(c.notas)}</span>` : ''}</div></td><td class="px-4 py-3">${c.cedula ? esc(c.cedula) : '—'}</td><td class="px-4 py-3">${c.telefono ? `<a href="tel:${esc(c.telefono)}" class="text-primary font-medium">${esc(c.telefono)}</a>` : '—'}</td><td class="px-4 py-3">${c.email ? esc(c.email) : '—'}</td><td class="px-4 py-3"><div class="flex gap-1"><button class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" data-edit="cliente" data-id="${c.id}"><span class="material-symbols-outlined text-lg text-on-surface-variant">edit</span></button><button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-delete="cliente" data-id="${c.id}"><span class="material-symbols-outlined text-lg text-error">delete</span></button></div></td></tr>`).join('')}</tbody></table>`}
    </div>
    <p class="text-xs text-on-surface-variant mt-2">${filtered.length} cliente(s)</p>
  `;
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

// ══════════════════════════════════════
//  VENTAS
// ══════════════════════════════════════
function renderVentas() {
  const ventas = DB.get('ventas');
  const q = (document.getElementById('ven-search')?.value || '').toLowerCase();
  const filtered = [...ventas].sort((a, b) => b.fecha?.localeCompare(a.fecha)).filter(v => !q || (v.clienteNombre || '').toLowerCase().includes(q) || (v.notas || '').toLowerCase().includes(q));

  document.getElementById('content').innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline-md font-headline-md" style="font-size:20px;line-height:28px;font-weight:600;">Ventas</h2>
      <button class="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-all active:scale-95" data-modal="modal-venta" data-new="venta">
        <span class="material-symbols-outlined text-lg">add</span>
        Nueva venta
      </button>
    </div>
    <div class="relative mb-4">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
      <input type="search" id="ven-search" placeholder="Buscar venta..." class="w-full pl-10 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20" value="${esc(q)}">
    </div>
    <div class="glass-card-solid rounded-xl overflow-hidden">
      ${filtered.length === 0
        ? `<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">payments</span><p>${ventas.length === 0 ? 'Sin ventas aún' : 'Sin resultados'}</p></div>`
        : `<table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-on-surface-variant/60 uppercase tracking-wider"><th class="px-4 py-3 font-bold">Fecha</th><th class="px-4 py-3 font-bold">Cliente</th><th class="px-4 py-3 font-bold">Productos</th><th class="px-4 py-3 font-bold">Total</th><th class="px-4 py-3 font-bold">Pago</th><th class="px-4 py-3"></th></tr></thead><tbody>${filtered.map(v => `<tr class="border-t border-outline-variant/20 hover:bg-primary/5 transition-colors"><td class="px-4 py-3">${fmtDate(v.fecha)}</td><td class="px-4 py-3">${v.clienteNombre ? esc(v.clienteNombre) : 'Consumidor final'}</td><td class="px-4 py-3 text-on-surface-variant text-[12px]">${(v.items || []).map(i => esc(i.nombre)).join(', ') || '—'}</td><td class="px-4 py-3 font-semibold">${fmtMoney(v.total)}</td><td class="px-4 py-3"><span class="text-[11px] px-2.5 py-1 rounded-full font-bold ${v.pago === 'Crédito' ? 'bg-amber-50 text-amber-700' : v.pago === 'Efectivo' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}">${esc(v.pago)}</span></td><td class="px-4 py-3"><button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-delete="venta" data-id="${v.id}"><span class="material-symbols-outlined text-lg text-error">delete</span></button></td></tr>`).join('')}</tbody></table>`}
    </div>
  `;
  document.getElementById('ven-search')?.addEventListener('input', debounce(renderVentas, 250));
}

function openVentaForm() {
  saleItems = [];
  editingId = null;
  document.getElementById('v-fecha').value = today();
  document.getElementById('v-notas').value = '';
  document.getElementById('v-pago').value = 'Efectivo';
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
    const cobrar = DB.get('cobrar');
    cobrar.push({
      id: uid(), clienteId, clienteNombre, monto: total,
      fecha: venta.fecha, vence: '',
      concepto: `Venta a crédito - ${itemsValidos.map(i => i.nombre).join(', ')}`,
      estado: 'Pendiente', ventaId: venta.id,
    });
    DB.set('cobrar', cobrar);
  }

  closeModal('modal-venta');
  toast('Venta registrada');
  renderVentas();
}

async function deleteVenta(id) {
  if (!await showConfirm('¿Eliminar esta venta?')) return;
  DB.set('ventas', DB.get('ventas').filter(x => x.id !== id));
  toast('Venta eliminada');
  renderVentas();
}

// ══════════════════════════════════════
//  CUENTAS POR COBRAR
// ══════════════════════════════════════
function renderFinanzas() {
  const ftab = document.getElementById('ftab-state')?.dataset.ftab || 'cobrar';
  const cobrarSub = document.getElementById('cobrar-tab')?.dataset.tab || 'pendientes';
  const pagarSub = document.getElementById('pagar-tab')?.dataset.tab || 'pendientes';
  const cobrar = DB.get('cobrar');
  const pagar = DB.get('pagar');
  const cobrarQ = (document.getElementById('cobrar-search')?.value || '').toLowerCase();
  const pagarQ = (document.getElementById('pagar-search')?.value || '').toLowerCase();
  const cobrarData = (cobrarSub === 'pendientes' ? cobrar.filter(c => c.estado !== 'Pagado') : cobrar.filter(c => c.estado === 'Pagado'))
    .filter(c => !cobrarQ || (c.clienteNombre || '').toLowerCase().includes(cobrarQ) || (c.concepto || '').toLowerCase().includes(cobrarQ));
  const pagarData = (pagarSub === 'pendientes' ? pagar.filter(p => p.estado !== 'Pagado') : pagar.filter(p => p.estado === 'Pagado'))
    .filter(p => !pagarQ || (p.proveedor || '').toLowerCase().includes(pagarQ) || (p.concepto || '').toLowerCase().includes(pagarQ));
  const cobrarTotal = cobrarData.reduce((s, c) => s + (+c.monto || 0), 0);
  const pagarTotal = pagarData.reduce((s, p) => s + (+p.monto || 0), 0);

  document.getElementById('content').innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-headline-md font-headline-md" style="font-size:20px;line-height:28px;font-weight:600;">Finanzas</h2>
      <div class="flex gap-1 bg-surface-container-low p-1 rounded-xl">
        <button class="px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${ftab === 'cobrar' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant/60 hover:text-on-surface'}" data-ftab="cobrar">Por cobrar</button>
        <button class="px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${ftab === 'pagar' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant/60 hover:text-on-surface'}" data-ftab="pagar">Por pagar</button>
      </div>
    </div>

    ${ftab === 'cobrar' ? `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-headline-sm font-headline-sm">Cuentas por cobrar</h3>
      <button class="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-all active:scale-95" data-modal="modal-cobrar" data-new="cobrar">
        <span class="material-symbols-outlined text-lg">add</span> Nueva
      </button>
    </div>
    <div class="flex gap-2 mb-4 flex-wrap items-center">
      <div class="flex gap-1 bg-surface-container-low p-1 rounded-xl">
        <button class="tab-btn px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${cobrarSub === 'pendientes' ? 'bg-white shadow-sm' : 'text-on-surface-variant/60 hover:text-on-surface'}" data-tab="cobrar" data-value="pendientes">Pendientes (${cobrar.filter(c => c.estado !== 'Pagado').length})</button>
        <button class="tab-btn px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${cobrarSub === 'pagadas' ? 'bg-white shadow-sm' : 'text-on-surface-variant/60 hover:text-on-surface'}" data-tab="cobrar" data-value="pagadas">Cobradas (${cobrar.filter(c => c.estado === 'Pagado').length})</button>
      </div>
      <div class="relative flex-1 min-w-[160px]">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
        <input type="search" id="cobrar-search" placeholder="Buscar..." class="w-full pl-10 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20">
      </div>
    </div>
    ${cobrarSub === 'pendientes' && cobrarData.length > 0 ? `<div class="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 inline-block"><span class="text-label-caps font-label-caps text-on-surface-variant">TOTAL POR COBRAR</span><div class="text-headline-md font-headline-md text-primary" style="font-size:20px;line-height:28px;font-weight:600;">${fmtMoney(cobrarTotal)}</div></div>` : ''}
    <div class="glass-card-solid rounded-xl overflow-hidden">
      ${cobrarData.length === 0
        ? `<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">receipt_long</span><p>${cobrarSub === 'pendientes' ? 'Sin cuentas pendientes' : 'Sin cuentas cobradas'}</p></div>`
        : `<table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-on-surface-variant/60 uppercase tracking-wider"><th class="px-4 py-3 font-bold">Cliente</th><th class="px-4 py-3 font-bold">Concepto</th><th class="px-4 py-3 font-bold">Monto</th><th class="px-4 py-3 font-bold">Vence</th><th class="px-4 py-3 font-bold">Estado</th><th class="px-4 py-3"></th></tr></thead><tbody>${cobrarData.map(c => {
          const vencido = c.vence && c.vence < today() && c.estado !== 'Pagado';
          return `<tr class="border-t border-outline-variant/20 hover:bg-primary/5 transition-colors"><td class="px-4 py-3 font-medium">${c.clienteNombre ? esc(c.clienteNombre) : '—'}</td><td class="px-4 py-3 text-on-surface-variant text-[12px]">${c.concepto ? esc(c.concepto) : '—'}</td><td class="px-4 py-3 font-semibold">${fmtMoney(c.monto)}</td><td class="px-4 py-3"><span class="text-[11px] px-2.5 py-1 rounded-full font-bold ${vencido ? 'bg-error/10 text-error' : c.vence ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}">${fmtDate(c.vence)}</span></td><td class="px-4 py-3"><span class="text-[11px] px-2.5 py-1 rounded-full font-bold ${c.estado === 'Pagado' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}">${c.estado || 'Pendiente'}</span></td><td class="px-4 py-3"><div class="flex gap-1">${c.estado !== 'Pagado' ? `<button class="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-[11px] font-bold hover:bg-green-100 transition-colors" data-action="cobrar" data-id="${c.id}">Cobrar</button>` : ''}<button class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" data-edit="cobrar" data-id="${c.id}"><span class="material-symbols-outlined text-lg text-on-surface-variant">edit</span></button><button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-delete="cobrar" data-id="${c.id}"><span class="material-symbols-outlined text-lg text-error">delete</span></button></div></td></tr>`;
        }).join('')}</tbody></table>`}
    </div>
    ` : `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-headline-sm font-headline-sm">Cuentas por pagar</h3>
      <button class="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-all active:scale-95" data-modal="modal-pagar" data-new="pagar">
        <span class="material-symbols-outlined text-lg">add</span> Nueva
      </button>
    </div>
    <div class="flex gap-2 mb-4 flex-wrap items-center">
      <div class="flex gap-1 bg-surface-container-low p-1 rounded-xl">
        <button class="tab-btn px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${pagarSub === 'pendientes' ? 'bg-white shadow-sm' : 'text-on-surface-variant/60 hover:text-on-surface'}" data-tab="pagar" data-value="pendientes">Pendientes (${pagar.filter(p => p.estado !== 'Pagado').length})</button>
        <button class="tab-btn px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${pagarSub === 'pagadas' ? 'bg-white shadow-sm' : 'text-on-surface-variant/60 hover:text-on-surface'}" data-tab="pagar" data-value="pagadas">Pagadas (${pagar.filter(p => p.estado === 'Pagado').length})</button>
      </div>
      <div class="relative flex-1 min-w-[160px]">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
        <input type="search" id="pagar-search" placeholder="Buscar..." class="w-full pl-10 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20">
      </div>
    </div>
    ${pagarSub === 'pendientes' && pagarData.length > 0 ? `<div class="bg-error/5 border border-error/20 rounded-xl p-3 mb-4 inline-block"><span class="text-label-caps font-label-caps text-on-surface-variant">TOTAL POR PAGAR</span><div class="text-headline-md font-headline-md text-error" style="font-size:20px;line-height:28px;font-weight:600;">${fmtMoney(pagarTotal)}</div></div>` : ''}
    <div class="glass-card-solid rounded-xl overflow-hidden">
      ${pagarData.length === 0
        ? `<div class="text-center py-12 text-on-surface-variant"><span class="material-symbols-outlined text-4xl opacity-30 mb-2">account_balance</span><p>${pagarSub === 'pendientes' ? 'Sin cuentas pendientes' : 'Sin cuentas pagadas'}</p></div>`
        : `<table class="w-full text-sm"><thead><tr class="text-left text-[11px] text-on-surface-variant/60 uppercase tracking-wider"><th class="px-4 py-3 font-bold">Proveedor</th><th class="px-4 py-3 font-bold">Concepto</th><th class="px-4 py-3 font-bold">Monto</th><th class="px-4 py-3 font-bold">Vence</th><th class="px-4 py-3 font-bold">Estado</th><th class="px-4 py-3"></th></tr></thead><tbody>${pagarData.map(p => {
          const vencido = p.vence && p.vence < today() && p.estado !== 'Pagado';
          return `<tr class="border-t border-outline-variant/20 hover:bg-primary/5 transition-colors"><td class="px-4 py-3 font-medium">${p.proveedor ? esc(p.proveedor) : '—'}</td><td class="px-4 py-3 text-on-surface-variant text-[12px]">${p.concepto ? esc(p.concepto) : '—'}</td><td class="px-4 py-3 font-semibold">${fmtMoney(p.monto)}</td><td class="px-4 py-3"><span class="text-[11px] px-2.5 py-1 rounded-full font-bold ${vencido ? 'bg-error/10 text-error' : p.vence ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}">${fmtDate(p.vence)}</span></td><td class="px-4 py-3"><span class="text-[11px] px-2.5 py-1 rounded-full font-bold ${p.estado === 'Pagado' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">${p.estado || 'Pendiente'}</span></td><td class="px-4 py-3"><div class="flex gap-1">${p.estado !== 'Pagado' ? `<button class="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-[11px] font-bold hover:bg-green-100 transition-colors" data-action="pagar" data-id="${p.id}">Pagar</button>` : ''}<button class="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" data-edit="pagar" data-id="${p.id}"><span class="material-symbols-outlined text-lg text-on-surface-variant">edit</span></button><button class="p-1.5 rounded-lg hover:bg-error/10 transition-colors" data-delete="pagar" data-id="${p.id}"><span class="material-symbols-outlined text-lg text-error">delete</span></button></div></td></tr>`;
        }).join('')}</tbody></table>`}
    </div>
    `}
  `;
  document.getElementById('cobrar-search')?.addEventListener('input', debounce(renderFinanzas, 250));
  document.getElementById('pagar-search')?.addEventListener('input', debounce(renderFinanzas, 250));
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
  if (editingId) { const i = lista.findIndex(x => x.id === editingId); if (i >= 0) lista[i] = { ...lista[i], ...cuenta, estado: lista[i].estado }; }
  else { lista.push(cuenta); }
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
  if (t) { e.preventDefault(); navigate(t.dataset.nav); return; }
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

  // Menu toggle for settings dropdown
  document.getElementById('menu-toggle')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('settings-menu')?.classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    const menu = document.getElementById('settings-menu');
    if (menu && !menu.contains(e.target)) menu.classList.add('hidden');
  });

  document.getElementById('fab-add')?.addEventListener('click', triggerFab);

  // Export / Import via data-action delegation + direct buttons
  document.getElementById('btn-export')?.addEventListener('click', exportData);
  document.getElementById('btn-import')?.addEventListener('click', importData);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
});
