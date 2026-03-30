/**
 * staff.js — Módulo Staff
 * PAX Servinform · 2026
 *
 * Tabla editable de plantilla de agentes.
 * Carga desde Excel (hoja STAFF), edición inline, paste desde Excel,
 * añadir/eliminar filas, filtros, y descarga de plantilla vacía.
 *
 * Reutiliza de parser.js: _norm, _parsearSTAFF, _resolverSvcId
 */

'use strict';

// ── Constantes ────────────────────────────────────────────────────────────

var STAFF_TURNOS  = ['FIJO', 'ROTATIVO_2', 'ROTATIVO_3', 'ROTATIVO_4', 'PARTIDO', 'IRR_25', 'IRR_28'];
var STAFF_TIPOS   = ['NF', '7D'];
var STAFF_ESTADOS = ['', 'IT', 'MAT', 'PAT', 'LACT', 'P.DTO', 'PR', 'EXC'];

/** Definición de columnas: clave, cabecera, tipo de editor, ancho en px */
var STAFF_COLS = [
    { key: 'codigo',   label: 'Código',    tipo: 'text',   req: true,  w: 90  },
    { key: 'nombre',   label: 'Nombre',    tipo: 'text',   req: true,  w: 160 },
    { key: 'servicio', label: 'Servicio',  tipo: 'svc',    req: true,  w: 150 },
    { key: 'turno',    label: 'Turno',     tipo: 'tlist',  req: false, w: 130 },
    { key: 'tipo',     label: 'NF / 7D',   tipo: 'select', req: false, w: 80,
      opts: ['NF', '7D'] },
    { key: 'estado',   label: 'Estado',    tipo: 'select', req: false, w: 100,
      opts: STAFF_ESTADOS },
    { key: 'it_fin',   label: 'IT hasta',  tipo: 'date',   req: false, w: 110 },
    { key: 'vac1',     label: 'VAC 1',     tipo: 'date',   req: false, w: 110 },
    { key: 'vac2',     label: 'VAC 2',     tipo: 'date',   req: false, w: 110 },
    { key: 'vac3',     label: 'VAC 3',     tipo: 'date',   req: false, w: 110 },
    { key: 'vac4',     label: 'VAC 4',     tipo: 'date',   req: false, w: 110 },
    { key: 'dlf1',     label: 'DLF 1',     tipo: 'date',   req: false, w: 110 },
    { key: 'dlf2',     label: 'DLF 2',     tipo: 'date',   req: false, w: 110 },
    { key: 'dlf3',     label: 'DLF 3',     tipo: 'date',   req: false, w: 110 },
    { key: 'dlf4',     label: 'DLF 4',     tipo: 'date',   req: false, w: 110 },
    { key: 'fest1',    label: 'FEST 1',    tipo: 'date',   req: false, w: 110 },
    { key: 'fest2',    label: 'FEST 2',    tipo: 'date',   req: false, w: 110 },
    { key: 'fest3',    label: 'FEST 3',    tipo: 'date',   req: false, w: 110 },
    { key: 'fest4',    label: 'FEST 4',    tipo: 'date',   req: false, w: 110 }
];

// ── Estado interno del módulo ─────────────────────────────────────────────

var _stFiltroSvc    = '';     // '' = todos
var _stFiltroEstado = '';     // '' = todos
var _stSelOrigen    = null;   // { rowIdx, colIdx } — celda de inicio para paste
var _stPasteRegistrado = false;

// ── Entry point ───────────────────────────────────────────────────────────

/**
 * Renderiza el módulo completo dentro de `container`.
 * Llamado desde ui.js cuando se navega a panelStaff.
 */
function renderModuloStaff(container) {
    container.innerHTML = '';

    container.appendChild(_stRenderCarga());

    var filtros = _stRenderFiltros();
    container.appendChild(filtros);

    var stats = document.createElement('div');
    stats.id        = 'stStats';
    stats.className = 'stats-grid';
    stats.style.marginBottom = '14px';
    container.appendChild(stats);

    var tablaWrap = document.createElement('div');
    tablaWrap.id        = 'stTablaWrap';
    tablaWrap.className = 'table-container';
    tablaWrap.style.overflowX = 'auto';
    container.appendChild(tablaWrap);

    var acciones = document.createElement('div');
    acciones.className = 'actions';
    acciones.style.marginTop = '10px';
    acciones.appendChild(crearBtn('Añadir agente', 'btn-secondary btn-sm', '➕', _stAgregarFila));
    container.appendChild(acciones);

    _stActualizar();

    if (!_stPasteRegistrado) {
        document.addEventListener('paste', _stOnPaste);
        _stPasteRegistrado = true;
    }
}

// ── Panel de carga ────────────────────────────────────────────────────────

function _stRenderCarga() {
    var panel = document.createElement('div');
    panel.className = 'panel';

    panel.innerHTML =
        '<div class="panel-header" onclick="togglePanel(this)">' +
            '<span class="panel-icon">📁</span>' +
            '<h2>Carga de plantilla</h2>' +
            '<span class="panel-desc">Sube la hoja STAFF del Excel o edita directamente</span>' +
            '<span class="panel-toggle">▼</span>' +
        '</div>' +
        '<div class="panel-body">' +
            '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;">' +

                // Zona de drop
                '<div id="stUploadZone" style="flex:1;min-width:180px;border:2px dashed var(--nb-border);' +
                    'border-radius:8px;padding:22px 16px;text-align:center;cursor:pointer;' +
                    'transition:border-color .2s,background .2s;">' +
                    '<div style="font-size:28px;margin-bottom:6px;">📁</div>' +
                    '<div style="font-weight:700;font-size:13px;margin-bottom:3px;">Arrastra el Excel o haz clic</div>' +
                    '<div style="font-size:11px;color:var(--nb-text-light);">Hoja <strong>STAFF</strong> · .xlsx / .xls</div>' +
                    '<input type="file" id="stInputFile" accept=".xlsx,.xls" style="display:none;">' +
                '</div>' +

                // Botones laterales
                '<div style="display:flex;flex-direction:column;gap:8px;padding-top:4px;">' +
                    '<button class="btn btn-secondary btn-sm" onclick="descargarPlantillaStaff()" ' +
                        'title="Descarga un Excel vacío con los headers correctos para rellenar desde 0">📥 Descargar plantilla vacía</button>' +
                    '<button class="btn btn-secondary btn-sm" onclick="generarDemoStaff()" ' +
                        'title="Genera 20 agentes de prueba para explorar la herramienta">🧪 Datos demo</button>' +
                '</div>' +
            '</div>' +
            '<div id="stBanner" style="display:none;margin-top:10px;"></div>' +
        '</div>';

    // Eventos — diferidos para que el DOM esté listo
    setTimeout(function() {
        var zone  = panel.querySelector('#stUploadZone');
        var input = panel.querySelector('#stInputFile');
        if (!zone || !input) return;

        zone.addEventListener('click', function() { input.click(); });

        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.style.borderColor = 'var(--nb-primary)';
            zone.style.background  = 'var(--nb-primary-light)';
        });
        zone.addEventListener('dragleave', function() {
            zone.style.borderColor = 'var(--nb-border)';
            zone.style.background  = '';
        });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.style.borderColor = 'var(--nb-border)';
            zone.style.background  = '';
            var f = e.dataTransfer.files[0];
            if (f) _stCargarExcel(f);
        });
        input.addEventListener('change', function(e) {
            if (e.target.files[0]) _stCargarExcel(e.target.files[0]);
        });
    }, 0);

    return panel;
}

// ── Filtros ────────────────────────────────────────────────────────────────

function _stRenderFiltros() {
    var bar = document.createElement('div');
    bar.className = 'actions';
    bar.id        = 'stFiltrosBar';
    bar.style.marginBottom = '12px';

    // Label + select de servicio
    var lbl1 = document.createElement('span');
    lbl1.textContent = 'Servicio:';
    lbl1.style.cssText = 'font-size:11px;font-weight:700;color:var(--nb-text-light);';

    var selSvc = document.createElement('select');
    selSvc.id  = 'stFiltroSvc';
    selSvc.style.cssText = 'padding:5px 8px;border:1px solid var(--nb-border);border-radius:4px;font-size:12px;font-family:inherit;';
    _stPoblarOpcionesSvc(selSvc);
    selSvc.addEventListener('change', function(e) {
        _stFiltroSvc = e.target.value;
        _stActualizar();
    });

    // Label + select de estado
    var lbl2 = document.createElement('span');
    lbl2.textContent = 'Estado:';
    lbl2.style.cssText = lbl1.style.cssText;

    var selEst = document.createElement('select');
    selEst.id  = 'stFiltroEstado';
    selEst.style.cssText = selSvc.style.cssText;
    [['', 'Todos los estados'], ['activo', 'Activos'],
     ['IT', 'IT'], ['MAT', 'MAT'], ['PAT', 'PAT'],
     ['LACT', 'LACT'], ['EXC', 'EXC'], ['PR', 'PR'], ['P.DTO', 'P.DTO']
    ].forEach(function(par) {
        var o = document.createElement('option');
        o.value = par[0]; o.textContent = par[1];
        selEst.appendChild(o);
    });
    selEst.addEventListener('change', function(e) {
        _stFiltroEstado = e.target.value;
        _stActualizar();
    });

    // Contador de filas visibles
    var contador = document.createElement('span');
    contador.id = 'stContador';
    contador.style.cssText = 'font-size:11px;color:var(--nb-text-light);margin-left:auto;';

    bar.appendChild(lbl1);
    bar.appendChild(selSvc);
    bar.appendChild(lbl2);
    bar.appendChild(selEst);
    bar.appendChild(contador);
    return bar;
}

function _stPoblarOpcionesSvc(sel) {
    sel.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = ''; opt0.textContent = 'Todos los servicios';
    sel.appendChild(opt0);
    State.config.servicios.forEach(function(svc) {
        var opt = document.createElement('option');
        opt.value = svc.id; opt.textContent = svc.nombre;
        sel.appendChild(opt);
    });
    sel.value = _stFiltroSvc;
}

// ── Refresco global ───────────────────────────────────────────────────────

function _stActualizar() {
    // Stats
    var statsEl = document.getElementById('stStats');
    if (statsEl) _stRenderStats(statsEl);

    // Tabla
    var wrap = document.getElementById('stTablaWrap');
    if (wrap) _stRenderTabla(wrap);

    // Contador
    var filas = _stGetFiltradas();
    var cEl   = document.getElementById('stContador');
    if (cEl) cEl.textContent = filas.length + ' agente' + (filas.length !== 1 ? 's' : '');
}

// ── Stats ─────────────────────────────────────────────────────────────────

function _stRenderStats(container) {
    var todos   = State.staff.todos;
    var activos = State.staff.activos;
    var html = '';

    html += '<div class="stat-card accent">' +
        '<div class="stat-label">Total agentes</div>' +
        '<div class="stat-value">' + todos.length + '</div></div>';
    html += '<div class="stat-card">' +
        '<div class="stat-label">Activos</div>' +
        '<div class="stat-value">' + activos.length + '</div></div>';
    html += '<div class="stat-card">' +
        '<div class="stat-label">Ausentes / IT</div>' +
        '<div class="stat-value">' + (todos.length - activos.length) + '</div></div>';

    State.config.servicios.forEach(function(svc) {
        var n = activos.filter(function(a) { return a.servicioId === svc.id; }).length;
        html += '<div class="stat-card" style="border-left:3px solid ' + svc.color + ';">' +
            '<div class="stat-label">' + _stEsc(svc.nombre) + '</div>' +
            '<div class="stat-value">' + n + '</div></div>';
    });

    container.innerHTML = html;
}

// ── Tabla editable ────────────────────────────────────────────────────────

function _stRenderTabla(wrap) {
    var filas = _stGetFiltradas();

    var table = document.createElement('table');
    table.className = 'nb-table staff-table';
    table.id        = 'stTabla';
    table.tabIndex  = 0;

    // — Cabecera —
    var thead = document.createElement('thead');
    var trH   = document.createElement('tr');
    // Columna eliminar
    var thAcc = document.createElement('th');
    thAcc.style.cssText = 'width:36px;';
    trH.appendChild(thAcc);

    STAFF_COLS.forEach(function(col) {
        var th = document.createElement('th');
        th.style.minWidth = col.w + 'px';
        th.innerHTML = col.label + (col.req ? ' <span style="color:var(--nb-red)">*</span>' : '');
        trH.appendChild(th);
    });
    thead.appendChild(trH);
    table.appendChild(thead);

    // — Cuerpo —
    var tbody = document.createElement('tbody');

    if (!filas.length) {
        var trV = document.createElement('tr');
        var tdV = document.createElement('td');
        tdV.colSpan = STAFF_COLS.length + 1;
        tdV.style.cssText = 'text-align:center;padding:36px;color:var(--nb-text-light);font-size:13px;';
        tdV.innerHTML = State.staff.todos.length
            ? '🔍 No hay agentes con esos filtros.'
            : '📭 Tabla vacía — sube un Excel o pulsa <strong>Datos demo</strong>.';
        trV.appendChild(tdV);
        tbody.appendChild(trV);
    } else {
        filas.forEach(function(agente) {
            var realIdx = State.staff.todos.indexOf(agente);
            tbody.appendChild(_stCrearFila(agente, realIdx));
        });
    }

    table.appendChild(tbody);

    // Ayuda para paste
    var info = document.createElement('div');
    info.className = 'info-box';
    info.style.cssText = 'margin-top:10px;font-size:11px;';
    info.innerHTML = '💡 <strong>Edición:</strong> doble clic para editar una celda · haz clic en una celda y <kbd>Ctrl+V</kbd> para pegar un rango desde Excel · Tab / Enter para confirmar.';

    wrap.innerHTML = '';
    wrap.appendChild(table);
    wrap.appendChild(info);
}

// ── Fila de la tabla ──────────────────────────────────────────────────────

function _stCrearFila(agente, realIdx) {
    var tr = document.createElement('tr');
    tr.dataset.idx = realIdx;

    // Celda de acción: eliminar
    var tdAcc = document.createElement('td');
    tdAcc.style.cssText = 'text-align:center;padding:2px;';
    var btnDel = document.createElement('button');
    btnDel.className  = 'btn btn-danger btn-sm';
    btnDel.title      = 'Eliminar agente';
    btnDel.innerHTML  = '🗑';
    btnDel.style.cssText = 'padding:2px 6px;font-size:11px;';
    btnDel.addEventListener('click', function() { _stEliminarFila(realIdx); });
    tdAcc.appendChild(btnDel);
    tr.appendChild(tdAcc);

    // Celdas de datos
    STAFF_COLS.forEach(function(col, colIdx) {
        var td = document.createElement('td');
        td.dataset.col    = col.key;
        td.dataset.row    = realIdx;
        td.dataset.colIdx = colIdx;
        td.style.cssText  = 'padding:3px 6px;cursor:default;white-space:nowrap;';

        _stRenderCeldaContenido(td, agente, col);

        // Clic simple → seleccionar origen para paste
        td.addEventListener('click', function() {
            document.querySelectorAll('#stTabla td.st-sel').forEach(function(c) {
                c.classList.remove('st-sel');
            });
            td.classList.add('st-sel');
            _stSelOrigen = { rowIdx: realIdx, colIdx: colIdx };
        });

        // Doble clic → editar inline
        td.addEventListener('dblclick', function() {
            _stEditarCelda(td, agente, col, realIdx);
        });

        tr.appendChild(td);
    });

    return tr;
}

function _stRenderCeldaContenido(td, agente, col) {
    var val = _stGetVal(agente, col.key);

    if (col.key === 'estado' && val) {
        td.innerHTML = _stEstadoChip(val);
    } else {
        td.textContent = val !== null && val !== undefined ? val : '';
    }
}

// ── Edición inline ────────────────────────────────────────────────────────

function _stEditarCelda(td, agente, col, realIdx) {
    if (td.querySelector('input,select')) return; // ya en edición
    td.style.cursor = 'text';

    var valActual = _stGetVal(agente, col.key) || '';
    var input;

    if (col.tipo === 'select' || col.tipo === 'svc') {
        input = document.createElement('select');
        var opciones = col.tipo === 'svc'
            ? State.config.servicios.map(function(s) { return { v: s.nombre, l: s.nombre }; })
            : col.opts.map(function(o) { return { v: o, l: o || '(ninguno)' }; });

        opciones.forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o.v; opt.textContent = o.l;
            if (o.v === valActual) opt.selected = true;
            input.appendChild(opt);
        });

    } else if (col.tipo === 'tlist') {
        input = document.createElement('input');
        input.type  = 'text';
        input.list  = 'stTurnosList';
        input.value = valActual;
        _stAsegurarDatalistTurnos();

    } else {
        input = document.createElement('input');
        input.type  = col.tipo === 'date' ? 'date' : 'text';
        input.value = valActual;
    }

    input.style.cssText = 'width:100%;min-width:' + (col.w - 12) + 'px;padding:3px 5px;' +
        'border:1px solid var(--nb-primary);border-radius:3px;font-size:12px;font-family:inherit;' +
        'background:var(--nb-white);box-shadow:0 0 0 2px rgba(59,179,154,.2);';

    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    if (input.select && col.tipo !== 'date') input.select();

    function confirmar() {
        _stSetVal(agente, col.key, input.value);
        _stRecalcActivos();
        _stRenderCeldaContenido(td, agente, col);
        td.style.cursor = 'default';
        _stRenderStats(document.getElementById('stStats'));
        programarGuardado();
    }

    input.addEventListener('blur', confirmar);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); confirmar(); _stMoverFoco(td, 0, 1); }
        if (e.key === 'Tab')   { e.preventDefault(); confirmar(); _stMoverFoco(td, 1, 0); }
        if (e.key === 'Escape') { td.textContent = valActual; td.style.cursor = 'default'; }
    });
}

/** Mueve el foco a la celda adyacente (dCol columnas, dRow filas) */
function _stMoverFoco(td, dCol, dRow) {
    var rowIdx = parseInt(td.dataset.row);
    var colIdx = parseInt(td.dataset.colIdx);
    var tabla  = document.getElementById('stTabla');
    if (!tabla) return;
    var target = tabla.querySelector(
        'td[data-row="' + (rowIdx + dRow) + '"][data-col-idx="' + (colIdx + dCol) + '"]'
    );
    if (target) {
        var filas  = _stGetFiltradas();
        var agente = State.staff.todos[rowIdx + dRow];
        var col    = STAFF_COLS[colIdx + dCol];
        if (agente && col) _stEditarCelda(target, agente, col, rowIdx + dRow);
    }
}

function _stAsegurarDatalistTurnos() {
    if (document.getElementById('stTurnosList')) return;
    var dl = document.createElement('datalist');
    dl.id  = 'stTurnosList';
    STAFF_TURNOS.forEach(function(t) {
        var o = document.createElement('option'); o.value = t; dl.appendChild(o);
    });
    document.body.appendChild(dl);
}

// ── Get / Set valor de agente ────────────────────────────────────────────

function _stGetVal(agente, key) {
    if (key === 'servicio') {
        var svc = State.config.servicios.find(function(s) { return s.id === agente.servicioId; });
        return svc ? svc.nombre : (agente.servicio || '');
    }
    if (key.startsWith('vac'))  return (agente.vac  || [])[parseInt(key.slice(3)) - 1] || '';
    if (key.startsWith('dlf'))  return (agente.dlf  || [])[parseInt(key.slice(3)) - 1] || '';
    if (key.startsWith('fest')) return (agente.fest || [])[parseInt(key.slice(4)) - 1] || '';
    var v = agente[key];
    return v !== null && v !== undefined ? v : '';
}

function _stSetVal(agente, key, val) {
    val = (val || '').trim();

    if (key === 'servicio') {
        var svc = State.config.servicios.find(function(s) {
            return _norm(s.nombre) === _norm(val) || s.id === val;
        });
        agente.servicioId = svc ? svc.id : (val || null);
        agente.servicio   = svc ? svc.nombre : val;
        return;
    }

    if (key.startsWith('vac')) {
        if (!Array.isArray(agente.vac)) agente.vac = [];
        agente.vac[parseInt(key.slice(3)) - 1] = val || null;
        agente.vac = agente.vac.filter(Boolean);
        return;
    }
    if (key.startsWith('dlf')) {
        if (!Array.isArray(agente.dlf)) agente.dlf = [];
        agente.dlf[parseInt(key.slice(3)) - 1] = val || null;
        agente.dlf = agente.dlf.filter(Boolean);
        return;
    }
    if (key.startsWith('fest')) {
        if (!Array.isArray(agente.fest)) agente.fest = [];
        agente.fest[parseInt(key.slice(4)) - 1] = val || null;
        agente.fest = agente.fest.filter(Boolean);
        return;
    }

    agente[key] = val || (key === 'tipo' ? 'NF' : '');
}

// ── Estado chip ────────────────────────────────────────────────────────────

function _stEstadoChip(estado) {
    var colores = {
        'IT':    '#E87000',
        'MAT':   '#7B3FA0',
        'PAT':   '#0056C8',
        'LACT':  '#9B59B6',
        'EXC':   '#E53935',
        'PR':    '#5C6BC0',
        'P.DTO': '#26A69A'
    };
    var bg = colores[(estado || '').toUpperCase()] || 'var(--nb-text-light)';
    return '<span style="background:' + bg + ';color:white;padding:1px 8px;border-radius:10px;' +
           'font-size:10px;font-weight:700;letter-spacing:.3px;">' + _stEsc(estado) + '</span>';
}

// ── Filtrado ──────────────────────────────────────────────────────────────

function _stGetFiltradas() {
    return State.staff.todos.filter(function(a) {
        if (_stFiltroSvc && a.servicioId !== _stFiltroSvc) return false;
        if (_stFiltroEstado === 'activo') {
            var inactivo = ['IT', 'MAT', 'PAT', 'LACT', 'EXC', 'PR', 'P.DTO'];
            return !a.it_fin && !inactivo.includes((a.estado || '').toUpperCase());
        }
        if (_stFiltroEstado) {
            return (a.estado || '').toUpperCase() === _stFiltroEstado.toUpperCase();
        }
        return true;
    });
}

// ── Añadir / Eliminar fila ────────────────────────────────────────────────

function _stAgregarFila() {
    var svcDefecto = State.config.servicios[0] || null;
    State.staff.todos.push({
        codigo:     '',
        nombre:     '',
        servicio:   svcDefecto ? svcDefecto.nombre : '',
        servicioId: svcDefecto ? svcDefecto.id : null,
        turno:      'FIJO',
        tipo:       'NF',
        it_fin:     null,
        estado:     '',
        vac:        [],
        dlf:        [],
        fest:       []
    });
    _stRecalcActivos();
    _stActualizar();
    programarGuardado();
    // Scroll al final
    setTimeout(function() {
        var wrap = document.getElementById('stTablaWrap');
        if (wrap) wrap.scrollTop = wrap.scrollHeight;
    }, 50);
}

function _stEliminarFila(realIdx) {
    if (!confirm('¿Eliminar este agente de la plantilla?')) return;
    State.staff.todos.splice(realIdx, 1);
    _stRecalcActivos();
    _stActualizar();
    programarGuardado();
}

function _stRecalcActivos() {
    var inactivo = ['IT', 'MAT', 'PAT', 'LACT', 'EXC', 'PR', 'P.DTO'];
    State.staff.activos = State.staff.todos.filter(function(a) {
        if (a.it_fin) return false;
        return !inactivo.includes((a.estado || '').toUpperCase());
    });
}

// ── Carga Excel (solo hoja STAFF) ─────────────────────────────────────────

function _stCargarExcel(file) {
    mostrarProgreso('Cargando STAFF...', 30, file.name);
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var wb     = XLSX.read(e.target.result, { type: 'array', cellDates: true });
            // Buscar la hoja STAFF (insensible a mayúsculas y tildes)
            var key = null;
            wb.SheetNames.forEach(function(n) {
                if (!key && _norm(n).match(/^(staff|plantilla|agentes)/)) key = n;
            });
            if (!key) key = wb.SheetNames[0]; // fallback a primera hoja
            if (!key) throw new Error('El archivo no tiene hojas.');

            var rows = XLSX.utils.sheet_to_json(wb.Sheets[key], { header: 1, defval: '' });
            var n    = _parsearSTAFF(rows);   // función de parser.js
            _stRecalcActivos();
            ocultarProgreso();
            _stBanner('✅ ' + n + ' agentes cargados desde "' + _stEsc(file.name) + '"', 'ok');
            _stActualizar();
            toast(n + ' agentes cargados', 'success');
        } catch (err) {
            ocultarProgreso();
            toast('Error al cargar: ' + err.message, 'error');
        }
    };
    reader.onerror = function() {
        ocultarProgreso();
        toast('Error al leer el archivo', 'error');
    };
    reader.readAsArrayBuffer(file);
}

function _stBanner(msg, tipo) {
    var el = document.getElementById('stBanner');
    if (!el) return;
    el.style.cssText = 'display:block;padding:8px 12px;border-radius:4px;font-size:12px;font-weight:600;' +
        (tipo === 'ok'
            ? 'background:var(--nb-primary-light);border:1px solid var(--nb-primary-mid);color:var(--nb-dark);'
            : 'background:#FFF3E0;border:1px solid #FFB74D;color:#E65100;');
    el.innerHTML = msg;
}

// ── Paste desde Excel (Ctrl+V) ────────────────────────────────────────────

function _stOnPaste(e) {
    // Solo si hay una celda seleccionada en la tabla staff
    if (_stSelOrigen === null) return;
    if (!document.getElementById('stTabla')) {
        // El módulo ya no está visible — limpiar origen
        _stSelOrigen = null;
        return;
    }

    var txt = (e.clipboardData || window.clipboardData).getData('text');
    if (!txt) return;
    e.preventDefault();

    var lineas = txt.split(/\r?\n/).filter(function(l) { return l !== ''; });
    if (!lineas.length) return;

    var startRow = _stSelOrigen.rowIdx;
    var startCol = _stSelOrigen.colIdx;
    var pegados  = 0;

    lineas.forEach(function(linea, ri) {
        var celdas = linea.split('\t');
        var rowIdx = startRow + ri;

        // Si se pega más allá del final → añadir filas
        if (rowIdx >= State.staff.todos.length) {
            var svcDef = State.config.servicios[0] || null;
            State.staff.todos.push({
                codigo: '', nombre: '',
                servicio: svcDef ? svcDef.nombre : '', servicioId: svcDef ? svcDef.id : null,
                turno: '', tipo: 'NF', it_fin: null, estado: '',
                vac: [], dlf: [], fest: []
            });
        }

        var agente = State.staff.todos[rowIdx];
        celdas.forEach(function(val, ci) {
            var colIdx = startCol + ci;
            if (colIdx >= STAFF_COLS.length) return;
            _stSetVal(agente, STAFF_COLS[colIdx].key, val.trim());
            pegados++;
        });
    });

    _stRecalcActivos();
    _stActualizar();
    programarGuardado();
    toast(pegados + ' celda' + (pegados !== 1 ? 's' : '') + ' pegada' + (pegados !== 1 ? 's' : ''), 'success');
    _stSelOrigen = null;
}

// ── Descarga plantilla Excel ───────────────────────────────────────────────

function descargarPlantillaStaff() {
    var headers = STAFF_COLS.map(function(c) { return c.label; });

    // Fila de ejemplo comentada
    var ejemplo = [
        'AG001', 'Nombre de Agente', 'Atención al Cliente',
        'FIJO', 'NF', '', '',
        '', '', '', '',  // VAC1-4
        '', '', '', '',  // DLF1-4
        '', '', '', ''   // FEST1-4
    ];

    var ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
    ws['!cols'] = STAFF_COLS.map(function(c) { return { wch: Math.round(c.w / 6.5) }; });

    // Estilos básicos de cabecera (solo funciona con SheetJS Pro; se ignore en libre)
    var range = XLSX.utils.decode_range(ws['!ref']);
    for (var C = range.s.c; C <= range.e.c; C++) {
        var addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: '3BB39A' } } };
    }

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'STAFF');

    // Hoja de instrucciones
    var instrHeaders = ['Campo', 'Obligatorio', 'Descripción', 'Valores válidos'];
    var instrRows = [
        ['Código',    'Sí', 'Identificador único del agente', 'Texto libre (sin duplicados)'],
        ['Nombre',    'Sí', 'Nombre completo del agente',     'Texto libre'],
        ['Servicio',  'Sí', 'Servicio al que pertenece',      'Debe coincidir con los servicios configurados en la app'],
        ['Turno',     'No', 'Tipo de turno asignado',         STAFF_TURNOS.join(' | ')],
        ['NF / 7D',   'No', 'Disponibilidad en fines de semana y festivos', 'NF (no festivos)  |  7D (todos los días)'],
        ['Estado',    'No', 'Situación actual del agente',    STAFF_ESTADOS.filter(Boolean).join(' | ')],
        ['IT hasta',  'No', 'Fecha fin de IT (dejar vacío si no aplica)', 'YYYY-MM-DD'],
        ['VAC 1-4',   'No', 'Períodos de vacaciones (fecha individual)', 'YYYY-MM-DD'],
        ['DLF 1-4',   'No', 'Días libres de fondo',           'YYYY-MM-DD'],
        ['FEST 1-4',  'No', 'Festivos personales acordados',  'YYYY-MM-DD']
    ];
    var wsI = XLSX.utils.aoa_to_sheet([instrHeaders].concat(instrRows));
    wsI['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 42 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, wsI, 'Instrucciones');

    var buf  = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    var blob = new Blob([buf], { type: 'application/octet-stream' });
    saveAs(blob, 'plantilla_staff_claudia_novobanco.xlsx');
    toast('Plantilla descargada', 'success');
}

// ── Datos demo ────────────────────────────────────────────────────────────

function generarDemoStaff() {
    var servicios = State.config.servicios;
    if (!servicios.length) {
        toast('Configura al menos un servicio antes de generar demo.', 'warning');
        return;
    }

    var nombres = [
        'Ana López', 'Javier Ruiz', 'María García', 'Carlos Pérez', 'Laura Sánchez',
        'Pedro Martínez', 'Isabel Fernández', 'Antonio González', 'Carmen Díaz', 'Miguel Torres',
        'Rosa Morales', 'Francisco Jiménez', 'Elena Castillo', 'Manuel Romero', 'Lucía Navarro',
        'Jorge Hernández', 'Patricia Vega', 'Raúl Blanco', 'Pilar Santos', 'Alberto Ríos'
    ];
    var turnos = ['FIJO', 'ROTATIVO_2', 'ROTATIVO_4', 'PARTIDO'];

    State.staff.todos = nombres.map(function(nom, i) {
        var svc = servicios[i % servicios.length];
        return {
            codigo:     'AG' + String(i + 1).padStart(3, '0'),
            nombre:     nom,
            servicio:   svc.nombre,
            servicioId: svc.id,
            turno:      turnos[i % turnos.length],
            tipo:       i % 3 === 0 ? '7D' : 'NF',
            it_fin:     null,
            estado:     i === 3 ? 'IT' : (i === 7 ? 'MAT' : ''),
            vac:        [],
            dlf:        [],
            fest:       []
        };
    });

    _stRecalcActivos();
    _stActualizar();
    programarGuardado();
    toast('20 agentes demo generados', 'success');
}

// ── Helpers privados ──────────────────────────────────────────────────────

function _stEsc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
