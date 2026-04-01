/**
 * config.js — Metadatos y constantes de configuración
 * PAX Servinform · 2026
 */

'use strict';

/** Metadatos de los campos del convenio para la UI */
const CONVENIO_META = {
    jornadaAnual:   { label: 'Jornada anual',                    unidad: 'horas', ref: 'Art. 22' },
    jornadaSemanal: { label: 'Jornada semanal',                  unidad: 'horas', ref: 'Art. 22' },
    maxIrregular:   { label: 'Máx. horas/sem. irregular',        unidad: 'horas', ref: 'Art. 23' },
    maxConsec7D:    { label: 'Máx. días consecutivos 7D',        unidad: 'días',  ref: 'Art. 23' },
    maxConsecNF:    { label: 'Máx. días consecutivos NF',        unidad: 'días',  ref: 'Art. 23' },
    descanso14d:    { label: 'Descansos mín. / 14 días',         unidad: 'días',  ref: 'Art. 23' },
    fdsLibresMin:   { label: 'FDS libres mín. / mes',            unidad: '',      ref: 'Art. 25' },
    pausa46:        { label: 'Pausa obligatoria 4–6 h',          unidad: 'min',   ref: 'Art. 24' },
    pausa68:        { label: 'Pausa obligatoria 6–8 h',          unidad: 'min',   ref: 'Art. 24' },
    vacaciones:     { label: 'Vacaciones',                       unidad: 'días laborables', ref: 'Art. 29' },
    pvdShrinkage:   { label: 'Shrinkage PVD',                    unidad: '%',     ref: 'Art. 57' }
};

/** Tipo de input por campo del convenio */
const CONVENIO_INPUT_TYPE = {
    jornadaAnual: 'number', jornadaSemanal: 'number', maxIrregular: 'number',
    maxConsec7D:  'number', maxConsecNF:    'number', descanso14d:  'number',
    fdsLibresMin: 'number', pausa46:        'number', pausa68:      'number',
    vacaciones:   'number', pvdShrinkage:   'number'
};

/** Step por campo del convenio (para input[type=number]) */
const CONVENIO_STEP = {
    pvdShrinkage: 0.1
};

/** Opciones de modalidad de servicio */
const MODALIDADES = [
    { value: 'inbound',  label: 'Inbound'  },
    { value: 'outbound', label: 'Outbound' },
    { value: 'blended',  label: 'Blended'  }
];

/** Paleta de colores para asignar a nuevos servicios (rotativa) */
const COLORES_SERVICIO = [
    '#E30613', '#1C1C1C', '#00873D', '#F5A623', '#0056C8', '#7B3FA0'
];

// ── Presets de convenio ───────────────────────────────────────────────────

const PRESET_CONVENIO_ES_CC = {
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
    pvdShrinkage:   { valor: 16.7,  noAplica: false }
};

/** Devuelve el valor activo del convenio o null si no aplica */
function getConvenio(campo) {
    return getVal(State.convenio[campo]);
}

/** Roles semánticos de los campos libres del convenio */
const ROLES_CAMPO_LIBRE = [
    { value: 'info',             label: 'Solo informativo'            },
    { value: 'shrinkage',        label: 'Shrinkage adicional (%)'     },
    { value: 'reduccion_jornada',label: 'Reducción de jornada (%)'   },
    { value: 'ocupacion_max',    label: 'Ocupación máxima (%)'        }
];

/** Siguiente color de la paleta para un servicio nuevo */
function siguienteColorServicio() {
    return COLORES_SERVICIO[State.config.servicios.length % COLORES_SERVICIO.length];
}

// ── Getters efectivos con resolución de reglas F6 ─────────────────────────

/**
 * Devuelve el shrinkage efectivo para un servicio + agente en un contexto.
 * Combina shrinkageOper + absentismo del servicio y aplica el override de reglas.
 *
 * @param {object} svc      Objeto servicio de State.config.servicios[]
 * @param {object|null} agente   Contexto de agente (ver resolverReglasParaAgente)
 * @param {object|null} contexto { fecha, franja }
 * @returns {number} Shrinkage total en % (0-99)
 */
function getShrinkageEfectivo(svc, agente, contexto) {
    // Base del servicio: shrinkageOper + absentismo (si aplican)
    var base = (getVal(svc.shrinkageOper) || 0) + (getVal(svc.absentismo) || 0);

    // Override de reglas
    var resuelto = resolverReglasParaAgente(agente || null, contexto || null);
    if (resuelto.shrinkage != null) {
        return Math.min(resuelto.shrinkage, 99);
    }

    // Sin override: sum Oper + Abs de convenio pvdShrinkage si existe
    return Math.min(base, 99);
}

/**
 * Devuelve la ocupación máxima efectiva para un servicio + agente.
 * @param {object} svc
 * @param {object|null} agente
 * @param {object|null} contexto
 * @returns {number} Ocupación máxima en % (1-100)
 */
function getOcupacionMaxEfectivo(svc, agente, contexto) {
    var resuelto = resolverReglasParaAgente(agente || null, contexto || null);
    if (resuelto.ocupacionMax != null) return resuelto.ocupacionMax;
    return getVal(svc.ocupacionMax) || 85;
}

/**
 * Devuelve el AHT efectivo para un servicio + agente + franja.
 * Si hay ahtOverride en reglas, ese tiene prioridad.
 * Si no, usa el AHT de la previsión (ahtFranja) o el global del servicio.
 *
 * @param {object} svc
 * @param {number|null} ahtFranja  AHT de la celda de previsión (puede ser null)
 * @param {object|null} agente
 * @param {object|null} contexto
 * @returns {number} AHT en segundos
 */
function getAhtEfectivo(svc, ahtFranja, agente, contexto) {
    var resuelto = resolverReglasParaAgente(agente || null, contexto || null);
    if (resuelto.ahtOverride != null) return resuelto.ahtOverride;
    if (ahtFranja != null)            return ahtFranja;
    return getVal(svc.ahtGlobal) || 180;
}

/**
 * Devuelve el SLA objetivo en % para un servicio.
 * @param {object} svc
 * @returns {number}
 */
function getSlaObjetivo(svc) {
    return getVal(svc.sla) || 80;
}

/**
 * Devuelve el tiempo umbral SLA en segundos para un servicio.
 * @param {object} svc
 * @returns {number}
 */
function getTiempoSla(svc) {
    // Si tiempoSla es {valor,noAplica}, usa getVal; si es número plano, devolverlo directamente
    if (svc.tiempoSla != null && typeof svc.tiempoSla === 'object') {
        return getVal(svc.tiempoSla) || 20;
    }
    return svc.tiempoSla || 20;
}
