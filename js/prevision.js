/**
 * prevision.js — Módulo Previsión de Llamadas + AHT
 * PAX Servinform · 2026
 *
 * Módulo independiente al estilo de staff.js:
 *  - Toolbar con carga de Excel (solo hoja Previsión), demo, limpiar, modo vista
 *  - Stats: total llamadas, media/día, AHT medio, pico
 *  - Tabla interactiva franjas × días (semana), doble scroll + sticky header
 *  - Clic para seleccionar celda · Ctrl+V para pegar desde Excel
 *  - Navegador de semanas
 *  - Tabs de servicio (multi-servicio)
 *
 * Depende de: state.js, parser.js, forecast.js (utilidades: generarDemoData,
 *             _fecStr, _getLunes, _addDays, _getLlam, _getAHT, _fOnPaste, fmtNum)
 */

'use strict';

// ── Estado interno del módulo ─────────────────────────────────────────────

var _pvSemanaOffset    = 0;        // offset semana relativa (para paste vía forecast.js)
var _pvMesOffset       = 0;        // offset mes para vista mensual (0 = mes actual)
var _pvServicioActivo  = null;
var _pvContainer       = null;   // referencia al div principal del módulo
var _pvModo            = 'llamadas';   // 'llamadas' | 'aht'
var _pvVista           = 'mes';        // 'mes' | 'semana'
var _pvGranularidad    = '30min';      // '15min' | '30min' | '1h'
var _pvHoraInicio      = 0;           // hora inicio servicio (0-23)
var _pvHoraFin         = 24;          // hora fin servicio (1-24)
var _pvEsDemo          = false;       // true si los datos actuales son demo generado
var _pvVistaGrafico    = false;       // true = mostrar gráfico combinado en lugar de tabla
var _pvGraficoModo     = 'mes';       // 'mes' | 'semana' | 'dia'  (solo aplica en modo gráfico)
var _pvDiaOffset       = 0;           // offset días desde hoy para vista gráfica 'dia'
var _pvChartInstance   = null;        // instancia Chart.js activa (destruir al re-render)

// ══════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════

function renderModuloPrevision(container) {
    _pvContainer = container;
    if (_pvChartInstance) { _pvChartInstance.destroy(); _pvChartInstance = null; }
    container.innerHTML = '';

    // Sincronizar estado de servicio activo con forecast.js
    var servicios = State.config.servicios;
    if (!_pvServicioActivo || !servicios.find(function(s) { return s.id === _pvServicioActivo; })) {
        _pvServicioActivo = servicios.length ? servicios[0].id : null;
    }
    // Exponer a forecast.js para que _fOnPaste y _editarCelda usen el mismo contexto
    _fServicioActivo = _pvServicioActivo;
    _fSemanaOffset   = _pvSemanaOffset;
    _fContainer      = container;

    container.appendChild(_pvRenderToolbar());
    container.appendChild(_pvRenderStats());
    container.appendChild(_pvRenderTablaPanel());

    // Registrar paste (solo una vez)
    if (!_fPasteRegistrado) {
        document.addEventListener('paste', _fOnPaste);
        _fPasteRegistrado = true;
    }
}

/**
 * Elimina los listeners globales del módulo Previsión.
 * Llamado por ui.js al abandonar el panel.
 */
function desactivarModuloPrevision() {
    if (_fPasteRegistrado) {
        document.removeEventListener('paste', _fOnPaste);
        _fPasteRegistrado = false;
    }
    if (_pvChartInstance) {
        _pvChartInstance.destroy();
        _pvChartInstance = null;
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  TOOLBAR
// ══════════════════════════════════════════════════════════════════════════

function _pvRenderToolbar() {
    var tb = document.createElement('div');
    tb.className = 'st-toolbar';

    // ── Zona de carga drag&drop ───────────────────────────────────────
    var zona = document.createElement('label');
    zona.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    zona.title = 'Cargar Excel con hoja Previsión (.xlsx / .xls)';
    zona.innerHTML = '📂 Cargar Excel';
    var inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = '.xlsx,.xls';
    inp.style.display = 'none';
    inp.addEventListener('change', function(e) {
        if (e.target.files[0]) _pvCargarExcel(e.target.files[0]);
    });
    zona.appendChild(inp);

    // Drag&drop sobre toolbar
    tb.addEventListener('dragover', function(e) { e.preventDefault(); tb.classList.add('drag-over'); });
    tb.addEventListener('dragleave', function()  { tb.classList.remove('drag-over'); });
    tb.addEventListener('drop', function(e) {
        e.preventDefault();
        tb.classList.remove('drag-over');
        var file = e.dataTransfer.files[0];
        if (file) _pvCargarExcel(file);
    });

    // ── Botones ───────────────────────────────────────────────────────
    var btnDemo = document.createElement('button');
    btnDemo.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnDemo.innerHTML = '🧪 Demo';
    btnDemo.title = 'Generar 4 semanas de datos de prueba';
    btnDemo.addEventListener('click', function() {
        _pvEsDemo = true;
        if (generarDemoData()) _pvRefrescar();
    });

    var btnLimpiar = document.createElement('button');
    btnLimpiar.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnLimpiar.innerHTML = '🗑 Limpiar';
    btnLimpiar.title = 'Borrar todos los datos de previsión';
    btnLimpiar.addEventListener('click', function() {
        if (!confirm('¿Borrar todos los datos de previsión?')) return;
        _pvEsDemo = false;
        State.forecast.llamadas = {};
        State.forecast.aht      = {};
        State.forecast.editado  = false;
        programarGuardado();
        _pvRefrescar();
        toast('Previsión borrada', 'success');
    });

    // Toggle modo llamadas / AHT
    var btnModo = document.createElement('button');
    btnModo.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnModo.id = 'pvBtnModo';
    btnModo.innerHTML = _pvModo === 'llamadas' ? '⏱ Ver AHT' : '📞 Ver llamadas';
    btnModo.title = 'Alternar entre vista de llamadas y vista de AHT';
    btnModo.addEventListener('click', function() {
        _pvModo = _pvModo === 'llamadas' ? 'aht' : 'llamadas';
        var el = document.getElementById('pvBtnModo');
        if (el) el.innerHTML = _pvModo === 'llamadas' ? '⏱ Ver AHT' : '📞 Ver llamadas';
        _pvRefrescarParcial();
    });

    // Separador + contador
    var sep = document.createElement('div');
    sep.style.cssText = 'flex:1;';

    var info = document.createElement('span');
    info.id = 'pvInfo';
    info.style.cssText = 'font-size:11px;color:var(--nb-text-light);white-space:nowrap;';
    _pvActualizarInfo(info);

    // Toggle vista mes / semana
    var btnVista = document.createElement('button');
    btnVista.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnVista.id = 'pvBtnVista';
    btnVista.innerHTML = _pvVista === 'mes' ? '📅 Semana' : '📅 Mes';
    btnVista.title = 'Alternar entre vista semanal y vista mensual';
    btnVista.addEventListener('click', function() {
        _pvVista = _pvVista === 'mes' ? 'semana' : 'mes';
        var el = document.getElementById('pvBtnVista');
        if (el) el.innerHTML = _pvVista === 'mes' ? '📅 Semana' : '📅 Mes';
        _pvRefrescarParcial();
    });

    // Botón vista gráfica
    var btnGrafico = document.createElement('button');
    btnGrafico.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnGrafico.id = 'pvBtnGrafico';
    btnGrafico.innerHTML = _pvVistaGrafico ? '📋 Tabla' : '📊 Gráfico';
    btnGrafico.title = 'Alternar entre vista tabla y vista gráfica combinada (llamadas + AHT)';
    btnGrafico.addEventListener('click', function() {
        _pvVistaGrafico = !_pvVistaGrafico;
        var el = document.getElementById('pvBtnGrafico');
        if (el) el.innerHTML = _pvVistaGrafico ? '📋 Tabla' : '📊 Gráfico';
        _pvRefrescarParcial();
    });

    // Selector granularidad
    var selGran = document.createElement('select');
    selGran.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    selGran.title = 'Granularidad de franjas';
    selGran.style.cssText = 'padding:4px 6px;font-size:11px;cursor:pointer;';
    [['15min', '15 min'], ['30min', '30 min'], ['1h', '1 hora']].forEach(function(op) {
        var o = document.createElement('option');
        o.value = op[0]; o.textContent = op[1];
        if (op[0] === _pvGranularidad) o.selected = true;
        selGran.appendChild(o);
    });
    selGran.addEventListener('change', function() {
        _pvGranularidad = selGran.value;
        var min = _pvGranularidad === '15min' ? 15 : _pvGranularidad === '1h' ? 60 : 30;
        State.config.franjas = generarFranjas(_pvHoraInicio, _pvHoraFin, min);
        if (_pvEsDemo) generarDemoData();
        _pvRefrescar();
    });

    // Selectores de horario de servicio
    function _mkHoraSel(idSel, valActual, desde, hasta, onChange) {
        var s = document.createElement('select');
        s.id = idSel;
        s.style.cssText = 'padding:3px 5px;font-size:11px;cursor:pointer;border:1px solid var(--nb-border);' +
            'border-radius:4px;background:var(--nb-white);color:var(--nb-dark);';
        for (var h = desde; h <= hasta; h++) {
            var o = document.createElement('option');
            o.value = h;
            o.textContent = (h === 24) ? '00:00' : String(h).padStart(2,'0') + ':00';
            if (h === valActual) o.selected = true;
            s.appendChild(o);
        }
        s.addEventListener('change', onChange);
        return s;
    }
    var lblHorario = document.createElement('span');
    lblHorario.style.cssText = 'font-size:11px;color:var(--nb-text-light);white-space:nowrap;align-self:center;';
    lblHorario.textContent = 'Horario:';

    var selInicio = _mkHoraSel('pvSelInicio', _pvHoraInicio, 0, 23, function() {
        _pvHoraInicio = parseInt(this.value);
        if (_pvHoraInicio >= _pvHoraFin) { _pvHoraFin = _pvHoraInicio + 1; selFin.value = _pvHoraFin; }
        var min = _pvGranularidad === '15min' ? 15 : _pvGranularidad === '1h' ? 60 : 30;
        State.config.franjas = generarFranjas(_pvHoraInicio, _pvHoraFin, min);
        if (_pvEsDemo) generarDemoData();
        _pvRefrescar();
    });
    var sepH = document.createElement('span');
    sepH.textContent = '–';
    sepH.style.cssText = 'font-size:11px;align-self:center;padding:0 2px;';
    var selFin = _mkHoraSel('pvSelFin', _pvHoraFin, 1, 24, function() {
        _pvHoraFin = parseInt(this.value);
        if (_pvHoraFin <= _pvHoraInicio) { _pvHoraInicio = _pvHoraFin - 1; selInicio.value = _pvHoraInicio; }
        var min = _pvGranularidad === '15min' ? 15 : _pvGranularidad === '1h' ? 60 : 30;
        State.config.franjas = generarFranjas(_pvHoraInicio, _pvHoraFin, min);
        if (_pvEsDemo) generarDemoData();
        _pvRefrescar();
    });

    // ── Sherpa (previsión automática desde históricos) ────────────────
    var btnSherpa = document.createElement('button');
    btnSherpa.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnSherpa.innerHTML = '🔮 Carga Sherpa';
    btnSherpa.title = 'Conectar con Sherpa para obtener la previsión automática a partir de llamadas históricas (próximamente)';
    btnSherpa.disabled = true;
    btnSherpa.style.opacity = '0.6';
    btnSherpa.style.cursor  = 'not-allowed';

    // Descarga Excel de ejemplo
    var btnEjemplo = document.createElement('button');
    btnEjemplo.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnEjemplo.innerHTML = '📥 Ejemplo';
    btnEjemplo.title = 'Descargar Excel de ejemplo (año actual, 3 formatos de franja: 15min / 30min / 1h)';
    btnEjemplo.addEventListener('click', _pvDescargarEjemplo);

    // 1-semana/mes · 2-ver AHT/llamadas · 3-horario · 4-granularidad
    // 5-gráfico · 6-sherpa · 7-carga excel · 8-demo · 9-ejemplo · 10-limpiar
    tb.appendChild(btnVista);
    tb.appendChild(btnModo);
    tb.appendChild(lblHorario);
    tb.appendChild(selInicio);
    tb.appendChild(sepH);
    tb.appendChild(selFin);
    tb.appendChild(selGran);
    tb.appendChild(btnGrafico);
    tb.appendChild(btnSherpa);
    tb.appendChild(zona);
    tb.appendChild(btnDemo);
    tb.appendChild(btnEjemplo);
    tb.appendChild(btnLimpiar);
    tb.appendChild(sep);
    tb.appendChild(info);
    return tb;
}

function _pvActualizarInfo(el) {
    var n = Object.keys(State.forecast.llamadas).length;
    (el || document.getElementById('pvInfo')).textContent =
        n ? n + ' día' + (n !== 1 ? 's' : '') + ' con datos' + (State.forecast.editado ? ' · ✏️ editado' : '') : 'Sin datos';
}

// ══════════════════════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════════════════════

function _pvRenderStats() {
    var grid = document.createElement('div');
    grid.id        = 'pvStats';
    grid.className = 'stats-grid';
    grid.style.marginBottom = '14px';
    _pvActualizarStats(grid);
    return grid;
}

function _pvActualizarStats(el) {
    var grid = el || document.getElementById('pvStats');
    if (!grid) return;

    var svcId = _pvServicioActivo;
    var totalLlam = 0, totalAHT = 0, nAHT = 0, pico = 0, picoPer = '—';

    // Iterar todos los días disponibles
    Object.keys(State.forecast.llamadas).forEach(function(fecha) {
        var dData = State.forecast.llamadas[fecha];
        if (!dData) return;
        Object.keys(dData).forEach(function(franja) {
            var llam = (dData[franja] && dData[franja][svcId] !== undefined) ? dData[franja][svcId] : 0;
            var aht  = _getAHT(fecha, franja, svcId);
            totalLlam += llam;
            if (aht > 0) { totalAHT += aht; nAHT++; }
            if (llam > pico) { pico = llam; picoPer = franja + ' ' + fecha.slice(5); }
        });
    });

    var nDias = Object.keys(State.forecast.llamadas).length;

    grid.innerHTML =
        _pvStatCard('Total llamadas', totalLlam ? fmtNum(totalLlam) : '—', '', true) +
        _pvStatCard('Media / día',    nDias ? fmtNum(Math.round(totalLlam / nDias)) : '—', '', false) +
        _pvStatCard('AHT medio',      nAHT ? fmtNum(Math.round(totalAHT / nAHT)) + ' s' : '—', '', false) +
        _pvStatCard('Pico',           pico ? fmtNum(pico) : '—', pico ? '@ ' + picoPer : '', false) +
        _pvStatCard('Días con datos', nDias || '—', '', false);
}

function _pvStatCard(label, value, sub, accent) {
    return '<div class="stat-card' + (accent ? ' accent' : '') + '">' +
        '<div class="stat-label">' + label + '</div>' +
        '<div class="stat-value">' + value + '</div>' +
        (sub ? '<div style="font-size:10px;color:var(--nb-text-light);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + sub + '</div>' : '') +
        '</div>';
}

// ══════════════════════════════════════════════════════════════════════════
//  PANEL DE TABLA (navegación + tabla + totales)
// ══════════════════════════════════════════════════════════════════════════

function _pvRenderTablaPanel() {
    var wrap = document.createElement('div');
    wrap.id = 'pvTablaPanel';
    _pvRenderTablaPanelInner(wrap);
    return wrap;
}

function _pvRenderTablaPanelInner(wrap) {
    wrap.innerHTML = '';

    var servicios = State.config.servicios;
    if (!servicios.length) {
        wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--nb-text-light);">Configura al menos un servicio.</div>';
        return;
    }

    // ── Tabs de servicio (si hay más de uno) ──────────────────────────
    if (servicios.length > 1) {
        var tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;';
        servicios.forEach(function(svc) {
            var activo = svc.id === _pvServicioActivo;
            var btn = document.createElement('button');
            btn.className = 'btn btn-' + (activo ? 'primary' : 'secondary') + ' btn-sm';
            btn.style.borderLeft = '3px solid ' + svc.color;
            btn.textContent = svc.nombre;
            btn.addEventListener('click', function() {
                _pvServicioActivo = svc.id;
                _fServicioActivo  = svc.id;
                _pvActualizarStats();
                _pvRenderTablaPanelInner(wrap);
            });
            tabs.appendChild(btn);
        });
        wrap.appendChild(tabs);
    }

    // ── Contexto según vista ──────────────────────────────────────────
    var lunes, primerDia, diaSel, rangoLabel, hayDatos, hayDatosPeriodo, crearTabla;
    var svcId = _pvServicioActivo;
    if (_pvVistaGrafico && _pvGraficoModo === 'dia') {
        diaSel          = _pvGetDiaSel(_pvDiaOffset);
        rangoLabel      = _pvFmtDia(diaSel);
        var dDia        = State.forecast.llamadas[_fecStr(diaSel)];
        hayDatosPeriodo = !!dDia;
        hayDatos        = hayDatosPeriodo && _pvFechaTiéneSvcDatos(dDia, svcId);
        crearTabla = null;
    } else if (_pvVistaGrafico && _pvGraficoModo === 'semana' || !_pvVistaGrafico && _pvVista === 'semana') {
        lunes           = _getLunes(_pvSemanaOffset);
        rangoLabel      = _fmtRangoSemana(lunes);
        hayDatosPeriodo = _pvHayDatosSemana(lunes, null);
        hayDatos        = _pvHayDatosSemana(lunes, svcId);
        crearTabla = function() { return _pvCrearTablaSemana(lunes); };
    } else {
        primerDia       = _pvGetPrimerDiaMes(_pvMesOffset);
        rangoLabel      = _pvFmtMes(primerDia);
        hayDatosPeriodo = _pvHayDatosMes(primerDia, null);
        hayDatos        = _pvHayDatosMes(primerDia, svcId);
        crearTabla = function() { return _pvCrearTablaMes(primerDia); };
    }

    // ── Navegación ───────────────────────────────────────────────────
    var nav = document.createElement('div');
    nav.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    nav.innerHTML =
        '<button class="btn btn-secondary btn-sm" id="pvBtnAnt">◀</button>' +
        '<span style="font-weight:700;font-size:13px;flex:1;text-align:center;text-transform:capitalize;" id="pvRangoLabel">' + rangoLabel + '</span>' +
        '<button class="btn btn-secondary btn-sm" id="pvBtnHoy">Hoy</button>' +
        '<button class="btn btn-secondary btn-sm" id="pvBtnSig">▶</button>';
    if (_pvVistaGrafico && _pvGraficoModo === 'dia') {
        nav.querySelector('#pvBtnAnt').onclick = function() { _pvDiaOffset--; _pvRenderTablaPanelInner(wrap); };
        nav.querySelector('#pvBtnSig').onclick = function() { _pvDiaOffset++; _pvRenderTablaPanelInner(wrap); };
        nav.querySelector('#pvBtnHoy').onclick = function() { _pvDiaOffset = 0; _pvRenderTablaPanelInner(wrap); };
    } else if (_pvVistaGrafico && _pvGraficoModo === 'semana' || !_pvVistaGrafico && _pvVista === 'semana') {
        nav.querySelector('#pvBtnAnt').onclick = function() { _pvSemanaOffset--; _fSemanaOffset = _pvSemanaOffset; _pvRenderTablaPanelInner(wrap); };
        nav.querySelector('#pvBtnSig').onclick = function() { _pvSemanaOffset++; _fSemanaOffset = _pvSemanaOffset; _pvRenderTablaPanelInner(wrap); };
        nav.querySelector('#pvBtnHoy').onclick = function() { _pvSemanaOffset = 0; _fSemanaOffset = 0; _pvRenderTablaPanelInner(wrap); };
    } else {
        nav.querySelector('#pvBtnAnt').onclick = function() { _pvMesOffset--; _pvRenderTablaPanelInner(wrap); };
        nav.querySelector('#pvBtnSig').onclick = function() { _pvMesOffset++; _pvRenderTablaPanelInner(wrap); };
        nav.querySelector('#pvBtnHoy').onclick = function() { _pvMesOffset = 0; _pvRenderTablaPanelInner(wrap); };
    }
    wrap.appendChild(nav);

    // ── Selector de modo gráfico (solo visible en modo gráfico) ───────
    if (_pvVistaGrafico) {
        var modoGraf = document.createElement('div');
        modoGraf.style.cssText = 'display:flex;gap:4px;margin-bottom:10px;';
        [['semana','📅 Semana'],['mes','📆 Mes'],['dia','📊 Día']].forEach(function(op) {
            var b = document.createElement('button');
            b.className = 'btn btn-' + (_pvGraficoModo === op[0] ? 'primary' : 'secondary') + ' btn-sm';
            b.textContent = op[1];
            b.addEventListener('click', function() {
                _pvGraficoModo = op[0];
                _pvRenderTablaPanelInner(wrap);
            });
            modoGraf.appendChild(b);
        });
        wrap.appendChild(modoGraf);
    }

    // ── Badge modo ────────────────────────────────────────────────────
    var modoBadge = document.createElement('div');
    modoBadge.style.cssText = 'margin-bottom:8px;';
    modoBadge.innerHTML = '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;' +
        'background:' + (_pvModo === 'llamadas' ? 'var(--nb-primary)' : 'var(--nb-dark)') +
        ';color:#fff;">' + (_pvModo === 'llamadas' ? '📞 Llamadas' : '⏱ AHT (seg)') + '</span>';
    wrap.appendChild(modoBadge);

    // ── Sin datos ─────────────────────────────────────────────────────
    if (!hayDatos) {
        var aviso = document.createElement('div');
        aviso.style.cssText = 'text-align:center;padding:32px;color:var(--nb-text-light);font-size:13px;' +
            'border:2px dashed var(--nb-border);border-radius:8px;margin-bottom:8px;';
        var periodoLabel = (_pvVistaGrafico && _pvGraficoModo === 'dia') ? 'este día'
            : (_pvVistaGrafico ? (_pvGraficoModo === 'semana' ? 'esta semana' : 'este mes')
            : (_pvVista === 'semana' ? 'esta semana' : 'este mes'));
        if (!hayDatosPeriodo) {
            aviso.innerHTML = 'No hay datos para ' + periodoLabel + '.<br>' +
                '<span style="font-size:11px;">Sube un Excel, pulsa <strong>Demo</strong> o descarga el <strong>Ejemplo</strong>.</span>';
        } else {
            var svcNombreAviso = (State.config.servicios.find(function(s) { return s.id === svcId; }) || {}).nombre || svcId;
            aviso.style.borderColor = 'var(--nb-orange)';
            aviso.innerHTML = '⚠️ No hay datos de <strong>' + svcNombreAviso + '</strong> para ' + periodoLabel + '.<br>' +
                '<span style="font-size:11px;">Los datos cargados pertenecen a otro servicio. ' +
                'Cambia de servicio en la barra superior o carga un Excel con datos para este servicio.</span>';
        }
        wrap.appendChild(aviso);
        return;
    }

    // ── Vista gráfica ─────────────────────────────────────────────────
    if (_pvVistaGrafico) {
        var grafRef = (_pvGraficoModo === 'dia') ? diaSel
            : (_pvGraficoModo === 'semana') ? lunes : primerDia;
        wrap.appendChild(_pvCrearGrafico(grafRef));
        return;
    }

    // ── Tabla doble scroll ────────────────────────────────────────────
    var fWrap = document.createElement('div');

    var fTopBar = document.createElement('div');
    fTopBar.id        = 'fTopBar';
    fTopBar.className = 'f-top-scroll';
    var fTopInner = document.createElement('div');
    fTopInner.className = 'f-top-inner';
    fTopBar.appendChild(fTopInner);

    var fTableScroll = document.createElement('div');
    fTableScroll.id        = 'fTableScroll';
    fTableScroll.className = 'f-table-scroll';
    var fTable = crearTabla();
    fTableScroll.appendChild(fTable);

    fWrap.appendChild(fTopBar);
    fWrap.appendChild(fTableScroll);
    wrap.appendChild(fWrap);

    // Sincronizar scrollbars
    var fSyncing = false;
    fTopBar.addEventListener('scroll', function() {
        if (fSyncing) return; fSyncing = true;
        fTableScroll.scrollLeft = fTopBar.scrollLeft;
        fSyncing = false;
    });
    fTableScroll.addEventListener('scroll', function() {
        if (fSyncing) return; fSyncing = true;
        fTopBar.scrollLeft = fTableScroll.scrollLeft;
        fSyncing = false;
    });
    requestAnimationFrame(function() {
        fTopInner.style.width  = fTable.scrollWidth + 'px';
        fTopInner.style.height = '1px';
    });

    // ── Banner ediciones manuales ─────────────────────────────────────
    if (State.forecast.editado) {
        var nota = document.createElement('div');
        nota.style.cssText = 'font-size:11px;color:var(--nb-orange);margin-top:8px;display:flex;align-items:center;gap:8px;';
        nota.innerHTML = '⚠️ Hay datos editados manualmente.';
        var btnReset = document.createElement('button');
        btnReset.className = 'btn btn-secondary btn-sm';
        btnReset.textContent = 'Resetear al Excel';
        btnReset.onclick = function() {
            if (!confirm('¿Resetear todas las ediciones manuales?')) return;
            recuperarUltimoArchivo().then(function(file) {
                if (!file) { toast('No hay Excel guardado.', 'warning'); return; }
                parsearExcel(file).then(function() {
                    State.forecast.editado = false;
                    _pvRefrescar();
                    toast('Previsión recargada desde Excel.', 'success');
                }).catch(function(e) { toast('Error: ' + e.message, 'error'); });
            });
        };
        nota.appendChild(btnReset);
        wrap.appendChild(nota);
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  HELPERS DE MES
// ══════════════════════════════════════════════════════════════════════════

function _pvGetPrimerDiaMes(offset) {
    var hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
}

function _pvFmtMes(primerDia) {
    var meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return meses[primerDia.getMonth()] + ' ' + primerDia.getFullYear();
}

function _pvGetDiaSel(offset) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (offset || 0));
    return d;
}

function _pvFmtDia(d) {
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Calcula el offset de semana relativa para que _fOnPaste funcione correctamente
function _pvSemOffsetDeFecha(fechaStr) {
    var parts    = fechaStr.split('-');
    var dia      = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var dow      = dia.getDay();
    var diff     = (dow === 0 ? -6 : 1 - dow);
    var lunesDia = new Date(dia.getTime() + diff * 86400000);
    var lunesHoy = _getLunes(0);
    return Math.round((lunesDia.getTime() - lunesHoy.getTime()) / (7 * 86400000));
}

// ══════════════════════════════════════════════════════════════════════════
//  TABLA MENSUAL  (filas = días · columnas = franjas)
// ══════════════════════════════════════════════════════════════════════════

function _pvCrearTablaMes(primerDia) {
    var franjas = State.config.franjas;
    var svcId   = _pvServicioActivo;
    var modo    = _pvModo;

    // Días del mes
    var nDias = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0).getDate();
    var dias  = [];
    for (var d = 0; d < nDias; d++) {
        dias.push(new Date(primerDia.getFullYear(), primerDia.getMonth(), d + 1));
    }

    var table = document.createElement('table');
    table.id        = 'fTabla';
    table.className = 'nb-table f-table';

    // ── Cabecera: esquina + una th por franja + Total ─────────────────
    var thead = document.createElement('thead');
    var trH   = document.createElement('tr');
    var thCorner = document.createElement('th');
    thCorner.className = 'f-th-corner';
    thCorner.style.minWidth = '60px';
    thCorner.textContent = 'Día';
    trH.appendChild(thCorner);
    franjas.forEach(function(franja) {
        var th = document.createElement('th');
        th.className = 'f-th-day';
        th.style.cssText = 'min-width:44px;font-size:10px;font-weight:700;padding:4px 3px;cursor:pointer;';
        th.title = 'Clic: editar ' + franja + ' en todos los días del mes';
        th.textContent = franja;
        th.addEventListener('click', function() {
            _pvPopoverMasivo(th, '⏱ Franja ' + franja, {
                modo: 'franja',
                seleccionado: franja,
                todosItems:   franjas,
                otrosDim:     dias.map(function(d) { return _fecStr(d); }),
                svcId: svcId
            });
        });
        trH.appendChild(th);
    });
    var thTot = document.createElement('th');
    thTot.className = 'f-th-day';
    thTot.style.minWidth = '50px';
    thTot.textContent = 'Total';
    trH.appendChild(thTot);
    thead.appendChild(trH);
    table.appendChild(thead);

    // ── Cuerpo: una fila por día ──────────────────────────────────────
    var esAHT        = (modo === 'aht');
    var DIAS_ES      = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
    var tbody        = document.createElement('tbody');
    // acumuladores llamadas (siempre) y AHT (para promedios en modo AHT)
    var franjaTotals    = new Array(franjas.length).fill(0);
    var franjaAhtSum    = new Array(franjas.length).fill(0);
    var franjaAhtN      = new Array(franjas.length).fill(0);
    var grandTotal      = 0;
    var grandAhtSum     = 0;
    var grandAhtN       = 0;

    dias.forEach(function(dia) {
        var fechaStr = _fecStr(dia);
        var dow      = dia.getDay();
        var esFDS    = (dow === 0 || dow === 6);

        var tr = document.createElement('tr');
        if (esFDS) tr.style.background = '#f0faf3';

        // Celda día (sticky left) — clic abre popover para editar todo el día
        var tdDia = document.createElement('td');
        tdDia.className = 'f-td-franja';
        tdDia.style.cssText = 'font-size:11px;white-space:nowrap;min-width:60px;cursor:pointer;' +
            (esFDS ? 'color:#1a7a3a;font-weight:700;' : '');
        tdDia.title = 'Clic: editar todas las franjas de este día';
        tdDia.innerHTML =
            '<span style="font-weight:700;">' + String(dia.getDate()).padStart(2,'0') + '</span>' +
            '<span style="margin-left:3px;' + (esFDS ? '' : 'color:var(--nb-text-light);') + '">' + DIAS_ES[dow] + '</span>';
        tdDia.addEventListener('click', function() {
            _pvPopoverMasivo(tdDia, '📅 ' + fechaStr, {
                modo: 'dia',
                seleccionado: fechaStr,
                todosItems:   dias.map(function(d) { return _fecStr(d); }),
                otrosDim:     franjas,
                svcId: svcId
            });
        });
        tr.appendChild(tdDia);

        var rowTotal = 0;
        var rowAhtSum = 0, rowAhtN = 0;
        franjas.forEach(function(franja, fi) {
            var llam = _getLlam(fechaStr, franja, svcId);
            var aht  = _getAHT(fechaStr, franja, svcId);
            franjaTotals[fi] += llam;
            rowTotal          += llam;
            grandTotal        += llam;
            if (aht > 0) {
                franjaAhtSum[fi] += aht; franjaAhtN[fi]++;
                rowAhtSum        += aht; rowAhtN++;
                grandAhtSum      += aht; grandAhtN++;
            }

            var td = document.createElement('td');
            td.style.cssText = 'cursor:pointer;text-align:right;padding:3px 4px;font-size:11px;' +
                (esFDS ? 'background:#f0faf3;' : '');
            td.dataset.fecha  = fechaStr;
            td.dataset.franja = franja;
            td.dataset.svcid  = svcId;
            td.dataset.modo   = modo;
            _pvRenderCelda(td, llam, aht, modo);
            td.title = franja + ' · ' + fechaStr + ' — doble clic para editar';

            td.addEventListener('click', function() {
                var prev = document.querySelector('#fTabla td.f-sel');
                if (prev) prev.classList.remove('f-sel');
                td.classList.add('f-sel');
                _fSelCelda = { fecha: td.dataset.fecha, franja: td.dataset.franja };
                // Sync semana para que Ctrl+V paste funcione correctamente
                _pvSemanaOffset = _pvSemOffsetDeFecha(td.dataset.fecha);
                _fSemanaOffset  = _pvSemanaOffset;
            });
            td.addEventListener('dblclick', function() { _pvEditarCelda(td); });
            tr.appendChild(td);
        });

        // Columna total / promedio AHT fila
        var tdTot = document.createElement('td');
        tdTot.style.cssText = 'font-size:11px;font-weight:700;background:rgba(0,0,0,0.04);text-align:right;padding:3px 5px;';
        if (esAHT) {
            tdTot.textContent = rowAhtN ? Math.round(rowAhtSum / rowAhtN) + ' s' : '—';
        } else {
            tdTot.textContent = rowTotal ? fmtNum(rowTotal) : '—';
        }
        tr.appendChild(tdTot);
        tbody.appendChild(tr);
    });

    // ── Fila totales (sticky bottom) ──────────────────────────────────
    var trTot = document.createElement('tr');
    trTot.style.cssText = 'background:var(--nb-grey-bg);font-weight:700;position:sticky;bottom:0;z-index:1;';
    var tdTotLabel = document.createElement('td');
    tdTotLabel.className = 'f-td-franja';
    tdTotLabel.style.fontSize = '11px';
    tdTotLabel.textContent = esAHT ? 'Ø AHT' : 'TOTAL';
    trTot.appendChild(tdTotLabel);
    franjas.forEach(function(franja, fi) {
        var td = document.createElement('td');
        td.style.cssText = 'font-size:10px;text-align:right;padding:3px 4px;';
        if (esAHT) {
            td.textContent = franjaAhtN[fi] ? Math.round(franjaAhtSum[fi] / franjaAhtN[fi]) + ' s' : '—';
        } else {
            td.textContent = franjaTotals[fi] ? fmtNum(franjaTotals[fi]) : '—';
        }
        trTot.appendChild(td);
    });
    var tdGrand = document.createElement('td');
    tdGrand.style.cssText = 'font-size:11px;text-align:right;padding:3px 5px;';
    if (esAHT) {
        tdGrand.textContent = grandAhtN ? Math.round(grandAhtSum / grandAhtN) + ' s' : '—';
    } else {
        tdGrand.textContent = grandTotal ? fmtNum(grandTotal) : '—';
    }
    trTot.appendChild(tdGrand);
    tbody.appendChild(trTot);
    table.appendChild(tbody);
    return table;
}

// ══════════════════════════════════════════════════════════════════════════
//  POPOVER EDICIÓN MASIVA
// ══════════════════════════════════════════════════════════════════════════

/**
 * Muestra un popover para edición masiva.
 * @param {HTMLElement} anchorEl
 * @param {string}      titulo
 * @param {object}      opts
 *   opts.modo        'franja' | 'dia'
 *   opts.seleccionado  franja o fecha actualmente clickada (pre-checked)
 *   opts.todosItems    array de todas las franjas o fechas disponibles
 *   opts.otrosDim      dimensión cruzada: fechas (si modo=franja) o franjas (si modo=dia)
 *   opts.svcId
 */
function _pvPopoverMasivo(anchorEl, titulo, opts) {
    var prev = document.getElementById('pvPopoverMasivo');
    if (prev) { prev.remove(); return; }

    var svcId    = opts.svcId;
    var modo     = opts.modo;    // 'franja' | 'dia'
    var DIAS_ES  = {'0':'Do','1':'Lu','2':'Ma','3':'Mi','4':'Ju','5':'Vi','6':'Sá'};

    // Determinar qué lista va en cada bloque
    var franjaItems = (modo === 'franja' ? opts.todosItems : opts.otrosDim).slice().sort();
    var diaItems    = (modo === 'franja' ? opts.otrosDim   : opts.todosItems).slice().sort();

    function labelDia(fecha) {
        var d = new Date(fecha + 'T00:00:00');
        return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') +
            ' ' + DIAS_ES[String(d.getDay())];
    }

    var pop = document.createElement('div');
    pop.id = 'pvPopoverMasivo';
    pop.style.cssText = 'position:fixed;z-index:9999;background:var(--nb-white);' +
        'border:1px solid var(--nb-primary);border-radius:8px;padding:12px 14px;' +
        'box-shadow:0 4px 20px rgba(0,0,0,0.22);width:280px;font-size:12px;';

    // ── Cabecera ──────────────────────────────────────────────────────
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';
    var tit = document.createElement('strong');
    tit.style.fontSize = '12px';
    tit.textContent = titulo;
    var btnX = document.createElement('button');
    btnX.style.cssText = 'background:none;border:none;cursor:pointer;font-size:18px;line-height:1;padding:0 2px;color:var(--nb-text-light);';
    btnX.textContent = '×';
    hdr.appendChild(tit); hdr.appendChild(btnX);
    pop.appendChild(hdr);

    // ── Helper: construir un bloque de checkboxes ──────────────────────
    function mkBloque(etiqueta, items, preseleccionado) {
        var wrap = document.createElement('div');
        wrap.style.marginBottom = '8px';

        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;' +
            'color:var(--nb-text-light);margin-bottom:3px;display:flex;align-items:center;gap:5px;';
        lbl.textContent = etiqueta;

        var btnT = document.createElement('button');
        btnT.style.cssText = 'font-size:9px;border:1px solid var(--nb-border);background:none;cursor:pointer;padding:1px 5px;border-radius:3px;';
        btnT.textContent = 'Todos';
        var btnN = document.createElement('button');
        btnN.style.cssText = btnT.style.cssText;
        btnN.textContent = 'Ninguno';
        lbl.appendChild(btnT); lbl.appendChild(btnN);
        wrap.appendChild(lbl);

        var list = document.createElement('div');
        list.style.cssText = 'max-height:110px;overflow-y:auto;border:1px solid var(--nb-border);' +
            'border-radius:4px;padding:4px 6px;display:flex;flex-wrap:wrap;gap:3px;';

        var chks = [];
        items.forEach(function(item) {
            var lblIten = document.createElement('label');
            lblIten.style.cssText = 'display:inline-flex;align-items:center;gap:3px;cursor:pointer;' +
                'font-size:10px;white-space:nowrap;padding:2px 5px;border-radius:3px;' +
                'background:var(--nb-grey-bg);user-select:none;';
            var chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.dataset.item = item;
            chk.style.cursor = 'pointer';
            // Pre-seleccionar: si preseleccionado es un valor concreto → solo ese; si null → todos
            chk.checked = (preseleccionado === null) ? true : (item === preseleccionado);
            lblIten.appendChild(chk);
            lblIten.appendChild(document.createTextNode(
                item.indexOf('-') > 4 ? labelDia(item) : item   // fecha YYYY-MM-DD vs franja HH:MM
            ));
            list.appendChild(lblIten);
            chks.push(chk);
        });
        wrap.appendChild(list);

        btnT.addEventListener('click', function() { chks.forEach(function(c) { c.checked = true;  }); });
        btnN.addEventListener('click', function() { chks.forEach(function(c) { c.checked = false; }); });

        return { wrap: wrap, chks: chks };
    }

    // Bloque Franjas: si abrimos desde franja → pre-check solo la seleccionada; desde día → todos
    var bFranjas = mkBloque('Franjas', franjaItems, modo === 'franja' ? opts.seleccionado : null);
    // Bloque Días:   si abrimos desde día   → pre-check solo el seleccionado; desde franja → todos
    var bDias    = mkBloque('Días',    diaItems,    modo === 'dia'    ? opts.seleccionado : null);

    pop.appendChild(bFranjas.wrap);
    pop.appendChild(bDias.wrap);

    // ── Inputs de valor ───────────────────────────────────────────────
    var fieldL = document.createElement('label');
    fieldL.style.cssText = 'display:block;margin-bottom:6px;';
    fieldL.innerHTML = '<span style="font-size:10px;color:var(--nb-text-light);">Llamadas</span><br>';
    var inpL = document.createElement('input');
    inpL.type = 'number'; inpL.min = '0'; inpL.placeholder = 'sin cambios';
    inpL.style.cssText = 'width:100%;box-sizing:border-box;padding:4px 6px;font-size:12px;' +
        'border:1px solid var(--nb-primary);border-radius:4px;';
    fieldL.appendChild(inpL);
    pop.appendChild(fieldL);

    var fieldA = document.createElement('label');
    fieldA.style.cssText = 'display:block;margin-bottom:10px;';
    fieldA.innerHTML = '<span style="font-size:10px;color:var(--nb-text-light);">AHT (seg)</span><br>';
    var inpA = document.createElement('input');
    inpA.type = 'number'; inpA.min = '0'; inpA.placeholder = 'sin cambios';
    inpA.style.cssText = 'width:100%;box-sizing:border-box;padding:4px 6px;font-size:12px;' +
        'border:1px solid var(--nb-border);border-radius:4px;';
    fieldA.appendChild(inpA);
    pop.appendChild(fieldA);

    // ── Botones ───────────────────────────────────────────────────────
    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;gap:6px;';
    var btnOk  = document.createElement('button');
    btnOk.className = 'btn btn-primary btn-sm'; btnOk.style.flex = '1'; btnOk.textContent = 'Aplicar';
    var btnCan = document.createElement('button');
    btnCan.className = 'btn btn-secondary btn-sm'; btnCan.style.flex = '1'; btnCan.textContent = 'Cancelar';
    footer.appendChild(btnOk); footer.appendChild(btnCan);
    pop.appendChild(footer);

    document.body.appendChild(pop);

    // Posicionamiento: calcular DESPUÉS de insertar para conocer la altura real del popover
    var rect    = anchorEl.getBoundingClientRect();
    var popH    = pop.getBoundingClientRect().height;
    var popW    = pop.getBoundingClientRect().width;
    var top     = rect.bottom + 4;
    var left    = Math.min(rect.left, window.innerWidth - popW - 8);
    if (left < 4) left = 4;
    if (top + popH > window.innerHeight - 4) top = Math.max(4, rect.top - popH - 4);
    pop.style.top  = top  + 'px';
    pop.style.left = left + 'px';

    function cerrar() { pop.remove(); }

    function aplicar() {
        var nuevoL = inpL.value !== '' ? (parseInt(inpL.value) || 0) : null;
        var nuevoA = inpA.value !== '' ? (parseInt(inpA.value) || 0) : null;
        if (nuevoL === null && nuevoA === null) { cerrar(); return; }

        var selFranjas = bFranjas.chks.filter(function(c) { return c.checked; }).map(function(c) { return c.dataset.item; });
        var selDias    = bDias.chks.filter(function(c)    { return c.checked; }).map(function(c) { return c.dataset.item; });
        if (!selFranjas.length || !selDias.length) {
            toast('Selecciona al menos una franja y un día.', 'warning'); return;
        }

        var count = 0;
        selDias.forEach(function(fecha) {
            selFranjas.forEach(function(franja) {
                var llam = nuevoL !== null ? nuevoL : _getLlam(fecha, franja, svcId);
                var aht  = nuevoA !== null ? nuevoA : _getAHT(fecha,  franja, svcId);
                if (!State.forecast.llamadas[fecha])          State.forecast.llamadas[fecha] = {};
                if (!State.forecast.llamadas[fecha][franja])  State.forecast.llamadas[fecha][franja] = {};
                if (!State.forecast.aht[fecha])               State.forecast.aht[fecha] = {};
                if (!State.forecast.aht[fecha][franja])       State.forecast.aht[fecha][franja] = {};
                State.forecast.llamadas[fecha][franja][svcId] = llam;
                State.forecast.aht[fecha][franja][svcId]      = aht;
                count++;
            });
        });
        State.forecast.editado = true;
        programarGuardado();
        toast('✅ ' + count + ' celda' + (count !== 1 ? 's' : '') + ' actualizadas', 'success');
        cerrar();
        _pvRefrescarParcial();
    }

    btnX.addEventListener('click',   cerrar);
    btnCan.addEventListener('click', cerrar);
    btnOk.addEventListener('click',  aplicar);
    inpL.addEventListener('keydown', function(e) {
        if (e.key === 'Enter')  { inpA.focus(); inpA.select(); }
        if (e.key === 'Escape') cerrar();
    });
    inpA.addEventListener('keydown', function(e) {
        if (e.key === 'Enter')  aplicar();
        if (e.key === 'Escape') cerrar();
    });
    setTimeout(function() {
        document.addEventListener('mousedown', function handler(ev) {
            if (!pop.contains(ev.target) && ev.target !== anchorEl) {
                cerrar();
                document.removeEventListener('mousedown', handler);
            }
        });
    }, 50);
    inpL.focus();
}

function _pvRenderCelda(td, llam, aht, modo) {
    if (modo === 'aht') {
        td.innerHTML = aht > 0
            ? '<span style="font-weight:700;">' + aht + '</span>'
            : '<span style="color:#ddd;">—</span>';
    } else {
        td.innerHTML = llam > 0
            ? '<span style="font-weight:700;">' + fmtNum(llam) + '</span>'
            : '<span style="color:#ddd;">—</span>';
    }
}

// ── Edición inline ────────────────────────────────────────────────────────

function _pvEditarCelda(td) {
    var fecha  = td.dataset.fecha;
    var franja = td.dataset.franja;
    var svcId  = td.dataset.svcid;
    var modo   = _pvModo;
    var llam0  = _getLlam(fecha, franja, svcId);
    var aht0   = _getAHT(fecha, franja, svcId);

    if (modo === 'aht') {
        // Editar solo AHT
        td.innerHTML = '<input id="pvIA" type="number" min="0" value="' + aht0 + '"' +
            ' style="width:56px;padding:2px 4px;font-size:11px;font-family:inherit;' +
            'border:1px solid var(--nb-primary);border-radius:2px;">';
        var inp = td.querySelector('#pvIA');
        function ok() {
            var v = parseInt(inp.value) || 0;
            if (!State.forecast.aht[fecha])         State.forecast.aht[fecha] = {};
            if (!State.forecast.aht[fecha][franja]) State.forecast.aht[fecha][franja] = {};
            State.forecast.aht[fecha][franja][svcId] = v;
            State.forecast.editado = true;
            programarGuardado();
            _pvRenderCelda(td, llam0, v, modo);
        }
        inp.addEventListener('blur', ok);
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                ok();
                _pvNavCelda(td, 'franja', +1);
            }
            if (e.key === 'Escape') _pvRenderCelda(td, llam0, aht0, modo);
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault(); ok();
                _pvNavCelda(td, 'fecha', +1);
            }
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault(); ok();
                _pvNavCelda(td, 'fecha', -1);
            }
        });
        inp.focus(); inp.select();
    } else {
        // Editar llamadas + AHT
        td.innerHTML =
            '<input id="pvIL" type="number" min="0" value="' + llam0 + '"' +
            ' style="width:56px;padding:2px 4px;font-size:11px;font-family:inherit;' +
            'border:1px solid var(--nb-primary);border-radius:2px;">' +
            '<br>' +
            '<input id="pvIA" type="number" min="0" value="' + aht0 + '"' +
            ' style="width:56px;padding:2px 4px;font-size:11px;font-family:inherit;' +
            'border:1px solid var(--nb-border);border-radius:2px;margin-top:2px;">';

        var inpL = td.querySelector('#pvIL');
        var inpA = td.querySelector('#pvIA');

        function confirmar() {
            var llam = parseInt(inpL.value) || 0;
            var aht  = parseInt(inpA.value) || 0;
            if (!State.forecast.llamadas[fecha])         State.forecast.llamadas[fecha] = {};
            if (!State.forecast.llamadas[fecha][franja]) State.forecast.llamadas[fecha][franja] = {};
            if (!State.forecast.aht[fecha])              State.forecast.aht[fecha] = {};
            if (!State.forecast.aht[fecha][franja])      State.forecast.aht[fecha][franja] = {};
            State.forecast.llamadas[fecha][franja][svcId] = llam;
            State.forecast.aht[fecha][franja][svcId]      = aht;
            State.forecast.editado = true;
            programarGuardado();
            _pvRenderCelda(td, llam, aht, modo);
        }
        function cancelar() { _pvRenderCelda(td, llam0, aht0, modo); }

        td.addEventListener('focusout', function handler(e) {
            if (td.contains(e.relatedTarget)) return;
            td.removeEventListener('focusout', handler);
            confirmar();
        });
        inpL.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { inpA.focus(); inpA.select(); }
            if (e.key === 'Escape') cancelar();
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                confirmar();
                _pvNavCelda(td, 'franja', +1);
            }
        });
        inpA.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                confirmar();
                _pvNavCelda(td, 'franja', +1);
            }
            if (e.key === 'Escape') cancelar();
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                confirmar();
                _pvNavCelda(td, 'fecha', +1);
            }
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                confirmar();
                _pvNavCelda(td, 'fecha', -1);
            }
        });
        inpL.focus(); inpL.select();
    }
}

// ── Navegación teclado entre celdas ──────────────────────────────────────

/**
 * Mueve el foco a la celda adyacente y abre su editor inline.
 * @param {HTMLElement} tdActual  - celda de origen
 * @param {'franja'|'fecha'} dim  - dimensión en la que moverse
 * @param {number} dir            - +1 siguiente / -1 anterior
 */
function _pvNavCelda(tdActual, dim, dir) {
    var tabla = document.getElementById('fTabla');
    if (!tabla) return;
    var celdas = Array.prototype.slice.call(tabla.querySelectorAll('td[data-fecha][data-franja]'));
    var idx    = celdas.indexOf(tdActual);
    if (idx < 0) return;

    var curFecha  = tdActual.dataset.fecha;
    var curFranja = tdActual.dataset.franja;
    // Construir listas únicas de fechas y franjas en orden de aparición
    var fechas  = [], franjas = [], seen = {};
    celdas.forEach(function(c) {
        if (!seen['f' + c.dataset.fecha])   { seen['f' + c.dataset.fecha]   = 1; fechas.push(c.dataset.fecha); }
        if (!seen['fr' + c.dataset.franja]) { seen['fr' + c.dataset.franja] = 1; franjas.push(c.dataset.franja); }
    });

    var nextFecha  = curFecha;
    var nextFranja = curFranja;
    if (dim === 'franja') {
        var fi = franjas.indexOf(curFranja) + dir;
        if (fi < 0 || fi >= franjas.length) return;
        nextFranja = franjas[fi];
    } else {
        var di = fechas.indexOf(curFecha) + dir;
        if (di < 0 || di >= fechas.length) return;
        nextFecha = fechas[di];
    }

    var dest = tabla.querySelector('td[data-fecha="' + nextFecha + '"][data-franja="' + nextFranja + '"]');
    if (dest) {
        var prev = tabla.querySelector('td.f-sel');
        if (prev) prev.classList.remove('f-sel');
        dest.classList.add('f-sel');
        _pvEditarCelda(dest);
    }
}

// ── Comprobación de datos ─────────────────────────────────────────────────

/**
 * Devuelve true si el objeto de un día tiene al menos una franja
 * con datos para el servicio indicado (o cualquiera si svcId es null).
 */
function _pvFechaTiéneSvcDatos(dData, svcId) {
    if (!dData) return false;
    var franjas = Object.keys(dData);
    for (var fi = 0; fi < franjas.length; fi++) {
        var fData = dData[franjas[fi]];
        if (!fData) continue;
        if (svcId === null) return true;   // cualquier servicio basta
        if (fData[svcId] !== undefined) return true;
    }
    return false;
}

/**
 * @param {Date}        primerDia
 * @param {string|null} svcId  null = cualquier servicio
 */
function _pvHayDatosMes(primerDia, svcId) {
    var nDias = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0).getDate();
    for (var d = 0; d < nDias; d++) {
        var f = _fecStr(new Date(primerDia.getFullYear(), primerDia.getMonth(), d + 1));
        if (_pvFechaTiéneSvcDatos(State.forecast.llamadas[f], svcId)) return true;
    }
    return false;
}

/**
 * @param {Date}        lunes
 * @param {string|null} svcId  null = cualquier servicio
 */
function _pvHayDatosSemana(lunes, svcId) {
    for (var d = 0; d < 7; d++) {
        if (_pvFechaTiéneSvcDatos(State.forecast.llamadas[_fecStr(_addDays(lunes, d))], svcId)) return true;
    }
    return false;
}

// ══════════════════════════════════════════════════════════════════════════
//  TABLA SEMANAL  (filas = franjas · columnas = días)
// ══════════════════════════════════════════════════════════════════════════

function _pvCrearTablaSemana(lunes) {
    var franjas = State.config.franjas;
    var svcId   = _pvServicioActivo;
    var modo    = _pvModo;
    var fechas  = [];
    for (var d = 0; d < 7; d++) fechas.push(_fecStr(_addDays(lunes, d)));

    var table = document.createElement('table');
    table.id        = 'fTabla';
    table.className = 'nb-table f-table';

    // ── Cabecera: corner + Lun-Dom + Total ────────────────────────────
    var thead = document.createElement('thead');
    var trH   = document.createElement('tr');
    var thCornerSem = document.createElement('th');
    thCornerSem.className = 'f-th-corner';
    thCornerSem.textContent = 'Franja';
    trH.appendChild(thCornerSem);
    fechas.forEach(function(f, i) {
        var esFDS  = (i === 5 || i === 6);
        var dDate  = _addDays(lunes, i);
        var hayDia = !!State.forecast.llamadas[f];
        var th = document.createElement('th');
        th.className = 'f-th-day' + (esFDS ? ' f-th-fds' : '');
        th.dataset.fecha = f;
        th.style.cursor = 'pointer';
        th.title = 'Clic: editar todas las franjas de este día';
        th.innerHTML = _DIAS_SHORT[i] + '<br>' +
            '<span style="font-weight:400;font-size:10px;">' + dDate.getDate() + '/' + (dDate.getMonth() + 1) + '</span>' +
            (!hayDia ? '<br><span style="font-size:9px;color:var(--nb-text-light);">sin datos</span>' : '');
        th.addEventListener('click', function() {
            _pvPopoverMasivo(th, '📅 ' + f, {
                modo: 'dia',
                seleccionado: f,
                todosItems:   fechas,
                otrosDim:     franjas,
                svcId: svcId
            });
        });
        trH.appendChild(th);
    });
    var thTotSem = document.createElement('th');
    thTotSem.className = 'f-th-day';
    thTotSem.textContent = 'Total';
    trH.appendChild(thTotSem);
    thead.appendChild(trH);
    table.appendChild(thead);

    // ── Cuerpo: una fila por franja ───────────────────────────────────
    var tbody      = document.createElement('tbody');
    var esAHT      = (modo === 'aht');
    var colTotalsL = new Array(7).fill(0);
    var colAhtSum  = new Array(7).fill(0);
    var colAhtN    = new Array(7).fill(0);
    var grandTotal = 0, grandAhtSum = 0, grandAhtN = 0;

    franjas.forEach(function(franja) {
        var tr  = document.createElement('tr');
        var tdF = document.createElement('td');
        tdF.className = 'f-td-franja';
        tdF.style.cursor = 'pointer';
        tdF.title = 'Clic: editar ' + franja + ' en los 7 días';
        tdF.textContent = franja;
        tdF.addEventListener('click', function() {
            _pvPopoverMasivo(tdF, '⏱ Franja ' + franja, {
                modo: 'franja',
                seleccionado: franja,
                todosItems:   franjas,
                otrosDim:     fechas,
                svcId: svcId
            });
        });
        tr.appendChild(tdF);

        var rowTotal = 0, rowAhtSum = 0, rowAhtN = 0;
        fechas.forEach(function(fecha, di) {
            var esDieFDS = (di === 5 || di === 6);
            var llam = _getLlam(fecha, franja, svcId);
            var aht  = _getAHT(fecha, franja, svcId);
            colTotalsL[di] += llam;
            rowTotal        += llam;
            grandTotal      += llam;
            if (aht > 0) {
                colAhtSum[di] += aht; colAhtN[di]++;
                rowAhtSum     += aht; rowAhtN++;
                grandAhtSum   += aht; grandAhtN++;
            }
            var td = document.createElement('td');
            td.style.cssText = 'cursor:pointer;text-align:right;padding:4px 6px;font-size:12px;min-width:62px;' +
                (esDieFDS ? 'background:#f0faf3;' : '');
            td.dataset.fecha  = fecha;
            td.dataset.franja = franja;
            td.dataset.svcid  = svcId;
            td.dataset.modo   = modo;
            _pvRenderCelda(td, llam, aht, modo);
            td.title = fecha + ' · ' + franja + ' — doble clic para editar';
            td.addEventListener('click', function() {
                var prev = document.querySelector('#fTabla td.f-sel');
                if (prev) prev.classList.remove('f-sel');
                td.classList.add('f-sel');
                _fSelCelda      = { fecha: td.dataset.fecha, franja: td.dataset.franja };
                _pvSemanaOffset = _pvSemOffsetDeFecha(td.dataset.fecha);
                _fSemanaOffset  = _pvSemanaOffset;
            });
            td.addEventListener('dblclick', function() { _pvEditarCelda(td); });
            tr.appendChild(td);
        });

        var tdTot = document.createElement('td');
        tdTot.style.cssText = 'font-size:12px;font-weight:700;background:var(--nb-grey-bg);text-align:right;padding:4px 6px;';
        tdTot.textContent = esAHT
            ? (rowAhtN ? Math.round(rowAhtSum / rowAhtN) + ' s' : '—')
            : (rowTotal ? fmtNum(rowTotal) : '—');
        tr.appendChild(tdTot);
        tbody.appendChild(tr);
    });

    // ── Fila totales ──────────────────────────────────────────────────
    var trTot = document.createElement('tr');
    trTot.style.cssText = 'background:var(--nb-grey-bg);font-weight:700;';
    var tdTotLabel = document.createElement('td');
    tdTotLabel.className = 'f-td-franja';
    tdTotLabel.textContent = esAHT ? 'Ø AHT' : 'TOTAL';
    trTot.appendChild(tdTotLabel);
    for (var di = 0; di < 7; di++) {
        var tdC = document.createElement('td');
        tdC.style.cssText = 'font-size:12px;text-align:right;padding:4px 6px;';
        tdC.textContent = esAHT
            ? (colAhtN[di] ? Math.round(colAhtSum[di] / colAhtN[di]) + ' s' : '—')
            : (colTotalsL[di] ? fmtNum(colTotalsL[di]) : '—');
        trTot.appendChild(tdC);
    }
    var tdGrand = document.createElement('td');
    tdGrand.style.cssText = 'font-size:12px;text-align:right;padding:4px 6px;';
    tdGrand.textContent = esAHT
        ? (grandAhtN ? Math.round(grandAhtSum / grandAhtN) + ' s' : '—')
        : (grandTotal ? fmtNum(grandTotal) : '—');
    trTot.appendChild(tdGrand);
    tbody.appendChild(trTot);
    table.appendChild(tbody);
    return table;
}

// ══════════════════════════════════════════════════════════════════════════
//  VISTA GRÁFICA  (gráfico combinado llamadas + AHT promedio)
// ══════════════════════════════════════════════════════════════════════════

function _pvCrearGrafico(ref) {
    var labels = [], dataLlam = [], dataAHT = [];
    var svcId   = _pvServicioActivo;
    var franjas = State.config.franjas;

    if (_pvGraficoModo === 'dia') {
        // X = franjas del día seleccionado
        var fechaDia = _fecStr(ref);
        franjas.forEach(function(franja) {
            var l = _getLlam(fechaDia, franja, svcId);
            var a = _getAHT(fechaDia, franja, svcId);
            labels.push(franja);
            dataLlam.push(l || null);
            dataAHT.push(a > 0 ? a : null);
        });
    } else if (_pvGraficoModo === 'semana') {
        // X = franjas horarias; datos agregados de los 7 días de la semana
        var fechasSem = [];
        for (var d = 0; d < 7; d++) fechasSem.push(_fecStr(_addDays(ref, d)));
        franjas.forEach(function(franja) {
            var sumL = 0, sumA = 0, nA = 0;
            fechasSem.forEach(function(fecha) {
                var l = _getLlam(fecha, franja, svcId);
                var a = _getAHT(fecha, franja, svcId);
                sumL += l;
                if (a > 0) { sumA += a; nA++; }
            });
            labels.push(franja);
            dataLlam.push(sumL || null);
            dataAHT.push(nA ? Math.round(sumA / nA) : null);
        });
    } else {
        // X = días del mes
        var nDias = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
        for (var dd = 1; dd <= nDias; dd++) {
            var dia   = new Date(ref.getFullYear(), ref.getMonth(), dd);
            var fecha = _fecStr(dia);
            var sumL  = 0, sumA = 0, nA = 0;
            franjas.forEach(function(franja) {
                var l = _getLlam(fecha, franja, svcId);
                var a = _getAHT(fecha, franja, svcId);
                sumL += l;
                if (a > 0) { sumA += a; nA++; }
            });
            labels.push(String(dd).padStart(2, '0'));
            dataLlam.push(sumL || null);
            dataAHT.push(nA ? Math.round(sumA / nA) : null);
        }
    }

    var outer = document.createElement('div');
    outer.style.cssText = 'position:relative;height:400px;width:100%;padding:8px 0;';
    var canvas = document.createElement('canvas');
    outer.appendChild(canvas);

    var ptRadius = labels.length > 50 ? 0 : 3;

    _pvChartInstance = new Chart(canvas, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Llamadas',
                    data: dataLlam,
                    backgroundColor: 'rgba(0,91,160,0.65)',
                    borderColor: 'rgba(0,91,160,0.9)',
                    borderWidth: 1,
                    yAxisID: 'yL',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'AHT promedio (seg)',
                    data: dataAHT,
                    borderColor: '#e87722',
                    backgroundColor: 'rgba(232,119,34,0.12)',
                    borderWidth: 2,
                    pointRadius: ptRadius,
                    pointHoverRadius: 4,
                    tension: 0.35,
                    yAxisID: 'yA',
                    order: 1,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 14 } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.datasetIndex === 0) {
                                return ' Llamadas: ' + (ctx.raw !== null ? fmtNum(ctx.raw) : '—');
                            }
                            return ' AHT: ' + (ctx.raw !== null ? ctx.raw + ' s' : '—');
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { font: { size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 48 },
                    grid: { color: 'rgba(0,0,0,0.04)' }
                },
                yL: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    title: { display: true, text: 'Llamadas', font: { size: 11 } },
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: { font: { size: 10 } }
                },
                yA: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: 'AHT (seg)', font: { size: 11 } },
                    grid: { drawOnChartArea: false },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });

    return outer;
}

// ══════════════════════════════════════════════════════════════════════════
//  DESCARGA EXCEL DE EJEMPLO  (año actual, 3 formatos de franja)
//  Genera dos hojas: "Llamadas" (Fecha|Franja|Servicio|Llamadas)
//                    "AHT"      (Fecha|Franja|Servicio|AHT)
// ══════════════════════════════════════════════════════════════════════════

// ── Helpers internos del generador de ejemplo ────────────────────────────

function _pvPatronEjemplo(hora) {
    if (hora >= 10 && hora < 12) return 1.4;
    if (hora >= 15 && hora < 17) return 1.2;
    if (hora >=  9 && hora < 13) return 1.0;
    if (hora >= 13 && hora < 18) return 0.85;
    if (hora >= 18 && hora < 20) return 0.55;
    return 0.3;
}
function _pvPrnd(seed) { return ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff; }

/**
 * Construye una hoja transpuesta:
 *   col 0 = "Día", col 1..N = franja, fila i = un día del año
 * @param {string[]} franjas  - array de strings HH:MM
 * @param {string}   tipo     - 'llamadas' | 'aht'
 * @param {string}   svcNombre
 */
function _pvHojaTranspuesta(franjas, tipo, svcNombre) {
    // Cabecera
    var header = ['Día'].concat(franjas);
    var rows   = [header];
    var anyo   = new Date().getFullYear();

    for (var m = 0; m < 12; m++) {
        var nDias = new Date(anyo, m + 1, 0).getDate();
        for (var d = 1; d <= nDias; d++) {
            var dia  = new Date(anyo, m, d);
            var dow  = dia.getDay();
            var fds  = (dow === 0 || dow === 6);
            var str  = anyo + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var fila = [str];
            franjas.forEach(function(franja, fi) {
                var h    = parseInt(franja, 10) + (parseInt(franja.slice(3), 10) / 60);
                var f    = _pvPatronEjemplo(h) * (fds ? 0.4 : 1.0);
                var seed = d * 1000 + fi + m * 40000;
                var r    = _pvPrnd(seed);
                var val;
                if (tipo === 'llamadas') {
                    val = Math.round((18 + r * 22) * f);
                } else {
                    val = Math.max(60, Math.round(200 + (1 - r) * 80 - f * 30));
                    if (!Math.round((18 + r * 22) * f)) val = 0; // sin llamadas → sin AHT
                }
                fila.push(val || null);
            });
            rows.push(fila);
        }
    }
    return rows;
}

function _pvDescargarEjemplo() {
    var svcNombre = (State.config.servicios.length ? State.config.servicios[0].nombre : 'Servicio');
    var configs   = [
        { label: '30min', min: 30 },
        { label: '15min', min: 15 },
        { label: '1h',    min: 60 }
    ];

    var wb = XLSX.utils.book_new();
    configs.forEach(function(cfg) {
        var fr = generarFranjas(_pvHoraInicio, _pvHoraFin, cfg.min);
        var wsL = XLSX.utils.aoa_to_sheet(_pvHojaTranspuesta(fr, 'llamadas', svcNombre));
        var wsA = XLSX.utils.aoa_to_sheet(_pvHojaTranspuesta(fr, 'aht',      svcNombre));
        XLSX.utils.book_append_sheet(wb, wsL, 'Llamadas_' + cfg.label);
        XLSX.utils.book_append_sheet(wb, wsA, 'AHT_'      + cfg.label);
    });

    var buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var anyo = new Date().getFullYear();
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'prevision_ejemplo_' + anyo + '.xlsx');
    toast('Excel de ejemplo descargado (año ' + anyo + ' · 15min / 30min / 1h)', 'success');
}

// ══════════════════════════════════════════════════════════════════════════
//  CARGA DE EXCEL (solo hoja Previsión)
// ══════════════════════════════════════════════════════════════════════════

function _pvCargarExcel(file) {
    mostrarProgreso('Cargando previsión...', 20, file.name);
    parsearExcel(file)
        .then(function(res) {
            mostrarProgreso('Procesando...', 90, 'Finalizando...');
            setTimeout(function() {
                _pvEsDemo = false;
                ocultarProgreso();
                _pvRefrescar();
                var hojas = res.hojas.join(' · ');
                toast('✅ ' + hojas, 'success');
            }, 200);
        })
        .catch(function(e) {
            ocultarProgreso();
            toast('Error al cargar: ' + e.message, 'error');
        });
}

// ══════════════════════════════════════════════════════════════════════════
//  REFRESCO
// ══════════════════════════════════════════════════════════════════════════

/**
 * Refresco COMPLETO: reconstruye toolbar + stats + tabla.
 * Usar cuando cambian franjas, modo, vista, o datos completos.
 */
function _pvRefrescar() {
    if (!_pvContainer) return;
    // Sincronizar estado compartido con forecast.js
    _fServicioActivo = _pvServicioActivo;
    _fSemanaOffset   = _pvSemanaOffset;
    _fContainer      = _pvContainer;
    renderModuloPrevision(_pvContainer);
}

/**
 * Refresco PARCIAL: actualiza stats y tabla sin reconstruir el toolbar.
 * Usar después de ediciones de celdas donde la estructura no ha cambiado
 * (mismas franjas, mismo modo, mismo período). Preserva el scroll de la página.
 */
function _pvRefrescarParcial() {
    if (!_pvContainer) return;
    _fServicioActivo = _pvServicioActivo;
    _fSemanaOffset   = _pvSemanaOffset;

    // 1. Actualizar contador del toolbar
    _pvActualizarInfo();

    // 2. Actualizar tarjetas de stats
    _pvActualizarStats();

    // 3. Re-renderizar solo el panel de tabla (nav + tabla + banner)
    var wrap = document.getElementById('pvTablaPanel');
    if (wrap) {
        _pvRenderTablaPanelInner(wrap);
    } else {
        // pvTablaPanel no encontrado en el DOM: caer al refresco completo
        renderModuloPrevision(_pvContainer);
    }
}
