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

/**
 * Devuelve la suma de shrinkage adicional de los campos libres
 * del convenio que estén activos y tengan rol 'shrinkage'.
 * @returns {number} porcentaje acumulado (puede ser 0)
 */
function getShrinkageCamposLibres() {
    return State.convenio.camposLibres
        .filter(function(c) { return !c.noAplica && c.rol === 'shrinkage'; })
        .reduce(function(acc, c) { return acc + (parseFloat(c.valor) || 0); }, 0);
}

/**
 * Devuelve la reducción de jornada acumulada de campos libres activos.
 * @returns {number}
 */
function getReduccionJornadaCamposLibres() {
    return State.convenio.camposLibres
        .filter(function(c) { return !c.noAplica && c.rol === 'reduccion_jornada'; })
        .reduce(function(acc, c) { return acc + (parseFloat(c.valor) || 0); }, 0);
}

/**
 * Devuelve el mínimo de ocupacion_max activo, o null si no hay ninguno.
 * @returns {number|null}
 */
function getOcupacionMaxCamposLibres() {
    const valores = State.convenio.camposLibres
        .filter(function(c) { return !c.noAplica && c.rol === 'ocupacion_max'; })
        .map(function(c) { return parseFloat(c.valor); })
        .filter(function(v) { return !isNaN(v); });
    return valores.length ? Math.min.apply(null, valores) : null;
}

/** Siguiente color de la paleta para un servicio nuevo */
function siguienteColorServicio() {
    return COLORES_SERVICIO[State.config.servicios.length % COLORES_SERVICIO.length];
}
