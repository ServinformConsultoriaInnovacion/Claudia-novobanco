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

// Valores reales extraídos del Excel de novobanco
var STAFF_TURNOS         = ['ROTATIVO', 'ROTATIVO X 3', 'ROTATIVO X 4', 'PARTIDO', 'PARTIDO IRR 31h', 'IRR 25h', 'IRR 28h'];
var STAFF_DISPONIBILIDADES = ['NF', '7D'];
var STAFF_ESTADOS        = ['ACTIVO', 'IT', 'MAT', 'PAT', 'LACT', 'P.DTO', 'PR', 'EXC'];
var STAFF_SEDES          = ['TORREJON', 'VALLADOLID'];

/**
 * Definición de columnas.
 * grupo: agrupa columnas con separación visual en la cabecera.
 */
var STAFF_COLS = [
    // ── Identificación
    { key: 'codigo',         label: 'CODIGO PRODUCTOR', grupo: 'Identificación', tipo: 'text',   req: true,  w: 110 },
    { key: 'servicio',       label: 'Servicio',          grupo: 'Identificación', tipo: 'svc',    req: false, w: 150 },
    { key: 'sede',           label: 'SEDE',              grupo: 'Identificación', tipo: 'tlist',  req: false, w: 110, opts: STAFF_SEDES },
    // ── Turno
    { key: 'horas',          label: 'HORAS',             grupo: 'Turno',          tipo: 'text',   req: false, w: 75  },
    { key: 'tipoTurno',      label: 'TIPO TURNO',        grupo: 'Turno',          tipo: 'tlist',  req: false, w: 140, opts: STAFF_TURNOS },
    { key: 'inicioTurno',    label: 'INICIO TURNO',      grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'finTurno',       label: 'FIN DE TURNO',      grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'inicioTurno2',   label: 'INICIO TURNO 2',    grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'finTurno2',      label: 'FIN TURNO 2',       grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'inicioTurno3',   label: 'INICIO TURNO 3',    grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'finTurno3',      label: 'FIN TURNO 3',       grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'inicioTurno4',   label: 'INICIO TURNO 4',    grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'finTurno4',      label: 'FIN TURNO 4',       grupo: 'Turno',          tipo: 'text',   req: false, w: 95  },
    { key: 'horarioPartido', label: 'HORARIO PARTIDO',   grupo: 'Turno',          tipo: 'text',   req: false, w: 200 },
    // ── Disponibilidad
    { key: 'disponibilidad', label: 'DISPONIBILIDAD',    grupo: 'Disponibilidad', tipo: 'select', req: false, w: 115, opts: STAFF_DISPONIBILIDADES },
    { key: 'estado',         label: 'ESTADO',            grupo: 'Disponibilidad', tipo: 'select', req: false, w: 100, opts: STAFF_ESTADOS },
    { key: 'finAusencia',    label: 'FIN AUSENCIA',      grupo: 'Disponibilidad', tipo: 'date',   req: false, w: 110 },
    // ── Vacaciones (pares inicio/fin)
    { key: 'inicioVac1',     label: 'INICIO VAC 1',      grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    { key: 'finVac1',        label: 'FIN VAC 1',         grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    { key: 'inicioVac2',     label: 'INICIO VAC 2',      grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    { key: 'finVac2',        label: 'FIN VAC 2',         grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    { key: 'inicioVac3',     label: 'INICIO VAC 3',      grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    { key: 'finVac3',        label: 'FIN VAC 3',         grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    { key: 'inicioVac4',     label: 'INICIO VAC 4',      grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    { key: 'finVac4',        label: 'FIN VAC 4',         grupo: 'Vacaciones',     tipo: 'date',   req: false, w: 105 },
    // ── DLF (6 días)
    { key: 'dlf1',           label: 'DLF 1',             grupo: 'DLF',            tipo: 'date',   req: false, w: 100 },
    { key: 'dlf2',           label: 'DLF 2',             grupo: 'DLF',            tipo: 'date',   req: false, w: 100 },
    { key: 'dlf3',           label: 'DLF 3',             grupo: 'DLF',            tipo: 'date',   req: false, w: 100 },
    { key: 'dlf4',           label: 'DLF 4',             grupo: 'DLF',            tipo: 'date',   req: false, w: 100 },
    { key: 'dlf5',           label: 'DLF 5',             grupo: 'DLF',            tipo: 'date',   req: false, w: 100 },
    { key: 'dlf6',           label: 'DLF 6',             grupo: 'DLF',            tipo: 'date',   req: false, w: 100 },
    // ── Festivos (6)
    { key: 'fest1',          label: 'FESTIVO 1',         grupo: 'Festivos',       tipo: 'date',   req: false, w: 100 },
    { key: 'fest2',          label: 'FESTIVO 2',         grupo: 'Festivos',       tipo: 'date',   req: false, w: 100 },
    { key: 'fest3',          label: 'FESTIVO 3',         grupo: 'Festivos',       tipo: 'date',   req: false, w: 100 },
    { key: 'fest4',          label: 'FESTIVO 4',         grupo: 'Festivos',       tipo: 'date',   req: false, w: 100 },
    { key: 'fest5',          label: 'FESTIVO 5',         grupo: 'Festivos',       tipo: 'date',   req: false, w: 100 },
    { key: 'fest6',          label: 'FESTIVO 6',         grupo: 'Festivos',       tipo: 'date',   req: false, w: 100 }
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

// ── Factoría de agente vacío ──────────────────────────────────────────────

function _crearAgente() {
    var svcDef = State.config.servicios[0] || null;
    return {
        codigo: '', servicio: svcDef ? svcDef.nombre : '',
        servicioId: svcDef ? svcDef.id : null,
        sede: '', horas: '', tipoTurno: '',
        inicioTurno: '', finTurno: '',
        inicioTurno2: '', finTurno2: '',
        inicioTurno3: '', finTurno3: '',
        inicioTurno4: '', finTurno4: '',
        horarioPartido: '', disponibilidad: 'NF',
        estado: 'ACTIVO', finAusencia: null,
        inicioVac1: null, finVac1: null,
        inicioVac2: null, finVac2: null,
        inicioVac3: null, finVac3: null,
        inicioVac4: null, finVac4: null,
        dlf1: null, dlf2: null, dlf3: null,
        dlf4: null, dlf5: null, dlf6: null,
        fest1: null, fest2: null, fest3: null,
        fest4: null, fest5: null, fest6: null
    };
}

function _stGetVal(agente, key) {
    if (key === 'servicio') {
        var svc = State.config.servicios.find(function(s) { return s.id === agente.servicioId; });
        return svc ? svc.nombre : (agente.servicio || '');
    }
    var v = agente[key];
    return (v !== null && v !== undefined) ? v : '';
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
    agente[key] = val || null;
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
    State.staff.todos.push(_crearAgente());
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
        var est = (a.estado || '').toUpperCase();
        return est !== 'IT' && !inactivo.includes(est);
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
            State.staff.todos.push(_crearAgente());
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

/**
 * Descarga la plantilla STAFF usando ExcelJS para formateo completo:
 * - Cabecera grupo (fila 1): fondo por grupo, bold, texto blanco
 * - Cabecera campo (fila 2): fondo --nb-primary, bold, texto blanco
 * - Fila de ejemplo (fila 3): gris claro, itálica
 * - Freeze primera fila + primera columna
 * - Anchos de columna optimizados
 * - Hoja Instrucciones con tabla formateada
 */
function descargarPlantillaStaff() {
    // ExcelJS está cargado en la página
    var wb  = new ExcelJS.Workbook();
    var ws  = wb.addWorksheet('STAFF', { views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }] });

    // ── Paleta de colores por grupo ───────────────────────────────────────
    var GRUPO_COLOR = {
        'Identificación': '2A9080',  // verde oscuro
        'Turno':          '0056C8',  // azul
        'Disponibilidad': '7B3FA0',  // morado
        'Vacaciones':     'E87000',  // naranja
        'DLF':            '00873D',  // verde
        'Festivos':       'E30613'   // rojo
    };
    var COLOR_HEADER = '3BB39A';  // --nb-primary
    var COLOR_EJEMPLO = 'F4F8F7'; // --nb-grey-bg

    // ── Fila 1: grupos (celdas combinadas) ───────────────────────────────
    var grupoActual = null;
    var grupoStart  = 1;
    var grupos = []; // [{ nombre, inicio, fin }]
    STAFF_COLS.forEach(function(col, i) {
        if (col.grupo !== grupoActual) {
            if (grupoActual !== null) grupos.push({ nombre: grupoActual, inicio: grupoStart, fin: i });
            grupoActual = col.grupo;
            grupoStart  = i + 1;
        }
    });
    grupos.push({ nombre: grupoActual, inicio: grupoStart, fin: STAFF_COLS.length });

    var fila1 = ws.getRow(1);
    grupos.forEach(function(g) {
        var cell = fila1.getCell(g.inicio);
        cell.value = g.nombre.toUpperCase();
        var bg = GRUPO_COLOR[g.nombre] || '888888';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (g.fin > g.inicio) ws.mergeCells(1, g.inicio, 1, g.fin);
    });
    fila1.height = 20;

    // ── Fila 2: cabeceras de campo ────────────────────────────────────────
    var fila2 = ws.getRow(2);
    STAFF_COLS.forEach(function(col, i) {
        var cell = fila2.getCell(i + 1);
        cell.value = col.label;
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_HEADER } };
        cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        cell.border = {
            bottom: { style: 'medium', color: { argb: 'FF2A9080' } }
        };
        if (col.req) cell.font = { bold: true, color: { argb: 'FFFFFFEE' }, size: 10,
            underline: true };
    });
    fila2.height = 22;

    // ── Fila 3: ejemplo ──────────────────────────────────────────────────
    var ejemploAgt = {
        codigo: '49274', servicio: 'Atención al Cliente', sede: 'TORREJON',
        horas: '07:00', tipoTurno: 'ROTATIVO', inicioTurno: '07:00', finTurno: '14:00',
        inicioTurno2: '', finTurno2: '', inicioTurno3: '', finTurno3: '',
        inicioTurno4: '', finTurno4: '', horarioPartido: '',
        disponibilidad: 'NF', estado: 'ACTIVO', finAusencia: '',
        inicioVac1: '2026-07-01', finVac1: '2026-07-15',
        inicioVac2: '', finVac2: '', inicioVac3: '', finVac3: '',
        inicioVac4: '', finVac4: '',
        dlf1: '2026-05-02', dlf2: '', dlf3: '', dlf4: '', dlf5: '', dlf6: '',
        fest1: '2026-04-17', fest2: '', fest3: '', fest4: '', fest5: '', fest6: ''
    };
    var fila3 = ws.getRow(3);
    STAFF_COLS.forEach(function(col, i) {
        var cell = fila3.getCell(i + 1);
        cell.value = _stGetVal(ejemploAgt, col.key) || '';
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F8F7' } };
        cell.font  = { italic: true, color: { argb: 'FF6B8A82' }, size: 10 };
        cell.alignment = { horizontal: 'center' };
    });

    // Nota en celda A3
    var notaCell = fila3.getCell(1);
    notaCell.value = '← EJEMPLO (borrar antes de usar)';
    notaCell.font  = { italic: true, bold: true, color: { argb: 'FFE87000' }, size: 9 };

    // ── Anchos de columna ────────────────────────────────────────────────
    ws.columns = STAFF_COLS.map(function(col) {
        return { width: Math.max(Math.round(col.w / 6.8), 10) };
    });

    // ── Filas 4+ vacías con alternado de color ────────────────────────────
    for (var r = 4; r <= 13; r++) {
        var fr = ws.getRow(r);
        if (r % 2 === 0) {
            for (var c = 1; c <= STAFF_COLS.length; c++) {
                fr.getCell(c).fill = { type: 'pattern', pattern: 'solid',
                    fgColor: { argb: 'FFFAFCFB' } };
            }
        }
        fr.height = 18;
    }

    // ── Hoja Instrucciones ────────────────────────────────────────────────
    var wsI = wb.addWorksheet('Instrucciones');
    var instrTitulo = wsI.getRow(1);
    instrTitulo.getCell(1).value = 'Instrucciones de relleno — Plantilla STAFF Claudia novobanco';
    instrTitulo.getCell(1).font  = { bold: true, size: 13, color: { argb: 'FF2A9080' } };
    wsI.mergeCells(1, 1, 1, 4);

    var instrCabs = wsI.getRow(2);
    ['Campo', 'Requerido', 'Descripción', 'Valores válidos / Formato'].forEach(function(h, i) {
        var cell = instrCabs.getCell(i + 1);
        cell.value = h;
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3BB39A' } };
        cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.alignment = { horizontal: 'center' };
    });

    var instrData = [
        ['CODIGO PRODUCTOR', 'Sí',  'Identificador único del agente',             'Texto libre (sin duplicados)'],
        ['Servicio',          'No', 'Servicio al que pertenece (multi-servicio)',  'Debe coincidir con nombre de servicio configurado en la app'],
        ['SEDE',              'No', 'Ubicación física del agente',                STAFF_SEDES.join(' | ')],
        ['HORAS',             'No', 'Horas de jornada diaria',                   'HH:MM (ej: 07:00 ó 07:48)'],
        ['TIPO TURNO',        'No', 'Tipo de contrato / rotación',               STAFF_TURNOS.join(' | ')],
        ['INICIO / FIN TURNO','No', 'Hora de inicio y fin del turno principal',  'HH:MM (ej: 07:00)'],
        ['INICIO / FIN TURNO 2/3/4', 'No', 'Horas de turnos adicionales (rotativos)', 'HH:MM'],
        ['HORARIO PARTIDO',   'No', 'Descripción del horario partido',           'Ej: 09:00-14:00/16:00-19:00'],
        ['DISPONIBILIDAD',    'No', 'Días disponibles (fin de semana/festivos)',  STAFF_DISPONIBILIDADES.join(' | ')],
        ['ESTADO',            'No', 'Situación laboral actual',                  STAFF_ESTADOS.join(' | ')],
        ['FIN AUSENCIA',      'No', 'Fin de IT / MAT / baja (si aplica)',        'YYYY-MM-DD'],
        ['INICIO/FIN VAC 1-4','No', 'Períodos de vacaciones (inicio y fin)',     'YYYY-MM-DD'],
        ['DLF 1-6',           'No', 'Días Libres de Fondo',                      'YYYY-MM-DD'],
        ['FESTIVO 1-6',       'No', 'Festivos personales acordados',             'YYYY-MM-DD']
    ];
    instrData.forEach(function(row, ri) {
        var fr = wsI.getRow(ri + 3);
        row.forEach(function(val, ci) { fr.getCell(ci + 1).value = val; });
        if (ri % 2 === 0)
            for (var ci = 1; ci <= 4; ci++)
                fr.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F8F7' } };
        fr.height = 18;
    });
    wsI.columns = [{ width: 26 }, { width: 10 }, { width: 50 }, { width: 65 }];
    wsI.getRow(2).height = 20;

    // ── Generar y descargar ───────────────────────────────────────────────
    wb.xlsx.writeBuffer().then(function(buf) {
        var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'plantilla_staff_claudia_novobanco.xlsx');
        toast('Plantilla descargada con formato completo', 'success');
    }).catch(function(e) {
        toast('Error al generar la plantilla: ' + e.message, 'error');
    });
}

// ── Datos demo ────────────────────────────────────────────────────────────

function generarDemoStaff() {
    var servicios = State.config.servicios;
    if (!servicios.length) {
        toast('Configura al menos un servicio antes de generar demo.', 'warning');
        return;
    }

    var codigos = [
        '49274','48354','53011','54609','53626','51200','50431','48901',
        '52314','47800','51899','54123','49500','53777','48220',
        '50100','51456','52983','47302','54890'
    ];
    var turnos  = STAFF_TURNOS;
    var sedes   = STAFF_SEDES;

    State.staff.todos = codigos.map(function(cod, i) {
        var svc    = servicios[i % servicios.length];
        var turno  = turnos[i % turnos.length];
        var estado = i === 3 ? 'IT' : (i === 7 ? 'MAT' : 'ACTIVO');
        return {
            codigo:         cod,
            servicio:       svc.nombre,
            servicioId:     svc.id,
            sede:           sedes[i % sedes.length],
            horas:          (i % 3 === 0) ? '07:00' : '07:48',
            tipoTurno:      turno,
            inicioTurno:    '07:00',
            finTurno:       (i % 2 === 0) ? '14:00' : '15:00',
            inicioTurno2:   turno.startsWith('ROTATIVO') ? '14:00' : '',
            finTurno2:      turno.startsWith('ROTATIVO') ? '21:00' : '',
            inicioTurno3:   turno === 'ROTATIVO X 3' ? '21:00' : '',
            finTurno3:      turno === 'ROTATIVO X 3' ? '07:00' : '',
            inicioTurno4: '', finTurno4: '',
            horarioPartido: turno === 'PARTIDO' ? '09:00-14:00/16:00-19:00' : '',
            disponibilidad: 'NF',
            estado:         estado,
            finAusencia:    estado === 'IT' ? '2026-04-30' : (estado === 'MAT' ? '2026-09-01' : null),
            inicioVac1: '2026-07-01', finVac1: '2026-07-15',
            inicioVac2: null, finVac2: null,
            inicioVac3: null, finVac3: null,
            inicioVac4: null, finVac4: null,
            dlf1: '2026-05-02', dlf2: null, dlf3: null,
            dlf4: null, dlf5: null, dlf6: null,
            fest1: '2026-04-17', fest2: null, fest3: null,
            fest4: null, fest5: null, fest6: null
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
