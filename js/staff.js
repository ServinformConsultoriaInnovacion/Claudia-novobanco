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

// Turnos reales del Excel de novobanco + turnos fijos estándar
var STAFF_TURNOS = [
    'FIJO', 'FIJO MAÑANA', 'FIJO TARDE', 'FIJO NOCHE',
    'ROTATIVO', 'ROTATIVO X 3', 'ROTATIVO X 4',
    'PARTIDO', 'PARTIDO IRR 31h', 'IRR 25h', 'IRR 28h'
];
var STAFF_DISPONIBILIDADES  = ['NF', '7D'];
var STAFF_ESTADOS           = ['ACTIVO', 'IT', 'MAT', 'PAT', 'LACT', 'P.DTO', 'PR', 'EXC'];
var STAFF_SEDES             = ['TORREJON', 'VALLADOLID'];

// Opciones para datalists de hora — cada 30 min, 0:00 a 23:30
var STAFF_HORAS_DIA = (function () {
    var slots = [];
    for (var h = 0; h < 24; h++) {
        slots.push((h < 10 ? '0' : '') + h + ':00');
        slots.push((h < 10 ? '0' : '') + h + ':30');
    }
    return slots;
}());
var STAFF_HORAS_JORNADA = ['06:00','06:30','07:00','07:30','07:48','08:00','08:30','09:00'];
var STAFF_HORARIOS_PARTIDO = [
    '09:00-14:00/15:00-18:00',
    '09:00-14:00/16:00-18:00',
    '09:00-15:00/16:00-18:00',
    '10:00-14:00/16:00-19:00',
    '08:00-13:00/15:00-18:00'
];

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
    { key: 'horas',          label: 'HORAS',             grupo: 'Turno',          tipo: 'tlist',  req: false, w: 75,  opts: STAFF_HORAS_JORNADA },
    { key: 'tipoTurno',      label: 'TIPO TURNO',        grupo: 'Turno',          tipo: 'tlist',  req: false, w: 140, opts: STAFF_TURNOS },
    { key: 'inicioTurno',    label: 'INICIO TURNO',      grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'finTurno',       label: 'FIN DE TURNO',      grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'inicioTurno2',   label: 'INICIO TURNO 2',    grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'finTurno2',      label: 'FIN TURNO 2',       grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'inicioTurno3',   label: 'INICIO TURNO 3',    grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'finTurno3',      label: 'FIN TURNO 3',       grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'inicioTurno4',   label: 'INICIO TURNO 4',    grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'finTurno4',      label: 'FIN TURNO 4',       grupo: 'Turno',          tipo: 'tlist',  req: false, w: 95,  opts: STAFF_HORAS_DIA },
    { key: 'horarioPartido', label: 'HORARIO PARTIDO',   grupo: 'Turno',          tipo: 'tlist',  req: false, w: 200, opts: STAFF_HORARIOS_PARTIDO },
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

var _stFiltroSvc       = '';       // '' = todos
var _stFiltroEstado    = '';       // '' = todos
var _stFiltrosCol      = {};       // { colKey: valorFiltro }
var _stSelOrigen       = null;     // { rowIdx, colIdx } — celda inicio de rango
var _stSelRango        = null;     // { r1, c1, r2, c2 }
var _stHistorial       = [];       // undo stack para Ctrl+Z
var _stPasteRegistrado = false;
var _stKeyRegistrado   = false;

// ── Entry point ───────────────────────────────────────────────────────────

/**
 * Renderiza el módulo completo dentro de `container`.
 * Llamado desde ui.js cuando se navega a panelStaff.
 */
function renderModuloStaff(container) {
    container.innerHTML = '';

    container.appendChild(_stRenderToolbar());

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
    /* overflow gestionado internamente por _stRenderTabla */
    container.appendChild(tablaWrap);

    var acciones = document.createElement('div');
    acciones.className = 'actions';
    acciones.style.marginTop = '10px';
    acciones.appendChild(crearBtn('Añadir agente', 'btn-secondary btn-sm', '➕', _stAgregarFila));
    container.appendChild(acciones);

    // Recalcular activos ANTES de pintar stats (datos pueden venir de localStorage)
    _stRecalcActivos();
    _stActualizar();

    if (!_stPasteRegistrado) {
        document.addEventListener('paste', _stOnPaste);
        _stPasteRegistrado = true;
    }
    if (!_stKeyRegistrado) {
        document.addEventListener('keydown', function(e) {
            var enTabla = !!document.getElementById('stTabla');
            if (!enTabla) return;
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && _stSelRango) {
                e.preventDefault();
                _stCopiarRango();
            }
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                _stUndo();
                e.preventDefault();
            }
        });
        _stKeyRegistrado = true;
    }
    // (activos ya recalculados antes de _stActualizar arriba)

    // Ajustar top de la fila sticky de filtros al alto real de la cabecera
    requestAnimationFrame(function() {
        var tabla = document.getElementById('stTabla');
        if (!tabla) return;
        var firstTh = tabla.querySelector('thead tr:first-child th');
        var h = firstTh ? (firstTh.getBoundingClientRect().height || 32) : 32;
        tabla.querySelectorAll('thead tr.st-filter-row th').forEach(function(th) {
            th.style.top = h + 'px';
        });
    });
}

// ── Panel de carga ────────────────────────────────────────────────────────

// ── Barra de herramientas compacta (sustituye al panel desplegable) ────────

function _stRenderToolbar() {
    var bar = document.createElement('div');
    bar.className = 'st-toolbar';

    // Botón de carga (label wrapping input file)
    var lbl = document.createElement('label');
    lbl.className = 'btn btn-secondary btn-sm st-toolbar-btn';
    lbl.title     = 'Arrastra un .xlsx aquí o haz clic para seleccionar archivo';
    lbl.innerHTML = '📁 Cargar Excel';
    var inp = document.createElement('input');
    inp.type   = 'file';
    inp.id     = 'stInputFile';
    inp.accept = '.xlsx,.xls';
    inp.style.display = 'none';
    inp.addEventListener('change', function(e) {
        if (e.target.files[0]) _stCargarExcel(e.target.files[0]);
    });
    lbl.appendChild(inp);

    var btnPlantilla = document.createElement('button');
    btnPlantilla.className = 'btn btn-secondary btn-sm st-toolbar-btn';
    btnPlantilla.title     = 'Descarga una plantilla Excel vacía con formato y validaciones';
    btnPlantilla.innerHTML = '📥 Plantilla vacía';
    btnPlantilla.addEventListener('click', descargarPlantillaStaff);

    var btnDemo = document.createElement('button');
    btnDemo.className = 'btn btn-secondary btn-sm st-toolbar-btn';
    btnDemo.title     = 'Genera 20 agentes de prueba para explorar la herramienta';
    btnDemo.innerHTML = '🧪 Datos demo';
    btnDemo.addEventListener('click', generarDemoStaff);

    var banner = document.createElement('div');
    banner.id = 'stBanner';
    banner.style.display = 'none';

    bar.appendChild(lbl);
    bar.appendChild(btnPlantilla);
    bar.appendChild(btnDemo);
    bar.appendChild(banner);

    // Soporte drag & drop sobre toda la barra
    bar.addEventListener('dragover', function(e) {
        e.preventDefault();
        bar.classList.add('drag-over');
    });
    bar.addEventListener('dragleave', function() { bar.classList.remove('drag-over'); });
    bar.addEventListener('drop', function(e) {
        e.preventDefault();
        bar.classList.remove('drag-over');
        var f = (e.dataTransfer.files || [])[0];
        if (f) _stCargarExcel(f);
    });

    return bar;
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

function _stActualizar(soloTbody) {
    // Stats
    var statsEl = document.getElementById('stStats');
    if (statsEl) _stRenderStats(statsEl);

    // Tabla
    var wrap = document.getElementById('stTablaWrap');
    if (wrap) {
        if (soloTbody) {
            _stActualizarTbody();
        } else {
            _stRenderTabla(wrap);
        }
    }

    // Contador
    var filas = _stGetFiltradas();
    var cEl   = document.getElementById('stContador');
    if (cEl) cEl.textContent = filas.length + ' agente' + (filas.length !== 1 ? 's' : '');
}

/** Actualiza solo el tbody sin destruir el thead (para filtros, no pierde foco) */
function _stActualizarTbody() {
    var tabla = document.getElementById('stTabla');
    if (!tabla) return;
    var filas    = _stGetFiltradas();
    var newTbody = document.createElement('tbody');

    if (!filas.length) {
        var trV = document.createElement('tr');
        var tdV = document.createElement('td');
        tdV.colSpan = STAFF_COLS.length + 1;
        tdV.style.cssText = 'text-align:center;padding:36px;color:var(--nb-text-light);font-size:13px;';
        if (!State.staff.todos.length) {
            tdV.innerHTML = '💭 Tabla vacía — sube un Excel o pulsa <strong>Datos demo</strong>.';
        } else {
            var hayFiltColTb = Object.keys(_stFiltrosCol).some(function(k) { return !!_stFiltrosCol[k]; });
            tdV.innerHTML = '🔍 No hay agentes con esos filtros.';
            if (hayFiltColTb) {
                var btnLimpF = document.createElement('button');
                btnLimpF.className = 'btn btn-secondary btn-sm';
                btnLimpF.style.cssText = 'margin-left:10px;font-size:11px;vertical-align:middle;';
                btnLimpF.textContent = '× Limpiar filtros de columna';
                btnLimpF.addEventListener('click', _stLimpiarFiltrosCol);
                tdV.appendChild(btnLimpF);
            }
        }
        trV.appendChild(tdV);
        newTbody.appendChild(trV);
    } else {
        filas.forEach(function(agente) {
            var realIdx = State.staff.todos.indexOf(agente);
            newTbody.appendChild(_stCrearFila(agente, realIdx));
        });
    }

    var old = tabla.querySelector('tbody');
    if (old) tabla.replaceChild(newTbody, old);
    else tabla.appendChild(newTbody);

    // Actualizar contador
    var cEl = document.getElementById('stContador');
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

    var normSvcNombre = function(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); };
    State.config.servicios.forEach(function(svc) {
        var svcNorm = normSvcNombre(svc.nombre);
        var n = activos.filter(function(a) {
            // Comparar por id (caso normal) o por nombre normalizado (fallback cuando el Excel
            // no tenía los servicios configurados aún y guardó el nombre como servicioId)
            return a.servicioId === svc.id ||
                   normSvcNombre(a.servicio) === svcNorm ||
                   normSvcNombre(a.servicioId) === svcNorm;
        }).length;
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

    // ── Cabecera fila 1: etiquetas ────────────────────────────────────────
    var thead = document.createElement('thead');
    var trH   = document.createElement('tr');
    var thAcc0 = document.createElement('th');
    thAcc0.style.cssText = 'width:42px;';
    trH.appendChild(thAcc0);

    STAFF_COLS.forEach(function(col) {
        var th = document.createElement('th');
        th.style.minWidth = col.w + 'px';
        th.innerHTML = col.label + (col.req ? ' <span style="color:var(--nb-red)">*</span>' : '');
        trH.appendChild(th);
    });
    thead.appendChild(trH);

    // ── Cabecera fila 2: filtros por columna estilo Excel ─────────────────
    var trF = document.createElement('tr');
    trF.className = 'st-filter-row';

    var thFAcc = document.createElement('th');
    var btnClear = document.createElement('button');
    btnClear.className = 'btn-icon';
    btnClear.title     = 'Limpiar todos los filtros';
    btnClear.innerHTML = '✕';
    btnClear.addEventListener('click', _stLimpiarFiltrosCol);
    thFAcc.appendChild(btnClear);
    trF.appendChild(thFAcc);

    STAFF_COLS.forEach(function(col) {
        var thF = document.createElement('th');
        var filter;

        // Columnas con lista de opciones (cualquier tamaño) → <select>
        if (col.tipo === 'select' || col.opts) {
            filter = document.createElement('select');
            filter.className = 'st-col-filter';
            var oAll = document.createElement('option');
            oAll.value = ''; oAll.textContent = '(todo)';
            filter.appendChild(oAll);
            (col.opts || []).forEach(function(o) {
                var opt = document.createElement('option');
                opt.value = String(o); opt.textContent = String(o);
                if (String(_stFiltrosCol[col.key] || '') === String(o)) opt.selected = true;
                filter.appendChild(opt);
            });
        // Columnas de fecha → <input type="date"> (almacenadas en YYYY-MM-DD)
        } else if (col.tipo === 'date') {
            filter = document.createElement('input');
            filter.type      = 'date';
            filter.className = 'st-col-filter';
            filter.value     = _stFiltrosCol[col.key] || '';
        // Texto libre
        } else {
            filter = document.createElement('input');
            filter.type        = 'text';
            filter.className   = 'st-col-filter';
            filter.placeholder = '…';
            filter.value       = _stFiltrosCol[col.key] || '';
        }

        filter.addEventListener('input',  function() { _stFiltrosCol[col.key] = filter.value; _stActualizarTbody(); });
        filter.addEventListener('change', function() { _stFiltrosCol[col.key] = filter.value; _stActualizarTbody(); });
        thF.appendChild(filter);
        trF.appendChild(thF);
    });
    thead.appendChild(trF);
    table.appendChild(thead);

    // ── Cuerpo ────────────────────────────────────────────────────────────
    var tbody = document.createElement('tbody');
    if (!filas.length) {
        var trV = document.createElement('tr');
        var tdV = document.createElement('td');
        tdV.colSpan = STAFF_COLS.length + 1;
        tdV.style.cssText = 'text-align:center;padding:36px;color:var(--nb-text-light);font-size:13px;';
        if (!State.staff.todos.length) {
            tdV.innerHTML = '📭 Tabla vacía — sube un Excel o pulsa <strong>Datos demo</strong>.';
        } else {
            var hayFiltColRt = Object.keys(_stFiltrosCol).some(function(k) { return !!_stFiltrosCol[k]; });
            tdV.innerHTML = '🔍 No hay agentes con esos filtros.';
            if (hayFiltColRt) {
                var btnLimpR = document.createElement('button');
                btnLimpR.className = 'btn btn-secondary btn-sm';
                btnLimpR.style.cssText = 'margin-left:10px;font-size:11px;vertical-align:middle;';
                btnLimpR.textContent = '× Limpiar filtros de columna';
                btnLimpR.addEventListener('click', _stLimpiarFiltrosCol);
                tdV.appendChild(btnLimpR);
            }
        }
        trV.appendChild(tdV);
        tbody.appendChild(trV);
    } else {
        filas.forEach(function(agente) {
            var realIdx = State.staff.todos.indexOf(agente);
            tbody.appendChild(_stCrearFila(agente, realIdx));
        });
    }
    table.appendChild(tbody);

    var info = document.createElement('div');
    info.className = 'info-box';
    info.style.cssText = 'margin-top:10px;font-size:11px;';
    info.innerHTML = '💡 Doble clic para editar · clic+<kbd>Shift</kbd> rango · <kbd>Ctrl+C</kbd> copiar · <kbd>Ctrl+V</kbd> pegar desde Excel · <kbd>Ctrl+Z</kbd> deshacer.';

    // ── Barra de desplazamiento superior (FUERA del contenedor que hace scroll) ──
    var topScroll = document.createElement('div');
    topScroll.id        = 'stTopBar';
    topScroll.className = 'st-top-scroll';
    var topInner = document.createElement('div');
    topInner.className = 'st-top-scroll-inner';
    topScroll.appendChild(topInner);

    // ── Contenedor real del scroll (X e Y en el mismo div — necesario para sticky) ──
    var tableScroll = document.createElement('div');
    tableScroll.id        = 'stTableScroll';
    tableScroll.className = 'st-table-scroll';
    tableScroll.appendChild(table);

    wrap.innerHTML = '';
    wrap.appendChild(topScroll);
    wrap.appendChild(tableScroll);
    wrap.appendChild(info);

    // Sincronizar scrollbars top ↔ tableScroll (sin bucle)
    var syncing = false;
    topScroll.addEventListener('scroll', function() {
        if (syncing) return; syncing = true;
        tableScroll.scrollLeft = topScroll.scrollLeft;
        syncing = false;
    });
    tableScroll.addEventListener('scroll', function() {
        if (syncing) return; syncing = true;
        topScroll.scrollLeft = tableScroll.scrollLeft;
        syncing = false;
    });

    // Ajustar ancho del inner + top de filtros tras pintar
    requestAnimationFrame(function() {
        topInner.style.width  = table.scrollWidth + 'px';
        topInner.style.height = '1px';
        var firstTh = table.querySelector('thead tr:first-child th');
        var hdr = firstTh ? Math.round(firstTh.getBoundingClientRect().height) : 32;
        table.querySelectorAll('thead tr.st-filter-row th').forEach(function(th) {
            th.style.top = hdr + 'px';
        });
    });
}

// ── Fila de la tabla ──────────────────────────────────────────────────────

function _stCrearFila(agente, realIdx) {
    var warns = _stValidarAgente(agente);
    var tr = document.createElement('tr');
    tr.dataset.idx = realIdx;

    // Celda de acción: eliminar + icono de warning
    var tdAcc = document.createElement('td');
    tdAcc.style.cssText = 'text-align:center;padding:2px;white-space:nowrap;';
    var btnDel = document.createElement('button');
    btnDel.className  = 'btn btn-danger btn-sm';
    btnDel.title      = 'Eliminar agente';
    btnDel.innerHTML  = '🗑';
    btnDel.style.cssText = 'padding:2px 6px;font-size:11px;';
    btnDel.addEventListener('click', function() { _stEliminarFila(realIdx); });
    tdAcc.appendChild(btnDel);
    if (warns.length) {
        var warnSpan = document.createElement('span');
        warnSpan.innerHTML  = ' ⚠️';
        warnSpan.title      = warns.join('\n');
        warnSpan.className  = 'st-warn-icon';
        tdAcc.appendChild(warnSpan);
    }
    tr.appendChild(tdAcc);

    // Celdas de datos
    STAFF_COLS.forEach(function(col, colIdx) {
        var td = document.createElement('td');
        td.dataset.col    = col.key;
        td.dataset.row    = realIdx;
        td.dataset.colIdx = colIdx;
        td.style.cssText  = 'padding:3px 6px;cursor:default;white-space:nowrap;';

        _stRenderCeldaContenido(td, agente, col);

        // Clic simple: iniciar o extender selección de rango
        td.addEventListener('click', function(e) {
            if (e.shiftKey && _stSelOrigen !== null) {
                _stSelRango = {
                    r1: Math.min(_stSelOrigen.rowIdx, realIdx),
                    c1: Math.min(_stSelOrigen.colIdx, colIdx),
                    r2: Math.max(_stSelOrigen.rowIdx, realIdx),
                    c2: Math.max(_stSelOrigen.colIdx, colIdx)
                };
            } else {
                _stSelOrigen = { rowIdx: realIdx, colIdx: colIdx };
                _stSelRango  = { r1: realIdx, c1: colIdx, r2: realIdx, c2: colIdx };
            }
            _stHighlightRango();
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
        // Custom dropdown para evitar el bug de blur del <select> nativo
        var opts2 = col.tipo === 'svc'
            ? State.config.servicios.map(function(s) { return s.nombre; })
            : (col.opts || []);

        var wrapper2 = document.createElement('div');
        wrapper2.style.cssText = 'position:relative;display:block;width:100%;';

        input = document.createElement('input');
        input.type  = 'text';
        input.value = valActual;
        input.readOnly = true;  // solo elegir de lista, no teclear
        input.style.cssText = 'width:100%;padding:3px 22px 3px 5px;' +
            'border:1px solid var(--nb-primary);border-radius:3px;' +
            'font-size:12px;font-family:inherit;background:var(--nb-white);' +
            'cursor:pointer;box-sizing:border-box;';

        var arrow = document.createElement('span');
        arrow.textContent = '▾';
        arrow.style.cssText = 'position:absolute;right:5px;top:50%;transform:translateY(-50%);' +
            'pointer-events:none;font-size:10px;color:var(--nb-text-light);';

        var ul2 = document.createElement('ul');
        ul2.className = 'st-dd-list';
        opts2.forEach(function(opt) {
            var li = document.createElement('li');
            li.textContent = opt;
            li.className   = 'st-dd-item' + (opt === valActual ? ' selected' : '');
            li.addEventListener('mousedown', function(e) {
                e.preventDefault();
                input.value = opt;
                ul2.style.display = 'none';
                confirmar();
            });
            ul2.appendChild(li);
        });

        input.addEventListener('click', function() {
            ul2.style.display = ul2.style.display === 'block' ? 'none' : 'block';
        });
        input.addEventListener('blur', function() {
            setTimeout(function() { ul2.style.display = 'none'; }, 150);
            confirmar();
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') { ul2.style.display = 'none'; td.innerHTML = ''; _stRenderCeldaContenido(td, agente, col); }
        });

        wrapper2.appendChild(input);
        wrapper2.appendChild(arrow);
        wrapper2.appendChild(ul2);
        td.innerHTML = '';
        td.appendChild(wrapper2);
        ul2.style.display = 'block'; // abrir inmediatamente
        input.focus();
        return; // ya gestionado, no continuar con el flujo genérico

    } else if (col.tipo === 'tlist') {
        // Custom dropdown: siempre muestra todas las opciones, filtra mientras escribe
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:block;width:100%;';

        input = document.createElement('input');
        input.type  = 'text';
        input.value = valActual;
        input.style.cssText = 'width:100%;min-width:' + (col.w - 12) + 'px;padding:3px 5px;' +
            'border:1px solid var(--nb-primary);border-radius:3px;font-size:12px;font-family:inherit;' +
            'background:var(--nb-white);box-sizing:border-box;';

        var ul = document.createElement('ul');
        ul.className = 'st-dd-list';

        function _populateDropdown(txt) {
            ul.innerHTML = '';
            var opts = col.opts || [];
            var lTxt = (txt || '').toLowerCase();
            opts.forEach(function(opt) {
                if (lTxt && opt.toLowerCase().indexOf(lTxt) === -1) return;
                var li = document.createElement('li');
                li.textContent = opt;
                li.className = 'st-dd-item';
                if (opt === input.value) li.classList.add('selected');
                li.addEventListener('mousedown', function(e) {
                    e.preventDefault(); // evitar blur del input
                    input.value = opt;
                    ul.innerHTML = '';
                    ul.style.display = 'none';
                    confirmar();
                });
                ul.appendChild(li);
            });
            ul.style.display = ul.children.length ? 'block' : 'none';
        }

        input.addEventListener('focus', function() { _populateDropdown(''); });
        input.addEventListener('input', function() { _populateDropdown(input.value); });

        wrapper.appendChild(input);
        wrapper.appendChild(ul);
        td.innerHTML = '';
        td.appendChild(wrapper);
        input.focus();
        input.select();
        _populateDropdown('');

    } else {
        input = document.createElement('input');
        input.type  = col.tipo === 'date' ? 'date' : 'text';
        input.value = valActual;
        input.style.cssText = 'width:100%;min-width:' + (col.w - 12) + 'px;padding:3px 5px;' +
            'border:1px solid var(--nb-primary);border-radius:3px;font-size:12px;font-family:inherit;' +
            'background:var(--nb-white);box-shadow:0 0 0 2px rgba(59,179,154,.2);box-sizing:border-box;';
        td.innerHTML = '';
        td.appendChild(input);
        input.focus();
        if (input.select && col.tipo !== 'date') input.select();
    }

    function confirmar() {
        _stSetVal(agente, col.key, input.value);
        _stRecalcActivos();
        _stRenderCeldaContenido(td, agente, col);
        td.style.cursor = 'default';
        // Actualizar icono de warning en la fila
        var tr = td.closest ? td.closest('tr') : null;
        if (tr) {
            var tdA = tr.querySelector('td:first-child');
            if (tdA) {
                var old = tdA.querySelector('.st-warn-icon'); if (old) old.remove();
                var ws = _stValidarAgente(agente);
                if (ws.length) {
                    var sp = document.createElement('span');
                    sp.innerHTML = ' ⚠️'; sp.title = ws.join('\n');
                    sp.className = 'st-warn-icon';
                    tdA.appendChild(sp);
                }
            }
        }
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
            if (inactivo.includes((a.estado || '').toUpperCase())) return false;
        } else if (_stFiltroEstado) {
            if ((a.estado || '').toUpperCase() !== _stFiltroEstado.toUpperCase()) return false;
        }

        // Filtros por columna (siempre se aplican)
        for (var key in _stFiltrosCol) {
            var fval = (_stFiltrosCol[key] || '').toLowerCase().trim();
            if (!fval) continue;
            var aval = String(_stGetVal(a, key) || '').toLowerCase();
            if (aval.indexOf(fval) === -1) return false;
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

    // Re-resolver servicioId para agentes que llegaron del localStorage con el nombre crudo
    State.staff.todos.forEach(function(a) {
        if (a.servicioId && !a.servicioId.startsWith('svc_')) {
            // Buscar si hay un servicio configurado que coincida por nombre o por id
            var found = State.config.servicios.find(function(s) {
                return s.id === a.servicioId ||
                       _norm(s.nombre) === _norm(a.servicioId) ||
                       _norm(s.nombre) === _norm(a.servicio || '');
            });
            if (found) a.servicioId = found.id;
        }
    });

    State.staff.activos = State.staff.todos.filter(function(a) {
        var est = (a.estado || '').toUpperCase();
        return !inactivo.includes(est);
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
            guardarEstado(); // guardar inmediatamente, sin esperar debounce
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
    if (_stSelOrigen === null) return;
    if (!document.getElementById('stTabla')) {
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

    // Guardar snapshot para undo ANTES de modificar
    var snapshot = [];
    lineas.forEach(function(l, ri) {
        var rowIdx = startRow + ri;
        if (rowIdx < State.staff.todos.length) {
            snapshot.push({ idx: rowIdx, data: JSON.parse(JSON.stringify(State.staff.todos[rowIdx])) });
        }
    });
    _stHistorial.push(snapshot);
    if (_stHistorial.length > 20) _stHistorial.shift();

    var pegados = 0;
    lineas.forEach(function(linea, ri) {
        var celdas = linea.split('\t');
        var rowIdx = startRow + ri;

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
    _stActualizar(true);   // soloTbody=true → no reconstruye el scroll, mantiene posición X
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
    guardarEstado(); // guardar inmediatamente tras generar demo
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

// ── Validación de agente ─────────────────────────────────────────────────────

function _stValidarAgente(agente) {
    var warns = [];
    var turno = (agente.tipoTurno || '').toUpperCase();

    var tieneT = function(n) {
        switch (n) {
            case 1: return !!(agente.inicioTurno  && agente.finTurno);
            case 2: return !!(agente.inicioTurno2 && agente.finTurno2);
            case 3: return !!(agente.inicioTurno3 && agente.finTurno3);
            case 4: return !!(agente.inicioTurno4 && agente.finTurno4);
        }
        return false;
    };

    if (turno === 'ROTATIVO X 4') {
        if (!tieneT(1) || !tieneT(2) || !tieneT(3) || !tieneT(4))
            warns.push('ROTATIVO X 4: se necesitan 4 franjas horarias (Turno 1-4)');
    } else if (turno === 'ROTATIVO X 3') {
        if (!tieneT(1) || !tieneT(2) || !tieneT(3))
            warns.push('ROTATIVO X 3: se necesitan 3 franjas horarias (Turno 1-3)');
    } else if (turno === 'ROTATIVO') {
        if (!tieneT(1) || !tieneT(2))
            warns.push('ROTATIVO: se necesitan al menos 2 franjas horarias (Turno 1 y 2)');
    }

    if (turno.indexOf('PARTIDO') !== -1 && !(agente.horarioPartido || '').trim()) {
        warns.push('Turno PARTIDO: el campo HORARIO PARTIDO no puede estar vacío');
    }

    return warns;
}

// ── Deshacer ────────────────────────────────────────────────────────────────

function _stUndo() {
    if (!_stHistorial.length) {
        toast('Nada que deshacer', 'info');
        return;
    }
    var snapshot = _stHistorial.pop();
    snapshot.forEach(function(entry) {
        if (entry.idx < State.staff.todos.length) {
            // Restaurar campo a campo (no reemplazar objeto para mantener referencias)
            var target = State.staff.todos[entry.idx];
            Object.keys(entry.data).forEach(function(k) { target[k] = entry.data[k]; });
        }
    });
    _stRecalcActivos();
    _stActualizar();
    programarGuardado();
    toast('Pegado deshecho', 'success');
}

// ── Selección visual de rango ───────────────────────────────────────────────

function _stHighlightRango() {
    document.querySelectorAll('#stTabla td.st-sel').forEach(function(c) {
        c.classList.remove('st-sel');
    });
    if (!_stSelRango) return;
    var r = _stSelRango;
    for (var row = r.r1; row <= r.r2; row++) {
        for (var col = r.c1; col <= r.c2; col++) {
            var td = document.querySelector(
                '#stTabla td[data-row="' + row + '"][data-col-idx="' + col + '"]'
            );
            if (td) td.classList.add('st-sel');
        }
    }
}

function _stLimpiarFiltrosCol() {
    _stFiltrosCol = {};
    document.querySelectorAll('.st-col-filter').forEach(function(el) {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
    });
    _stActualizar(true);
}

// ── Copiar rango al portapapeles ─────────────────────────────────────────

function _stCopiarRango() {
    if (!_stSelRango) return;
    var r = _stSelRango;
    var lines = [];
    for (var row = r.r1; row <= r.r2; row++) {
        var agente = State.staff.todos[row];
        if (!agente) continue;
        var celdas = [];
        for (var col = r.c1; col <= r.c2; col++) {
            celdas.push(String(_stGetVal(agente, STAFF_COLS[col].key) || ''));
        }
        lines.push(celdas.join('\t'));
    }
    var text = lines.join('\n');
    var n = (r.r2 - r.r1 + 1) + '×' + (r.c2 - r.c1 + 1);

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            toast('Copiadas ' + n + ' celdas — pega con Ctrl+V', 'success');
        }).catch(function() { _stCopiarFallback(text, n); });
    } else {
        _stCopiarFallback(text, n);
    }
}

function _stCopiarFallback(text, label) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('Copiadas ' + label + ' celdas', 'success'); }
    catch (e) { toast('No se pudo copiar al portapapeles', 'error'); }
    document.body.removeChild(ta);
}
