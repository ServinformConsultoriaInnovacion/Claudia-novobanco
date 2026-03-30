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

// ══════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════

function renderModuloPrevision(container) {
    _pvContainer = container;
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
        if (generarDemoData()) _pvRefrescar();
    });

    var btnLimpiar = document.createElement('button');
    btnLimpiar.className = 'st-toolbar-btn btn btn-secondary btn-sm';
    btnLimpiar.innerHTML = '🗑 Limpiar';
    btnLimpiar.title = 'Borrar todos los datos de previsión';
    btnLimpiar.addEventListener('click', function() {
        if (!confirm('¿Borrar todos los datos de previsión?')) return;
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
        _pvRefrescar();
    });

    // Separador + contador
    var sep = document.createElement('div');
    sep.style.cssText = 'flex:1;';

    var info = document.createElement('span');
    info.id = 'pvInfo';
    info.style.cssText = 'font-size:11px;color:var(--nb-text-light);white-space:nowrap;';
    _pvActualizarInfo(info);

    tb.appendChild(zona);
    tb.appendChild(btnDemo);
    tb.appendChild(btnLimpiar);
    tb.appendChild(btnModo);
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

    // ── Navegación de mes ─────────────────────────────────────────────
    var primerDia = _pvGetPrimerDiaMes(_pvMesOffset);
    var nav = document.createElement('div');
    nav.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    nav.innerHTML =
        '<button class="btn btn-secondary btn-sm" id="pvBtnAnt">◀</button>' +
        '<span style="font-weight:700;font-size:13px;flex:1;text-align:center;text-transform:capitalize;" id="pvRangoLabel">' + _pvFmtMes(primerDia) + '</span>' +
        '<button class="btn btn-secondary btn-sm" id="pvBtnHoy">Hoy</button>' +
        '<button class="btn btn-secondary btn-sm" id="pvBtnSig">▶</button>';
    nav.querySelector('#pvBtnAnt').onclick = function() { _pvMesOffset--; _pvRenderTablaPanelInner(wrap); };
    nav.querySelector('#pvBtnSig').onclick = function() { _pvMesOffset++; _pvRenderTablaPanelInner(wrap); };
    nav.querySelector('#pvBtnHoy').onclick = function() { _pvMesOffset = 0; _pvRenderTablaPanelInner(wrap); };
    wrap.appendChild(nav);

    // ── Badge modo ────────────────────────────────────────────────────
    var modoBadge = document.createElement('div');
    modoBadge.style.cssText = 'margin-bottom:8px;';
    modoBadge.innerHTML = '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;' +
        'background:' + (_pvModo === 'llamadas' ? 'var(--nb-primary)' : 'var(--nb-dark)') +
        ';color:#fff;">' + (_pvModo === 'llamadas' ? '📞 Llamadas' : '⏱ AHT (seg)') + '</span>';
    wrap.appendChild(modoBadge);

    // ── Sin datos para este mes ───────────────────────────────────────
    if (!_pvHayDatosMes(primerDia)) {
        var aviso = document.createElement('div');
        aviso.style.cssText = 'text-align:center;padding:32px;color:var(--nb-text-light);font-size:13px;' +
            'border:2px dashed var(--nb-border);border-radius:8px;margin-bottom:8px;';
        aviso.innerHTML = 'No hay datos para este mes.<br>' +
            '<span style="font-size:11px;">Sube un Excel o pulsa <strong>Demo</strong> para generar datos de prueba.</span>';
        wrap.appendChild(aviso);
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
    var fTable = _pvCrearTablaMes(primerDia);
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
    trH.innerHTML = '<th class="f-th-corner" style="min-width:60px;">Día</th>';
    franjas.forEach(function(franja) {
        trH.innerHTML += '<th class="f-th-day" style="min-width:44px;font-size:10px;font-weight:700;padding:4px 3px;">' +
            franja + '</th>';
    });
    trH.innerHTML += '<th class="f-th-day" style="min-width:50px;">Total</th>';
    thead.appendChild(trH);
    table.appendChild(thead);

    // ── Cuerpo: una fila por día ──────────────────────────────────────
    var DIAS_ES      = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
    var tbody        = document.createElement('tbody');
    var franjaTotals = new Array(franjas.length).fill(0);
    var grandTotal   = 0;

    dias.forEach(function(dia) {
        var fechaStr = _fecStr(dia);
        var dow      = dia.getDay();
        var esFDS    = (dow === 0 || dow === 6);

        var tr = document.createElement('tr');
        if (esFDS) tr.style.background = 'var(--nb-grey-bg)';

        // Celda día (sticky left)
        var tdDia = document.createElement('td');
        tdDia.className = 'f-td-franja';
        tdDia.style.cssText = 'font-size:11px;white-space:nowrap;min-width:60px;' +
            (esFDS ? 'color:var(--nb-primary);' : '');
        tdDia.innerHTML =
            '<span style="font-weight:700;">' + String(dia.getDate()).padStart(2,'0') + '</span>' +
            '<span style="color:var(--nb-text-light);margin-left:3px;">' + DIAS_ES[dow] + '</span>';
        tr.appendChild(tdDia);

        var rowTotal = 0;
        franjas.forEach(function(franja, fi) {
            var llam = _getLlam(fechaStr, franja, svcId);
            var aht  = _getAHT(fechaStr, franja, svcId);
            franjaTotals[fi] += llam;
            rowTotal          += llam;
            grandTotal        += llam;

            var td = document.createElement('td');
            td.style.cssText = 'cursor:pointer;text-align:right;padding:3px 4px;font-size:11px;';
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

        // Columna total fila
        var tdTot = document.createElement('td');
        tdTot.style.cssText = 'font-size:11px;font-weight:700;background:rgba(0,0,0,0.04);text-align:right;padding:3px 5px;';
        tdTot.textContent = rowTotal ? fmtNum(rowTotal) : '—';
        tr.appendChild(tdTot);
        tbody.appendChild(tr);
    });

    // ── Fila totales (sticky bottom) ──────────────────────────────────
    var trTot = document.createElement('tr');
    trTot.style.cssText = 'background:var(--nb-grey-bg);font-weight:700;position:sticky;bottom:0;z-index:1;';
    var tdTotLabel = document.createElement('td');
    tdTotLabel.className = 'f-td-franja';
    tdTotLabel.style.fontSize = '11px';
    tdTotLabel.textContent = 'TOTAL';
    trTot.appendChild(tdTotLabel);
    franjaTotals.forEach(function(t) {
        var td = document.createElement('td');
        td.style.cssText = 'font-size:10px;text-align:right;padding:3px 4px;';
        td.textContent = t ? fmtNum(t) : '—';
        trTot.appendChild(td);
    });
    var tdGrand = document.createElement('td');
    tdGrand.style.cssText = 'font-size:11px;text-align:right;padding:3px 5px;';
    tdGrand.textContent = grandTotal ? fmtNum(grandTotal) : '—';
    trTot.appendChild(tdGrand);
    tbody.appendChild(trTot);
    table.appendChild(tbody);
    return table;
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
            if (e.key === 'Enter') ok();
            if (e.key === 'Escape') _pvRenderCelda(td, llam0, aht0, modo);
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
        });
        inpA.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmar();
            if (e.key === 'Escape') cancelar();
        });
        inpL.focus(); inpL.select();
    }
}

// ── Comprobación de datos para semana actual ──────────────────────────────

function _pvHayDatosMes(primerDia) {
    var nDias = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0).getDate();
    for (var d = 0; d < nDias; d++) {
        var f = _fecStr(new Date(primerDia.getFullYear(), primerDia.getMonth(), d + 1));
        if (State.forecast.llamadas[f]) return true;
    }
    return false;
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
//  REFRESCO COMPLETO
// ══════════════════════════════════════════════════════════════════════════

function _pvRefrescar() {
    if (!_pvContainer) return;
    // Sincronizar estado compartido con forecast.js
    _fServicioActivo = _pvServicioActivo;
    _fSemanaOffset   = _pvSemanaOffset;
    _fContainer      = _pvContainer;
    renderModuloPrevision(_pvContainer);
}

// ── Helper chips ──────────────────────────────────────────────────────────

function _pvChip(label, value) {
    return '<div style="background:var(--nb-white);border:1px solid var(--nb-border);' +
        'border-radius:6px;padding:8px 14px;">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--nb-text-light);">' + label + '</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--nb-dark);">' + value + '</div></div>';
}
