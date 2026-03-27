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
        rotacionFDS:    { valor: 33,    noAplica: false },
        camposLibres:   []    // [{ nombre, valor, noAplica, rol }]
                              // rol: 'info' | 'shrinkage' | 'reduccion_jornada' | 'ocupacion_max'
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

// ── Persistencia localStorage ─────────────────────────────────────────────

const LS_STATE_KEY    = 'nb_state_v1';
const LS_PROFILES_KEY = 'nb_profiles_v1';

function guardarEstado() {
    try {
        const snapshot = {
            config:           State.config,
            convenio:         State.convenio,
            perfiles:         State.perfiles,
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
        if (saved.dimensionamiento && saved.dimensionamiento.shrinkageMensual) {
            State.dimensionamiento.shrinkageMensual = saved.dimensionamiento.shrinkageMensual;
        }
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
