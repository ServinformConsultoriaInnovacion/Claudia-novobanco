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
    // AHT en hoja separada (complementa la hoja de llamadas: no resetea)
    var ahtKey = sheets['aht'] || sheets['tmo'];
    if (ahtKey && ahtKey !== prevKey) {
        var ahtRows = XLSX.utils.sheet_to_json(wb.Sheets[ahtKey], { header: 1, defval: '' });
        var nAHT = _parsearAHTSheet(ahtRows);
        if (nAHT) result.hojas.push('AHT — ' + nAHT + ' registros');
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
    var headers = rows[0].map(function(h) {
        return h !== null && h !== undefined ? String(h).trim().toUpperCase() : '';
    });

    function ci() {
        var args = Array.prototype.slice.call(arguments);
        for (var i = 0; i < args.length; i++) {
            var idx = headers.indexOf(args[i].toUpperCase());
            if (idx >= 0) return idx;
        }
        return -1;
    }

    // Mapa de columnas con nombres reales del fichero novobanco + alias de compatibilidad
    var COL = {
        codigo:       ci('CODIGO PRODUCTOR', 'CÓDIGO PRODUCTOR', 'CODIGO', 'ID', 'COD'),
        horas:        ci('HORAS', 'HORAS JORNADA'),
        tipoTurno:    ci('TIPO TURNO', 'TURNO', 'SHIFT', 'CONTRATO'),
        inicioTurno:  ci('INICIO TURNO', 'INICIO', 'START'),
        finTurno:     ci('FIN DE TURNO', 'FIN TURNO', 'FIN', 'END'),
        inicioTurno2: ci('INICIO TURNO 2'),
        finTurno2:    ci('FIN TURNO 2'),
        inicioTurno3: ci('INICIO TURNO 3'),
        finTurno3:    ci('FIN TURNO 3'),
        inicioTurno4: ci('INICIO TURNO 4'),
        finTurno4:    ci('FIN TURNO 4'),
        horarioPartido: ci('HORARIO PARTIDO', 'HORARIO'),
        disponibilidad: ci('DISPONIBILIDAD', 'TIPO', 'NF/7D'),
        sede:         ci('SEDE', 'LOCATION', 'UBICACION', 'UBICACIÓN'),
        estado:       ci('ESTADO', 'STATUS', 'SITUACIÓN', 'SITUACION'),
        finAusencia:  ci('FIN AUSENCIA', 'IT_FIN', 'IT FIN', 'IT', 'BAJA'),
        servicio:     ci('SERVICIO', 'SERVICE', 'COLA')
    };

    // Pares inicio/fin vacaciones
    [1, 2, 3, 4].forEach(function(n) {
        COL['inicioVac' + n] = ci('INICIO VAC ' + n, 'VAC' + n + ' INICIO', 'INICIO VACACIONES ' + n);
        COL['finVac'    + n] = ci('FIN VAC '    + n, 'VAC' + n + ' FIN',    'FIN VACACIONES '    + n);
    });

    // DLF 1-6
    [1, 2, 3, 4, 5, 6].forEach(function(n) {
        COL['dlf' + n] = ci('DLF ' + n, 'DLF' + n);
    });

    // FESTIVOS 1-6
    [1, 2, 3, 4, 5, 6].forEach(function(n) {
        COL['fest' + n] = ci('FESTIVO ' + n, 'FEST ' + n, 'FESTIVO' + n, 'FEST' + n);
    });

    function strVal(row, key) {
        var idx = COL[key];
        return idx >= 0 ? String(row[idx] || '').trim() : '';
    }
    function dateVal(row, key) {
        var idx = COL[key];
        return idx >= 0 ? _toDateStr(row[idx]) : null;
    }

    var agentes = [];
    for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (!row || !row.length) continue;
        var codigo = strVal(row, 'codigo') || ('AG_' + r);
        if (codigo === '') continue;

        var svcStr = strVal(row, 'servicio');
        var agente = {
            codigo:       codigo,
            horas:        strVal(row, 'horas'),
            tipoTurno:    strVal(row, 'tipoTurno'),
            inicioTurno:  strVal(row, 'inicioTurno'),
            finTurno:     strVal(row, 'finTurno'),
            inicioTurno2: strVal(row, 'inicioTurno2'),
            finTurno2:    strVal(row, 'finTurno2'),
            inicioTurno3: strVal(row, 'inicioTurno3'),
            finTurno3:    strVal(row, 'finTurno3'),
            inicioTurno4: strVal(row, 'inicioTurno4'),
            finTurno4:    strVal(row, 'finTurno4'),
            horarioPartido: strVal(row, 'horarioPartido'),
            disponibilidad: strVal(row, 'disponibilidad') || 'NF',
            sede:           strVal(row, 'sede'),
            estado:         strVal(row, 'estado') || 'ACTIVO',
            finAusencia:    dateVal(row, 'finAusencia'),
            servicio:       svcStr,
            servicioId:     _resolverSvcId(svcStr),
            inicioVac1: dateVal(row, 'inicioVac1'), finVac1: dateVal(row, 'finVac1'),
            inicioVac2: dateVal(row, 'inicioVac2'), finVac2: dateVal(row, 'finVac2'),
            inicioVac3: dateVal(row, 'inicioVac3'), finVac3: dateVal(row, 'finVac3'),
            inicioVac4: dateVal(row, 'inicioVac4'), finVac4: dateVal(row, 'finVac4'),
            dlf1: dateVal(row, 'dlf1'), dlf2: dateVal(row, 'dlf2'),
            dlf3: dateVal(row, 'dlf3'), dlf4: dateVal(row, 'dlf4'),
            dlf5: dateVal(row, 'dlf5'), dlf6: dateVal(row, 'dlf6'),
            fest1: dateVal(row, 'fest1'), fest2: dateVal(row, 'fest2'),
            fest3: dateVal(row, 'fest3'), fest4: dateVal(row, 'fest4'),
            fest5: dateVal(row, 'fest5'), fest6: dateVal(row, 'fest6')
        };
        agentes.push(agente);
    }

    var inactivo = ['IT', 'MAT', 'PAT', 'LACT', 'EXC', 'PR', 'P.DTO'];
    State.staff.todos   = agentes;
    State.staff.activos = agentes.filter(function(a) {
        return !inactivo.includes((a.estado || '').toUpperCase());
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

/**
 * Lee una hoja "AHT" separada (Fecha | Franja | Servicio | AHT).
 * Sólo actualiza State.forecast.aht, sin resetear llamadas.
 */
function _parsearAHTSheet(rows) {
    if (!rows.length) return 0;
    var headers   = rows[0].map(function(h) { return h !== null && h !== undefined ? String(h) : ''; });
    var colFecha  = _findColIdx(headers, 'Fecha', 'Date', 'Día', 'Dia');
    var colFranja = _findColIdx(headers, 'Franja', 'Hora', 'Time', 'Intervalo');
    var colSvc    = _findColIdx(headers, 'Servicio', 'Service', 'Cola');
    var colAHT    = _findColIdx(headers, 'AHT', 'TMO', 'AHT_s', 'Duracion', 'Duration');
    if (colFecha < 0 || colFranja < 0 || colAHT < 0) return 0;
    var n = 0;
    for (var r = 1; r < rows.length; r++) {
        var row    = rows[r];
        if (!row || !row.length) continue;
        var fecha  = _toDateStr(row[colFecha]);
        var franja = _toFranjaStr(row[colFranja]);
        if (!fecha || !franja) continue;
        var svcId  = colSvc >= 0
            ? _resolverSvcId(String(row[colSvc] || '').trim())
            : (State.config.servicios.length ? State.config.servicios[0].id : 'svc1');
        var aht    = parseFloat(row[colAHT]) || 0;
        if (!State.forecast.aht[fecha])         State.forecast.aht[fecha] = {};
        if (!State.forecast.aht[fecha][franja]) State.forecast.aht[fecha][franja] = {};
        State.forecast.aht[fecha][franja][svcId] = aht;
        n++;
    }
    return n;
}
