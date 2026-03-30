/**
 * forecast.js — Editor de previsión de llamadas + resumen de staff
 * PAX Servinform · 2026
 */

'use strict';

var _fSemanaOffset    = 0;
var _fServicioActivo  = null;
var _fContainer       = null;   // referencia al contenedor del editor
var _fSelCelda        = null;   // { fecha, franja } — celda inicio para Ctrl+V
var _fPasteRegistrado = false;

var _DIAS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ── Utilidades de fecha ───────────────────────────────────────────────────

function _getLunes(offsetSemanas) {
    var hoy = new Date();
    var dow  = hoy.getDay();
    var diff = (dow === 0) ? -6 : (1 - dow);
    var lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff + (offsetSemanas || 0) * 7);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
}

function _fecStr(d) { return d.toISOString().slice(0, 10); }

function _addDays(d, n) {
    var r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function _fmtRangoSemana(lunes) {
    var dom  = _addDays(lunes, 6);
    var opts = { day: 'numeric', month: 'short' };
    return lunes.toLocaleDateString('es-ES', opts) + ' – ' +
           dom.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Demo data ─────────────────────────────────────────────────────────────

function generarDemoData() {
    var servicios = State.config.servicios;
    var franjas   = State.config.franjas;
    if (!servicios.length || !franjas.length) {
        toast('Configura al menos un servicio antes de generar datos demo.', 'warning');
        return false;
    }
    var patron = _patronHorario(franjas);
    var lunes  = _getLunes(0);

    for (var d = 0; d < 28; d++) {
        var fecha = _fecStr(_addDays(lunes, d));
        var esFDS = (d % 7 === 5 || d % 7 === 6);
        State.forecast.llamadas[fecha] = {};
        State.forecast.aht[fecha]      = {};

        franjas.forEach(function(f) {
            State.forecast.llamadas[fecha][f] = {};
            State.forecast.aht[fecha][f]      = {};
            servicios.forEach(function(svc) {
                var base = esFDS ? 30 : 80;
                var llam = Math.max(0, Math.round(
                    base * (patron[f] || 0.05) * (0.75 + Math.random() * 0.5)
                ));
                var aht = Math.round(270 * (0.85 + Math.random() * 0.30));
                State.forecast.llamadas[fecha][f][svc.id] = llam;
                State.forecast.aht[fecha][f][svc.id]      = aht;
            });
        });
    }

    State.forecast.editado = false;
    programarGuardado();
    toast('Datos demo generados: 4 semanas × ' + servicios.length + ' servicio/s', 'success');
    return true;
}

function _patronHorario(franjas) {
    var p = {};
    franjas.forEach(function(f) {
        var parts = f.split(':');
        var h = parseInt(parts[0]) + parseInt(parts[1]) / 60;
        var v;
        if      (h <  8) v = 0.01;
        else if (h <  9) v = 0.04;
        else if (h < 10) v = 0.08;
        else if (h < 12) v = 0.11;
        else if (h < 13) v = 0.09;
        else if (h < 14) v = 0.05;
        else if (h < 16) v = 0.08;
        else if (h < 18) v = 0.11;
        else if (h < 19) v = 0.09;
        else if (h < 20) v = 0.07;
        else             v = 0.04;
        p[f] = v;
    });
    return p;
}

// ── Editor principal ──────────────────────────────────────────────────────

function renderEditorPrevision(container) {
    _fContainer = container;
    container.innerHTML = '';
    var servicios = State.config.servicios;

    if (!servicios.length) {
        container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--nb-text-light);">' +
            'Configura al menos un servicio antes de editar la previsión.</div>';
        return;
    }

    // Inicializar servicio activo
    if (!_fServicioActivo || !servicios.find(function(s) { return s.id === _fServicioActivo; })) {
        _fServicioActivo = servicios[0].id;
    }

    // Tabs de servicio (si hay más de uno)
    if (servicios.length > 1) {
        var tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap;';
        servicios.forEach(function(svc) {
            var activo = svc.id === _fServicioActivo;
            var btn = document.createElement('button');
            btn.className = 'btn btn-' + (activo ? 'primary' : 'secondary') + ' btn-sm';
            btn.innerHTML = '<span class="svc-dot" style="background:' + svc.color + ';margin-right:4px;"></span>' + _escF(svc.nombre);
            btn.addEventListener('click', function() { _fServicioActivo = svc.id; renderEditorPrevision(container); });
            tabs.appendChild(btn);
        });
        container.appendChild(tabs);
    }

    // Navegación de semana
    var lunes = _getLunes(_fSemanaOffset);
    var nav = document.createElement('div');
    nav.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;';
    nav.innerHTML =
        '<button class="btn btn-secondary btn-sm" id="btnSemAnt">◀</button>' +
        '<span style="font-weight:700;font-size:13px;flex:1;text-align:center;">' + _fmtRangoSemana(lunes) + '</span>' +
        '<button class="btn btn-secondary btn-sm" id="btnSemHoy">Hoy</button>' +
        '<button class="btn btn-secondary btn-sm" id="btnSemSig">▶</button>';
    container.appendChild(nav);
    nav.querySelector('#btnSemAnt').onclick = function() { _fSemanaOffset--; renderEditorPrevision(container); };
    nav.querySelector('#btnSemSig').onclick = function() { _fSemanaOffset++; renderEditorPrevision(container); };
    nav.querySelector('#btnSemHoy').onclick = function() { _fSemanaOffset = 0; renderEditorPrevision(container); };

    // ¿Hay datos para esta semana?
    if (!_hayDatosSemana(lunes)) {
        var aviso = document.createElement('div');
        aviso.style.cssText = 'text-align:center;padding:32px;color:var(--nb-text-light);font-size:13px;' +
            'border:2px dashed var(--nb-border);border-radius:8px;';
        aviso.innerHTML = 'No hay datos de previsión para esta semana.<br>' +
            '<span style="font-size:11px;">Sube un Excel en el bloque de carga o genera datos demo.</span>';
        container.appendChild(aviso);
        return;
    }

    // Tabla — arquitectura doble scroll (igual que Staff: topBar espejo + tableScroll)
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
    var fTable = _crearTablaForecast(lunes);
    fTableScroll.appendChild(fTable);

    fWrap.appendChild(fTopBar);
    fWrap.appendChild(fTableScroll);
    container.appendChild(fWrap);

    // Sincronizar scrollbars top ↔ tableScroll (sin bucle)
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

    // Registrar handler de paste exactamente una vez por sesión
    if (!_fPasteRegistrado) {
        document.addEventListener('paste', _fOnPaste);
        _fPasteRegistrado = true;
    }

    // Totales
    var tot = _calcularTotalesSemana(lunes);
    if (tot) {
        var resRow = document.createElement('div');
        resRow.style.cssText = 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;';
        resRow.innerHTML =
            _chip('Total llamadas', fmtNum(tot.totalLlam)) +
            _chip('Media / día', fmtNum(tot.mediaDiaria, 0)) +
            _chip('AHT medio', fmtNum(tot.ahtMedio, 0) + ' s') +
            _chip('Pico', fmtNum(tot.pico) + ' @ ' + tot.picoPeriodo);
        container.appendChild(resRow);
    }

    // Aviso de ediciones manuales
    if (State.forecast.editado) {
        var nota = document.createElement('div');
        nota.style.cssText = 'font-size:11px;color:var(--nb-orange);margin-top:8px;display:flex;align-items:center;gap:8px;';
        nota.innerHTML = '⚠️ Hay ediciones manuales.';
        var btnReset = document.createElement('button');
        btnReset.className = 'btn btn-secondary btn-sm';
        btnReset.textContent = 'Resetear a datos del Excel';
        btnReset.onclick = function() {
            if (!confirm('¿Resetear todas las ediciones manuales?')) return;
            recuperarUltimoArchivo().then(function(file) {
                if (!file) { toast('No hay Excel guardado para recargar.', 'warning'); return; }
                parsearExcel(file).then(function() {
                    State.forecast.editado = false;
                    renderEditorPrevision(container);
                    toast('Previsión recargada desde el Excel.', 'success');
                }).catch(function(e) { toast('Error: ' + e.message, 'error'); });
            });
        };
        nota.appendChild(btnReset);
        container.appendChild(nota);
    }
}

function _hayDatosSemana(lunes) {
    for (var d = 0; d < 7; d++) {
        if (State.forecast.llamadas[_fecStr(_addDays(lunes, d))]) return true;
    }
    return false;
}

// ── Tabla ─────────────────────────────────────────────────────────────────

function _crearTablaForecast(lunes) {
    var franjas = State.config.franjas;
    var svcId   = _fServicioActivo;
    var fechas  = [];
    for (var d = 0; d < 7; d++) fechas.push(_fecStr(_addDays(lunes, d)));

    var table = document.createElement('table');
    table.id        = 'fTabla';
    table.className = 'nb-table f-table';
    table.style.minWidth = '580px';

    // Cabecera con sticky top (funciona porque .f-table-scroll tiene overflow:auto + max-height)
    var thead = document.createElement('thead');
    var trH   = document.createElement('tr');
    // Esquina: sticky top + left (z-index mayor para que no quede tapada)
    trH.innerHTML = '<th class="f-th-corner">Franja</th>';
    fechas.forEach(function(f, i) {
        var esFDS = (i === 5 || i === 6);
        var dDate = _addDays(lunes, i);
        trH.innerHTML += '<th class="f-th-day' + (esFDS ? ' f-th-fds' : '') + '" data-fecha="' + f + '">' +
            _DIAS_SHORT[i] + '<br>' +
            '<span style="font-weight:400;font-size:10px;">' + dDate.getDate() + '/' + (dDate.getMonth() + 1) + '</span></th>';
    });
    trH.innerHTML += '<th class="f-th-day">Total</th>';
    thead.appendChild(trH);
    table.appendChild(thead);

    // Cuerpo
    var tbody = document.createElement('tbody');
    var colTotals = new Array(7).fill(0);
    var grandTotal = 0;

    franjas.forEach(function(franja) {
        var tr = document.createElement('tr');
        var tdF = document.createElement('td');
        tdF.style.cssText = 'font-size:11px;font-weight:700;color:var(--nb-text-light);white-space:nowrap;' +
            'position:sticky;left:0;background:var(--nb-white);z-index:1;';
        tdF.textContent = franja;
        tr.appendChild(tdF);

        var rowTotal = 0;
        fechas.forEach(function(fecha, di) {
            var llam = _getLlam(fecha, franja, svcId);
            var aht  = _getAHT(fecha, franja, svcId);
            colTotals[di] += llam;
            rowTotal       += llam;
            grandTotal     += llam;

            var td = document.createElement('td');
            td.style.cssText = 'cursor:pointer;font-size:12px;padding:5px 8px;vertical-align:top;min-width:62px;';
            td.dataset.fecha  = fecha;
            td.dataset.franja = franja;
            td.dataset.svcid  = svcId;
            _renderCelda(td, llam, aht);
            td.title = 'Clic para seleccionar · doble clic para editar';
            // Clic simple: marcar como origen para Ctrl+V
            td.addEventListener('click', function() {
                var prev = document.querySelector('#fTabla td.f-sel');
                if (prev) prev.classList.remove('f-sel');
                td.classList.add('f-sel');
                _fSelCelda = { fecha: td.dataset.fecha, franja: td.dataset.franja };
            });
            td.addEventListener('dblclick', function() { _editarCelda(td); });
            tr.appendChild(td);
        });

        var tdTot = document.createElement('td');
        tdTot.style.cssText = 'font-size:12px;font-weight:700;background:var(--nb-grey-bg);';
        tdTot.textContent = rowTotal || '—';
        tr.appendChild(tdTot);
        tbody.appendChild(tr);
    });

    // Fila totales
    var trTot = document.createElement('tr');
    trTot.style.cssText = 'background:var(--nb-grey-bg);font-weight:700;';
    trTot.innerHTML = '<td style="font-size:11px;position:sticky;left:0;background:var(--nb-grey-bg);">TOTAL</td>';
    colTotals.forEach(function(t) {
        trTot.innerHTML += '<td style="font-size:12px;">' + (t || '—') + '</td>';
    });
    trTot.innerHTML += '<td style="font-size:12px;">' + (grandTotal || '—') + '</td>';
    tbody.appendChild(trTot);
    table.appendChild(tbody);
    return table;
}

function _getLlam(fecha, franja, svcId) {
    var f = State.forecast.llamadas;
    return (f[fecha] && f[fecha][franja] && f[fecha][franja][svcId] !== undefined)
        ? f[fecha][franja][svcId] : 0;
}
function _getAHT(fecha, franja, svcId) {
    var f = State.forecast.aht;
    return (f[fecha] && f[fecha][franja] && f[fecha][franja][svcId] !== undefined)
        ? f[fecha][franja][svcId] : 0;
}

function _renderCelda(td, llam, aht) {
    if (llam > 0) {
        td.innerHTML =
            '<span style="display:block;font-weight:700;">' + llam + '</span>' +
            '<span style="font-size:10px;color:var(--nb-text-light);">' + aht + ' s</span>';
    } else {
        td.innerHTML = '<span style="color:#ddd;">—</span>';
    }
}

// ── Edición inline ────────────────────────────────────────────────────────

function _editarCelda(td) {
    var fecha  = td.dataset.fecha;
    var franja = td.dataset.franja;
    var svcId  = td.dataset.svcid;
    var llam0  = _getLlam(fecha, franja, svcId);
    var aht0   = _getAHT(fecha, franja, svcId);

    td.innerHTML =
        '<input id="iLlam" type="number" min="0" value="' + llam0 + '"' +
        ' style="width:50px;padding:2px 4px;font-size:11px;font-family:inherit;' +
        'border:1px solid var(--nb-primary);border-radius:2px;">' +
        '<br>' +
        '<input id="iAHT" type="number" min="0" value="' + aht0 + '"' +
        ' style="width:50px;padding:2px 4px;font-size:11px;font-family:inherit;' +
        'border:1px solid var(--nb-border);border-radius:2px;margin-top:2px;">';

    var inpLlam = td.querySelector('#iLlam');
    var inpAHT  = td.querySelector('#iAHT');

    function confirmar() {
        var llam = parseInt(inpLlam.value)  || 0;
        var aht  = parseInt(inpAHT.value)   || 0;
        if (!State.forecast.llamadas[fecha])         State.forecast.llamadas[fecha] = {};
        if (!State.forecast.llamadas[fecha][franja]) State.forecast.llamadas[fecha][franja] = {};
        if (!State.forecast.aht[fecha])              State.forecast.aht[fecha] = {};
        if (!State.forecast.aht[fecha][franja])      State.forecast.aht[fecha][franja] = {};
        State.forecast.llamadas[fecha][franja][svcId] = llam;
        State.forecast.aht[fecha][franja][svcId]      = aht;
        State.forecast.editado = true;
        programarGuardado();
        _renderCelda(td, llam, aht);
    }

    function cancelar() { _renderCelda(td, llam0, aht0); }

    // Confirmar cuando el foco sale completamente de la celda
    td.addEventListener('focusout', function handler(e) {
        if (td.contains(e.relatedTarget)) return;
        td.removeEventListener('focusout', handler);
        confirmar();
    });

    inpLlam.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { inpAHT.focus(); inpAHT.select(); }
        if (e.key === 'Escape') { cancelar(); }
    });
    inpAHT.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') confirmar();
        if (e.key === 'Escape') cancelar();
    });

    inpLlam.focus();
    inpLlam.select();
}

// ── Cálculo de totales ────────────────────────────────────────────────────

function _calcularTotalesSemana(lunes) {
    var svcId = _fServicioActivo;
    var totalLlam = 0, totalAHT = 0, nAHT = 0, pico = 0, picoPeriodo = '';

    for (var d = 0; d < 7; d++) {
        var fecha = _fecStr(_addDays(lunes, d));
        var dData = State.forecast.llamadas[fecha];
        if (!dData) continue;
        Object.keys(dData).forEach(function(franja) {
            var llam = dData[franja][svcId] || 0;
            var aht  = (State.forecast.aht[fecha] && State.forecast.aht[fecha][franja])
                        ? (State.forecast.aht[fecha][franja][svcId] || 0) : 0;
            totalLlam += llam;
            if (aht > 0) { totalAHT += aht; nAHT++; }
            if (llam > pico) { pico = llam; picoPeriodo = _DIAS_SHORT[d] + ' ' + franja; }
        });
    }
    if (!totalLlam) return null;
    return {
        totalLlam,
        mediaDiaria: totalLlam / 7,
        ahtMedio:    nAHT > 0 ? totalAHT / nAHT : 0,
        pico,
        picoPeriodo
    };
}

// ── Resumen de Staff ──────────────────────────────────────────────────────

function renderResumenStaff(container) {
    container.innerHTML = '';
    // Asegurar que activos y servicioId están resueltos (puede llamarse sin visitar el módulo Staff)
    if (typeof _stRecalcActivos === 'function') _stRecalcActivos();

    if (!State.staff.todos.length) {
        container.innerHTML =
            '<div style="text-align:center;padding:28px;color:var(--nb-text-light);font-size:13px;' +
            'border:2px dashed var(--nb-border);border-radius:8px;">' +
            'No hay datos de plantilla cargados.<br>' +
            '<span style="font-size:11px;">Sube un Excel con hoja <strong>STAFF</strong>.</span></div>';
        return;
    }

    var todos   = State.staff.todos;
    var activos = State.staff.activos;

    // Stats
    var stats = document.createElement('div');
    stats.className = 'stats-grid';
    stats.style.marginBottom = '16px';
    stats.innerHTML =
        _statCard2('Total agentes', todos.length, true) +
        _statCard2('Activos', activos.length, false) +
        _statCard2('Ausentes / IT', todos.length - activos.length, false);
    container.appendChild(stats);

    // Tabla por servicio
    var tableDiv = document.createElement('div');
    tableDiv.className = 'table-container';

    var table = document.createElement('table');
    table.className = 'nb-table';
    table.innerHTML =
        '<thead><tr><th>Servicio</th><th>Total</th><th>Activos</th><th>Ausentes</th></tr></thead>';
    var tbody = document.createElement('tbody');

    // Normalizar nombre de servicio para comparaciones tolerantes a tildes/mayúsculas
    var normN = function(s) {
        return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    };
    State.config.servicios.forEach(function(svc) {
        var sNorm = normN(svc.nombre);
        var aSvc  = todos.filter(function(a) {
            return a.servicioId === svc.id || normN(a.servicio||'') === sNorm || normN(a.servicioId||'') === sNorm;
        });
        var aAct  = activos.filter(function(a) {
            return a.servicioId === svc.id || normN(a.servicio||'') === sNorm || normN(a.servicioId||'') === sNorm;
        });
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td><span class="svc-dot" style="background:' + svc.color + ';margin-right:6px;"></span>' + _escF(svc.nombre) + '</td>' +
            '<td>' + aSvc.length + '</td>' +
            '<td>' + aAct.length + '</td>' +
            '<td>' + (aSvc.length - aAct.length) + '</td>';
        tbody.appendChild(tr);
    });

    var sinSvc = todos.filter(function(a) {
        return !State.config.servicios.find(function(s) {
            return s.id === a.servicioId || normN(s.nombre) === normN(a.servicio||'') || normN(s.nombre) === normN(a.servicioId||'');
        });
    });
    if (sinSvc.length) {
        var trSin = document.createElement('tr');
        trSin.innerHTML = '<td style="color:var(--nb-text-light);">Sin servicio asignado</td>' +
            '<td>' + sinSvc.length + '</td><td>—</td><td>—</td>';
        tbody.appendChild(trSin);
    }

    table.appendChild(tbody);
    tableDiv.appendChild(table);
    container.appendChild(tableDiv);
}

// ── Paste desde Excel (Ctrl+V) — pega tabla de llamadas ─────────────────

function _fOnPaste(e) {
    if (_fSelCelda === null) return;
    if (!document.getElementById('fTabla')) { _fSelCelda = null; return; }

    var txt = (e.clipboardData || window.clipboardData).getData('text');
    if (!txt) return;
    e.preventDefault();

    var svcId   = _fServicioActivo;
    var lunes   = _getLunes(_fSemanaOffset);
    var franjas = State.config.franjas;
    var fechas  = [];
    for (var d = 0; d < 7; d++) fechas.push(_fecStr(_addDays(lunes, d)));

    var startFi = franjas.indexOf(_fSelCelda.franja);
    var startDi = fechas.indexOf(_fSelCelda.fecha);
    if (startFi < 0 || startDi < 0) { _fSelCelda = null; return; }

    var lineas = txt.split(/\r?\n/).filter(function(l) { return l.trim() !== ''; });
    if (!lineas.length) return;

    var pegados = 0;
    lineas.forEach(function(linea, ri) {
        var fi = startFi + ri;
        if (fi >= franjas.length) return;
        var franja = franjas[fi];
        linea.split('\t').forEach(function(val, ci) {
            var di = startDi + ci;
            if (di >= fechas.length) return;
            var fecha = fechas[di];
            var num = parseInt(String(val).replace(/[^\d]/g, ''));
            if (isNaN(num)) return;
            if (!State.forecast.llamadas[fecha])         State.forecast.llamadas[fecha] = {};
            if (!State.forecast.llamadas[fecha][franja]) State.forecast.llamadas[fecha][franja] = {};
            State.forecast.llamadas[fecha][franja][svcId] = num;
            pegados++;
        });
    });

    if (!pegados) { _fSelCelda = null; return; }
    State.forecast.editado = true;
    programarGuardado();
    _fSelCelda = null;
    if (_fContainer) renderEditorPrevision(_fContainer);
    toast(pegados + ' celda' + (pegados !== 1 ? 's' : '') + ' pegada' + (pegados !== 1 ? 's' : ''), 'success');
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _chip(label, value) {
    return '<div style="background:var(--nb-white);border:1px solid var(--nb-border);' +
        'border-radius:6px;padding:8px 14px;">' +
        '<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--nb-text-light);">' + label + '</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--nb-dark);">' + value + '</div></div>';
}

function _statCard2(label, value, accent) {
    return '<div class="stat-card' + (accent ? ' accent' : '') + '">' +
        '<div class="stat-label">' + label + '</div>' +
        '<div class="stat-value">' + value + '</div></div>';
}

function _escF(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
