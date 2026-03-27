/**
 * parser.js — Parseo de Excel (STAFF + Previsión + Último Turno) + IndexedDB
 * PAX Servinform · 2026
 *
 * Formato STAFF (columnas detectadas automáticamente):
 *   Código | Nombre | Servicio | Turno | Tipo | IT_fin | VAC1..4 | DLF1..4 | FEST1..4 | Estado
 *
 * Formato Previsión LONG (una fila por servicio/franja):
 *   Fecha | Franja | Servicio | Llamadas | AHT
 *
 * Formato Previsión WIDE (servicios como columnas pareadas):
 *   Fecha | Franja | [Svc]_Llamadas | [Svc]_AHT | ...
 */

'use strict';

// ── IndexedDB: último archivo cargado ─────────────────────────────────────

const _IDB_NAME  = 'claudia_nb_v1';
const _IDB_STORE = 'lastfile';

function _idbOpen() {
    return new Promise(function(res, rej) {
        const req = indexedDB.open(_IDB_NAME, 1);
        req.onupgradeneeded = function(e) {
            if (!e.target.result.objectStoreNames.contains(_IDB_STORE))
                e.target.result.createObjectStore(_IDB_STORE);
        };
        req.onsuccess = function(e) { res(e.target.result); };
        req.onerror   = function(e) { rej(e.target.error); };
    });
}

function guardarUltimoArchivo(file) {
    return _idbOpen().then(function(db) {
        return new Promise(function(res, rej) {
            const tx = db.transaction(_IDB_STORE, 'readwrite');
            tx.objectStore(_IDB_STORE).put(file, 'excel');
            tx.oncomplete = res;
            tx.onerror    = function(e) { rej(e.target.error); };
        });
    });
}

function recuperarUltimoArchivo() {
    return _idbOpen().then(function(db) {
        return new Promise(function(res, rej) {
            const tx  = db.transaction(_IDB_STORE, 'readonly');
            const req = tx.objectStore(_IDB_STORE).get('excel');
            req.onsuccess = function(e) { res(e.target.result || null); };
            req.onerror   = function(e) { rej(e.target.error); };
        });
    });
}

// ── Utilidades internas ───────────────────────────────────────────────────

function _norm(s) {
    if (s === null || s === undefined) return '';
    return String(s).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_]+/g, '_').trim();
}

function _findColIdx(headers) {
    const candidates = Array.prototype.slice.call(arguments, 1);
    const normH = headers.map(_norm);
    for (var i = 0; i < candidates.length; i++) {
        var idx = normH.indexOf(_norm(candidates[i]));
        if (idx >= 0) return idx;
    }
    return -1;
}

function _toDateStr(val) {
    if (!val && val !== 0) return null;
    if (val instanceof Date) {
        if (val.getFullYear() < 1900 || val.getFullYear() > 2100) return null;
        return val.getFullYear() + '-' +
               String(val.getMonth() + 1).padStart(2, '0') + '-' +
               String(val.getDate()).padStart(2, '0');
    }
    var s = String(val).trim();
    var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
}

function _toFranjaStr(val) {
    if (!val && val !== 0) return null;
    if (val instanceof Date) {
        return String(val.getHours()).padStart(2, '0') + ':' +
               String(val.getMinutes()).padStart(2, '0');
    }
    var s = String(val).trim();
    var m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) return m[1].padStart(2, '0') + ':' + m[2];
    if (typeof val === 'number' && val >= 0 && val < 1) {
        var totalMin = Math.round(val * 24 * 60);
        return String(Math.floor(totalMin / 60)).padStart(2, '0') + ':' +
               String(totalMin % 60).padStart(2, '0');
    }
    return null;
}

/** Resuelve nombre de servicio → ID en State.config.servicios (fuzzy) */
function _resolverSvcId(nombre) {
    if (!nombre) return null;
    var normNombre = _norm(String(nombre));
    var svc = State.config.servicios.find(function(s) {
        return _norm(s.nombre) === normNombre || s.id === nombre;
    });
    return svc ? svc.id : String(nombre).trim();
}

// ── Función principal ─────────────────────────────────────────────────────

/**
 * Parsea un File de Excel y actualiza State.staff + State.forecast.
 * @param {File} file
 * @returns {Promise<{ nAgentes, nRegistros, hojas }>}
 */
function parsearExcel(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var wb     = XLSX.read(e.target.result, { type: 'array', cellDates: true });
                var result = _procesarWorkbook(wb);
                guardarUltimoArchivo(file).catch(function() {});
                resolve(result);
            } catch(err) {
                reject(err);
            }
        };
        reader.onerror = function() { reject(new Error('Error al leer el fichero')); };
        reader.readAsArrayBuffer(file);
    });
}

function _procesarWorkbook(wb) {
    var result = { nAgentes: 0, nRegistros: 0, hojas: [] };
    var sheets = {};
    wb.SheetNames.forEach(function(name) { sheets[_norm(name)] = name; });

    // STAFF
    var staffKey = sheets['staff'] || sheets['plantilla'] || sheets['agentes'];
    if (staffKey) {
        var staffRows = XLSX.utils.sheet_to_json(wb.Sheets[staffKey], { header: 1, defval: '' });
        result.nAgentes = _parsearSTAFF(staffRows);
        result.hojas.push('STAFF — ' + result.nAgentes + ' agentes');
    }

    // PREVISIÓN
    var prevKey = sheets['prevision'] || sheets['forecast'] || sheets['llamadas'] ||
                  sheets['previsión'];
    if (prevKey) {
        var prevRows = XLSX.utils.sheet_to_json(wb.Sheets[prevKey], { header: 1, defval: '' });
        result.nRegistros = _parsearPrevision(prevRows);
        result.hojas.push('Previsión — ' + result.nRegistros + ' registros');
    }

    // ÚLTIMO TURNO
    var utKey = sheets['ultimo_turno'] || sheets['ultimo turno'] || sheets['cierre'];
    if (utKey) {
        State.horariosPrevios = XLSX.utils.sheet_to_json(wb.Sheets[utKey]);
        result.hojas.push('Último Turno');
    }

    return result;
}

// ── Parser STAFF ──────────────────────────────────────────────────────────

function _parsearSTAFF(rows) {
    if (!rows.length) return 0;
    var headers = rows[0].map(function(h) { return h !== null && h !== undefined ? String(h) : ''; });

    var COL = {
        codigo:   _findColIdx(headers, 'Código', 'Codigo', 'ID', 'Cód', 'Cod'),
        nombre:   _findColIdx(headers, 'Nombre', 'Name', 'Agente'),
        servicio: _findColIdx(headers, 'Servicio', 'Service', 'Cola'),
        turno:    _findColIdx(headers, 'Turno', 'Shift', 'Contrato'),
        tipo:     _findColIdx(headers, 'Tipo', 'NF/7D', 'Disponibilidad'),
        it_fin:   _findColIdx(headers, 'IT_fin', 'IT fin', 'IT', 'Baja'),
        estado:   _findColIdx(headers, 'Estado', 'Status', 'Situación', 'Situacion')
    };

    // Buscar columnas de VAC, DLF, FEST (hasta 4 de cada)
    ['vac', 'dlf', 'fest'].forEach(function(tipo) {
        COL[tipo] = [1, 2, 3, 4].map(function(n) {
            return _findColIdx(headers,
                tipo.toUpperCase() + n,
                tipo.charAt(0).toUpperCase() + tipo.slice(1) + n,
                tipo + '_' + n, tipo + n
            );
        }).filter(function(i) { return i >= 0; });
    });

    var agentes = [];
    for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (!row || !row.length) continue;
        var codigo = COL.codigo >= 0
            ? String(row[COL.codigo] || '').trim()
            : 'AG_' + r;
        if (!codigo || codigo === '') continue;

        var agente = {
            codigo:     codigo,
            nombre:     COL.nombre   >= 0 ? String(row[COL.nombre]   || '').trim() : '',
            servicio:   COL.servicio >= 0 ? String(row[COL.servicio] || '').trim() : '',
            servicioId: null,
            turno:      COL.turno    >= 0 ? String(row[COL.turno]    || '').trim() : '',
            tipo:       COL.tipo     >= 0 ? String(row[COL.tipo]     || '').trim() : 'NF',
            it_fin:     COL.it_fin   >= 0 ? _toDateStr(row[COL.it_fin])            : null,
            estado:     COL.estado   >= 0 ? String(row[COL.estado]   || '').trim() : '',
            vac:        COL.vac.map(function(i)  { return _toDateStr(row[i]); }).filter(Boolean),
            dlf:        COL.dlf.map(function(i)  { return _toDateStr(row[i]); }).filter(Boolean),
            fest:       COL.fest.map(function(i) { return _toDateStr(row[i]); }).filter(Boolean)
        };
        agente.servicioId = _resolverSvcId(agente.servicio);
        agentes.push(agente);
    }

    State.staff.todos   = agentes;
    State.staff.activos = agentes.filter(function(a) {
        if (a.it_fin) return false;
        var est = (a.estado || '').toUpperCase();
        return !['MAT', 'PAT', 'LACT', 'EXC', 'PR', 'IT'].includes(est);
    });

    return agentes.length;
}

// ── Parser Previsión ──────────────────────────────────────────────────────

function _parsearPrevision(rows) {
    if (!rows.length) return 0;
    var headers = rows[0].map(function(h) { return h !== null && h !== undefined ? String(h) : ''; });

    var colFecha    = _findColIdx(headers, 'Fecha', 'Date', 'Día', 'Dia');
    var colFranja   = _findColIdx(headers, 'Franja', 'Hora', 'Time', 'Intervalo');
    var colServicio = _findColIdx(headers, 'Servicio', 'Service', 'Cola');
    var colLlamadas = _findColIdx(headers, 'Llamadas', 'Calls', 'Volumen', 'Ncalls', 'N_calls');
    var colAHT      = _findColIdx(headers, 'AHT', 'TMO', 'AHT_s', 'Duracion', 'Duration');

    if (colFecha < 0 || colFranja < 0) {
        throw new Error('La hoja Previsión debe tener columnas "Fecha" y "Franja".');
    }

    State.forecast.llamadas = {};
    State.forecast.aht      = {};
    State.forecast.editado  = false;

    var esLong = colServicio >= 0 && colLlamadas >= 0;
    if (esLong) return _parseLong(rows, colFecha, colFranja, colServicio, colLlamadas, colAHT);
    return _parseWide(rows, headers, colFecha, colFranja);
}

function _parseLong(rows, cFecha, cFranja, cSvc, cLlam, cAHT) {
    var n = 0;
    for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (!row || !row.length) continue;
        var fecha  = _toDateStr(row[cFecha]);
        var franja = _toFranjaStr(row[cFranja]);
        if (!fecha || !franja) continue;
        var svcId  = _resolverSvcId(String(row[cSvc] || '').trim());
        var llam   = parseInt(row[cLlam]) || 0;
        var aht    = parseFloat(cAHT >= 0 ? row[cAHT] : 0) || 0;
        _setForecast(fecha, franja, svcId, llam, aht);
        n++;
    }
    return n;
}

function _parseWide(rows, headers, cFecha, cFranja) {
    // Detectar pares: NombreServicio_Llamadas / NombreServicio_AHT
    var svcCols = {};
    headers.forEach(function(h, i) {
        if (i === cFecha || i === cFranja) return;
        var normH = _norm(h);
        var mLlam = normH.match(/^(.+)_(llamadas|calls|volumen|ncalls)$/);
        var mAHT  = normH.match(/^(.+)_(aht|tmo|duracion|duration)$/);
        if (mLlam) { if (!svcCols[mLlam[1]]) svcCols[mLlam[1]] = {}; svcCols[mLlam[1]].llamadas = i; }
        if (mAHT)  { if (!svcCols[mAHT[1]])  svcCols[mAHT[1]]  = {}; svcCols[mAHT[1]].aht = i; }
    });

    var n = 0;
    for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (!row || !row.length) continue;
        var fecha  = _toDateStr(row[cFecha]);
        var franja = _toFranjaStr(row[cFranja]);
        if (!fecha || !franja) continue;
        Object.keys(svcCols).forEach(function(svcNorm) {
            var def   = svcCols[svcNorm];
            var svcId = _resolverSvcId(svcNorm);
            var llam  = def.llamadas !== undefined ? (parseInt(row[def.llamadas]) || 0) : 0;
            var aht   = def.aht      !== undefined ? (parseFloat(row[def.aht])    || 0) : 0;
            _setForecast(fecha, franja, svcId, llam, aht);
        });
        n++;
    }
    return n;
}

function _setForecast(fecha, franja, svcId, llam, aht) {
    if (!State.forecast.llamadas[fecha]) { State.forecast.llamadas[fecha] = {}; State.forecast.aht[fecha] = {}; }
    if (!State.forecast.llamadas[fecha][franja]) { State.forecast.llamadas[fecha][franja] = {}; State.forecast.aht[fecha][franja] = {}; }
    State.forecast.llamadas[fecha][franja][svcId] = llam;
    State.forecast.aht[fecha][franja][svcId]      = aht;
}
