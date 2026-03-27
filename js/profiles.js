/**
 * profiles.js — Gestión de perfiles de configuración
 * PAX Servinform · 2026
 *
 * Cada perfil guarda: servicios + convenio + franjas + nombreProyecto.
 * Almacenamiento: localStorage con clave nb_profiles_v1.
 */

'use strict';

/** Carga los perfiles desde localStorage al estado */
function cargarPerfiles() {
    try {
        const raw = localStorage.getItem(LS_PROFILES_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        State.perfiles.lista  = data.lista  || {};
        State.perfiles.activo = data.activo || '';
    } catch (e) {
        console.warn('[Profiles] Error al cargar perfiles:', e);
    }
}

/** Persiste el estado de perfiles en localStorage */
function _persistirPerfiles() {
    try {
        localStorage.setItem(LS_PROFILES_KEY, JSON.stringify({
            lista:  State.perfiles.lista,
            activo: State.perfiles.activo
        }));
    } catch (e) {
        console.warn('[Profiles] Error al guardar perfiles:', e);
    }
}

/**
 * Guarda la configuración actual como un perfil nombrado.
 * Si ya existe un perfil con ese nombre, lo sobreescribe.
 * @param {string} nombre
 * @returns {boolean}
 */
function guardarPerfil(nombre) {
    nombre = (nombre || '').trim();
    if (!nombre) return false;
    State.perfiles.lista[nombre] = {
        nombre,
        fecha:   new Date().toISOString(),
        version: State._version,
        payload: {
            nombreProyecto: State.config.nombreProyecto,
            servicios:      JSON.parse(JSON.stringify(State.config.servicios)),
            convenio:       JSON.parse(JSON.stringify(State.convenio)),
            franjas:        State.config.franjas.slice()
        }
    };
    State.perfiles.activo = nombre;
    _persistirPerfiles();
    return true;
}

/**
 * Carga un perfil guardado sobre el estado activo.
 * @param {string} nombre
 * @returns {boolean}
 */
function cargarPerfil(nombre) {
    const perfil = State.perfiles.lista[nombre];
    if (!perfil || !perfil.payload) return false;
    const p = perfil.payload;
    if (p.nombreProyecto !== undefined) State.config.nombreProyecto = p.nombreProyecto;
    if (p.servicios) {
        State.config.servicios = JSON.parse(JSON.stringify(p.servicios)).map(_normalizarServicio);
    }
    if (p.convenio)   Object.assign(State.convenio, JSON.parse(JSON.stringify(p.convenio)));
    if (p.franjas)    State.config.franjas = p.franjas.slice();
    State.perfiles.activo = nombre;
    _persistirPerfiles();
    programarGuardado();
    return true;
}

/**
 * Elimina un perfil guardado.
 * @param {string} nombre
 * @returns {boolean}
 */
function borrarPerfil(nombre) {
    if (!State.perfiles.lista[nombre]) return false;
    delete State.perfiles.lista[nombre];
    if (State.perfiles.activo === nombre) State.perfiles.activo = '';
    _persistirPerfiles();
    return true;
}

/** Exporta todos los perfiles como fichero JSON descargable */
function exportarPerfiles() {
    const data = JSON.stringify({ lista: State.perfiles.lista }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'claudia_novobanco_perfiles.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Importa perfiles desde un File (.json).
 * Fusiona con los perfiles existentes (no los reemplaza).
 * @param {File} file
 * @returns {Promise<number>} Número de perfiles importados
 */
function importarPerfiles(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.lista) { reject(new Error('Formato de fichero no válido')); return; }
                Object.assign(State.perfiles.lista, data.lista);
                _persistirPerfiles();
                resolve(Object.keys(data.lista).length);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = function() { reject(new Error('Error al leer el fichero')); };
        reader.readAsText(file);
    });
}
