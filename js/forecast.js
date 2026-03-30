/**
 * forecast.js — Utilidades compartidas de previsión
 * PAX Servinform · 2026
 *
 * Contiene: estado compartido, utilidades de fecha, generación de demo,
 * helpers de lectura/escritura de datos, paste Ctrl+V y resumen de staff.
 * El módulo de UI vive en prevision.js (renderModuloPrevision).
 */

'use strict';

// ── Estado compartido (leído/escrito por prevision.js) ────────────────────

var _fSemanaOffset    = 0;
var _fServicioActivo  = null;
var _fContainer       = null;
var _fSelCelda        = null;
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
    // Generar 3 meses a partir del 1er día del mes actual
    var hoy    = new Date();
    var inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    State.forecast.llamadas = {};
    State.forecast.aht      = {};

    for (var m = 0; m < 3; m++) {
        var primerMes = new Date(hoy.getFullYear(), hoy.getMonth() + m, 1);
        var nDias     = new Date(hoy.getFullYear(), hoy.getMonth() + m + 1, 0).getDate();
        for (var d = 1; d <= nDias; d++) {
            var dia   = new Date(hoy.getFullYear(), hoy.getMonth() + m, d);
            var fecha = _fecStr(dia);
            var dow   = dia.getDay();
            var esFDS = (dow === 0 || dow === 6);
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
    }

    State.forecast.editado = false;
    programarGuardado();
    toast('Datos demo generados: 3 meses × ' + servicios.length + ' servicio/s', 'success');
    return true;
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

// ── Acceso a datos (usados por prevision.js) ──────────────────────────────

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
    if (typeof _pvRefrescar === 'function') _pvRefrescar();
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
