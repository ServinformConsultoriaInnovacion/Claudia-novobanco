/**
 * state.js — Estado centralizado de Claudia novobanco
 * PAX Servinform · 2026
 *
 * Patrón { valor, noAplica } en todos los campos editables.
 * isActive(campo) → true si el campo está activo (noAplica === false).
 * getVal(campo)   → valor si activo, null si no aplica.
 */

'use strict';

const State = {

    // ── A1. Configuración del Servicio (multi-servicio) ───────────────────
    config: {
        nombreProyecto: '',
        servicios: [],        // Inicializado en initUI si vacío
        franjas:   [],        // Generadas por generarFranjas()
        zonaHoraria: 'Europe/Lisbon'
    },

    // ── A2. Convenio laboral (todos los campos con flag noAplica) ─────────
    convenio: {
        jornadaAnual:   { valor: 1764,  noAplica: false },
        jornadaSemanal: { valor: 39,    noAplica: false },
        maxIrregular:   { valor: 48,    noAplica: false },
        maxConsec7D:    { valor: 8,     noAplica: false },
        maxConsecNF:    { valor: 5,     noAplica: false },
        descanso14d:    { valor: 3,     noAplica: false },
        fdsLibresMin:   { valor: 2,     noAplica: false },
        pausa46:        { valor: 10,    noAplica: false },
        pausa68:        { valor: 20,    noAplica: false },
        vacaciones:     { valor: 23,    noAplica: false },
        pvdShrinkage:   { valor: 16.7,  noAplica: false },
        camposLibres:   [     // [{ nombre, valor, noAplica, rol }] — LEGACY (ver reglasExcepcion)
            // rol: 'info' | 'shrinkage' | 'reduccion_jornada' | 'ocupacion_max'
            { nombre: 'Rotación FDS por defecto', valor: 33, noAplica: true, rol: 'info' }
        ],
        reglasExcepcion: []   // [crearReglaExcepcion()] — motor de reglas por segmento de staff
    },

    // ── A3. Perfiles de configuración guardados ───────────────────────────
    perfiles: {
        activo: '',
        lista:  {}    // { 'nombre_perfil': { nombre, fecha, payload } }
    },

    // ── B. Datos de entrada ───────────────────────────────────────────────
    forecast: {
        raw:      null,
        llamadas: {},   // { fecha: { franja: { idServicio: numLlamadas } } }
        aht:      {},   // { fecha: { franja: { idServicio: ahtSegundos } } }
        tmo:      {},   // TMO ponderado calculado
        editado:  false
    },
    staff: { todos: [], activos: [] },

    // ── C. Dimensionamiento ───────────────────────────────────────────────
    dimensionamiento: {
        shrinkageMensual: {},   // { 'YYYY-MM': { operativo:{valor,noAplica}, absentismo:{valor,noAplica} } }
        resultado:        null,
        matrizFTE:        []
    },

    // ── D. Análisis NDA/NDS + What-If ────────────────────────────────────
    analisis: {
        matrizCobertura:   null,
        ndaPorDia:         {},
        ndsPorDia:         {},
        gapsPorDia:        {},
        llamadasAtendidas: {},
        llamadasAbandonadas: {},
        llamadasFueraNDS:  {}
    },
    whatif: {
        agentesVirtuales:   [],
        resultadoConWhatIf: null
    },

    // ── E. Planificación ──────────────────────────────────────────────────
    fase4:          null,
    cuadrante:      null,
    horariosPrevios: null,

    // ── Meta ──────────────────────────────────────────────────────────────
    _version: '1.1',
    _dirty:   false
};

// ── Helpers de campo { valor, noAplica } ──────────────────────────────────

/** Devuelve true si el campo está activo (noAplica !== true) */
function isActive(campo) {
    return campo != null && campo.noAplica !== true;
}

/** Devuelve el valor del campo si está activo, o null si no aplica */
function getVal(campo) {
    return isActive(campo) ? campo.valor : null;
}

// ── Factory de servicios ──────────────────────────────────────────────────

function generarIdServicio() {
    return 'svc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function crearServicio(nombre) {
    nombre = nombre || 'Servicio nuevo';
    return {
        id:            generarIdServicio(),
        nombre,
        color:         '#E30613',
        sla:           { valor: 80,       noAplica: false },
        tiempoSla:     { valor: 20,       noAplica: false },
        ahtGlobal:     { valor: 270,      noAplica: true  },   // usa AHT de previsión
        tasaAbandono:  { valor: 5,        noAplica: false },
        pacienciaMedia:{ valor: 120,      noAplica: false },   // seg — tiempo medio antes de abandonar (Erlang A)
        shrinkageOper: { valor: 5,        noAplica: false },
        absentismo:    { valor: 8,        noAplica: false },
        modalidad:     { valor: 'inbound', noAplica: false }
    };
}

// ── Factory de reglas de excepción ──────────────────────────────────────────

/**
 * Devuelve una regla de excepción nueva con todos los campos en su valor por defecto.
 * @param {string} [nombre]
 * @returns {object}
 */
function crearReglaExcepcion(nombre) {
    return {
        id:            'reg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        nombre:        nombre || 'Nueva regla',
        activa:        true,
        prioridad:     10,
        vigencia:      { desde: null, hasta: null },
        modoConflicto: 'sustituir',   // 'sustituir' | 'sumar' | 'mas_restrictivo'
        notas:         '',

        filtro: {
            servicios:       [],
            tiposTurno:      [],   // 'manana'|'tarde'|'noche'|'fds'|'partido'|'guardia'
            estados:         [],   // 'fijo'|'temporal'|'excedencia'|'reduccion_activa'
            tiposContrato:   [],   // 'completo'|'parcial_75'|'parcial_50'
            gruposPro:       [],   // 'teleoperador'|'especialista'|'supervisor'
            sedes:           [],
            agentes:         [],   // codigos individuales []
            diasSemana:      [],   // [1,2,3,4,5,6,0]  1=Lun … 6=Sáb, 0=Dom  [] = todos
            antiguedadMin:   null,
            antiguedadMax:   null,
            franjas:         null  // null | { desde:'HH:MM', hasta:'HH:MM', dias:[0..6] }
        },

        parametros: {
            // — Cálculo base —
            shrinkage:           { activa: false, valor: null },
            reduccionJornada:    { activa: false, valor: null },
            ocupacionMax:        { activa: false, valor: null },
            ahtOverride:         { activa: false, valor: null },
            jornadaSemanal:      { activa: false, valor: null },
            vacaciones:          { activa: false, valor: null },

            // — Rotación y turnos —
            rotacion: {
                frecuencia:          { activa: false, valor: null },
                patronFds:           { activa: false, valor: null },
                fdsAlMes:            { activa: false, valor: null },
                cambiosTurnoMes:     { activa: false, valor: null },
                cambiosTurnoAnio:    { activa: false, valor: null },
                descansoCambioTurno: { activa: false, valor: null },
                maxNochesConsec:     { activa: false, valor: null },
                nochesAlMes:         { activa: false, valor: null }
            },

            // — Carga especial —
            carga: {
                festivosObligAnio:   { activa: false, valor: null },
                guardiasAlMes:       { activa: false, valor: null },
                jornadaPartidaMes:   { activa: false, valor: null },
                horasExtraMes:       { activa: false, valor: null },
                horasExtraAnio:      { activa: false, valor: null },
                bolsaHoras:          { activa: false, valor: null }
            },

            // — Teletrabajo —
            teletrabajo: {
                diasSemana:          { activa: false, valor: null },
                diasMes:             { activa: false, valor: null }
            },

            // — Campos extra libres —
            extras: []   // [{ nombre, valor, noAplica, rol }]
        }
    };
}

/**
 * Asegura que una regla restaurada desde localStorage tenga todos los campos
 * requeridos por la versión actual de crearReglaExcepcion().
 * @param {object} regla
 * @returns {object}
 */
function _normalizarRegla(regla) {
    var defaults = crearReglaExcepcion('');
    // Propiedades de primer nivel
    ['nombre','activa','prioridad','vigencia','modoConflicto','notas'].forEach(function(k) {
        if (regla[k] === undefined) regla[k] = defaults[k];
    });
    // Filtro
    if (!regla.filtro) {
        regla.filtro = defaults.filtro;
    } else {
        Object.keys(defaults.filtro).forEach(function(k) {
            if (regla.filtro[k] === undefined) regla.filtro[k] = defaults.filtro[k];
        });
    }
    // Parámetros base
    if (!regla.parametros) {
        regla.parametros = defaults.parametros;
    } else {
        ['shrinkage','reduccionJornada','ocupacionMax','ahtOverride','jornadaSemanal','vacaciones']
            .forEach(function(k) {
                if (!regla.parametros[k]) regla.parametros[k] = defaults.parametros[k];
            });
        // Sub-grupos
        ['rotacion','carga','teletrabajo'].forEach(function(grupo) {
            if (!regla.parametros[grupo]) {
                regla.parametros[grupo] = defaults.parametros[grupo];
            } else {
                Object.keys(defaults.parametros[grupo]).forEach(function(k) {
                    if (!regla.parametros[grupo][k]) {
                        regla.parametros[grupo][k] = defaults.parametros[grupo][k];
                    }
                });
            }
        });
        if (!Array.isArray(regla.parametros.extras)) regla.parametros.extras = [];
    }
    return regla;
}

// ── Persistencia localStorage ─────────────────────────────────────────────

const LS_STATE_KEY    = 'nb_state_v1';
const LS_PROFILES_KEY = 'nb_profiles_v1';

function guardarEstado() {
    try {
        const snapshot = {
            config:           State.config,
            convenio:         State.convenio,   // incluye camposLibres y reglasExcepcion
            perfiles:         State.perfiles,
            staff:            { todos: State.staff.todos },
            forecast:         { llamadas: State.forecast.llamadas, aht: State.forecast.aht, editado: State.forecast.editado },
            dimensionamiento: { shrinkageMensual: State.dimensionamiento.shrinkageMensual },
            _version:         State._version
        };
        localStorage.setItem(LS_STATE_KEY, JSON.stringify(snapshot));
        State._dirty = false;
    } catch (e) {
        console.warn('[State] Error al guardar en localStorage:', e);
    }
}

/**
 * Asegura que un servicio restaurado desde localStorage tenga todos los campos
 * requeridos por la versión actual de crearServicio().
 */
function _normalizarServicio(svc) {
    var defaults = crearServicio('');
    Object.keys(defaults).forEach(function(k) {
        if (k !== 'id' && k !== 'nombre' && k !== 'color' && svc[k] === undefined) {
            svc[k] = defaults[k];
        }
    });
    return svc;
}

/**
 * Campos libres predefinidos por defecto.
 * Se añaden si no existen ya (por nombre) tras restaurar el estado,
 * sin destruir los campos libres que el usuario haya configurado.
 */
var _CAMPOS_LIBRES_DEFECTO = [
    { nombre: 'Rotación FDS por defecto', valor: 33, noAplica: true, rol: 'info' }
];

function _sembrarCamposLibresDefecto() {
    _CAMPOS_LIBRES_DEFECTO.forEach(function(d) {
        var existe = State.convenio.camposLibres.some(function(c) {
            return c.nombre === d.nombre;
        });
        if (!existe) {
            State.convenio.camposLibres.push(
                { nombre: d.nombre, valor: d.valor, noAplica: d.noAplica, rol: d.rol }
            );
        }
    });
}

function restaurarEstado() {
    try {
        const raw = localStorage.getItem(LS_STATE_KEY);
        if (!raw) return false;
        const saved = JSON.parse(raw);
        if (saved._version !== State._version) return false;
        if (saved.config) {
            Object.assign(State.config, saved.config);
            // Normalizar servicios: rellenar campos nuevos con sus defaults
            if (Array.isArray(State.config.servicios)) {
                State.config.servicios = State.config.servicios.map(_normalizarServicio);
            }
        }
        if (saved.convenio) Object.assign(State.convenio, saved.convenio);
        if (saved.perfiles) Object.assign(State.perfiles, saved.perfiles);
        if (saved.staff && Array.isArray(saved.staff.todos)) {
            State.staff.todos = saved.staff.todos;
            // activos se recalcula cuando se carga el módulo staff
        }
        if (saved.dimensionamiento && saved.dimensionamiento.shrinkageMensual) {
            State.dimensionamiento.shrinkageMensual = saved.dimensionamiento.shrinkageMensual;
        }
        if (saved.forecast) {
            if (saved.forecast.llamadas) State.forecast.llamadas = saved.forecast.llamadas;
            if (saved.forecast.aht)      State.forecast.aht      = saved.forecast.aht;
            State.forecast.editado = !!saved.forecast.editado;
        }
        // Normalizar reglasExcepcion: rellenar campos nuevos en reglas guardadas
        if (Array.isArray(State.convenio.reglasExcepcion)) {
            State.convenio.reglasExcepcion = State.convenio.reglasExcepcion.map(_normalizarRegla);
        } else {
            State.convenio.reglasExcepcion = [];
        }
        // Añadir campos libres predefinidos que falten (migración no destructiva)
        _sembrarCamposLibresDefecto();
        return true;
    } catch (e) {
        console.warn('[State] Error al restaurar estado:', e);
        return false;
    }
}

function resetEstado() {
    if (!confirm('¿Resetear toda la configuración? Se perderán los datos no guardados.')) return;
    localStorage.removeItem(LS_STATE_KEY);
    location.reload();
}

// Auto-guardado con debounce de 800ms
let _saveTimer = null;
function programarGuardado() {
    State._dirty = true;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(guardarEstado, 800);
}
