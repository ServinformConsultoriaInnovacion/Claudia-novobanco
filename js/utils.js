/**
 * utils.js — Utilidades generales
 * PAX Servinform · 2026
 */

'use strict';

// ── Formato ───────────────────────────────────────────────────────────────

function fmtNum(n, dec) {
    dec = dec === undefined ? 0 : dec;
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('es-ES', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
    });
}

function fmtPct(n, dec) {
    dec = dec === undefined ? 1 : dec;
    if (n === null || n === undefined || isNaN(n)) return '—';
    return fmtNum(n, dec) + ' %';
}

// ── Tiempo y franjas ──────────────────────────────────────────────────────

/**
 * Genera un array de franjas horarias.
 * @param {number} horaInicio  - hora de inicio (ej: 8)
 * @param {number} horaFin     - hora de fin exclusiva (ej: 22)
 * @param {number} intervaloMin - intervalo en minutos (ej: 30)
 * @returns {string[]} Array de strings 'HH:MM'
 */
function generarFranjas(horaInicio, horaFin, intervaloMin) {
    horaInicio  = horaInicio  === undefined ? 8  : horaInicio;
    horaFin     = horaFin     === undefined ? 22 : horaFin;
    intervaloMin = intervaloMin === undefined ? 30 : intervaloMin;
    const franjas = [];
    let min = horaInicio * 60;
    const fin = horaFin * 60;
    while (min < fin) {
        const h = String(Math.floor(min / 60)).padStart(2, '0');
        const m = String(min % 60).padStart(2, '0');
        franjas.push(h + ':' + m);
        min += intervaloMin;
    }
    return franjas;
}

// ── Componente renderCampoEditable ────────────────────────────────────────

/**
 * Crea un elemento .param-item con input + toggle "No aplica".
 *
 * @param {object} opts
 *   id          {string}   - Identificador único (usado en for/id del input)
 *   label       {string}   - Etiqueta del campo
 *   valor       {*}        - Valor actual del campo
 *   noAplica    {boolean}  - Estado inicial del toggle NA
 *   tipo        {string}   - 'number' | 'text' (default 'number')
 *   unidad      {string}   - Texto de unidad entre corchetes (opcional)
 *   ref         {string}   - Referencia artículo (opcional)
 *   min         {number}   - min para input number
 *   max         {number}   - max para input number
 *   step        {number}   - step para input number
 *   opciones    {Array}    - [{ value, label }] → renderiza <select> en lugar de <input>
 *   tooltip     {string}   - Texto de ayuda (title) en el label (opcional)
 *   onChange    {Function} - callback(nuevoValor) al cambiar el input
 *   onNaChange  {Function} - callback(boolean) al cambiar el toggle NA
 * @returns {HTMLElement}
 */
function renderCampoEditable(opts) {
    const {
        id, label, valor, noAplica, tipo, unidad, ref,
        min, max, step, opciones, tooltip, onChange, onNaChange
    } = opts;

    const tipoEfectivo = tipo || 'number';

    const divItem = document.createElement('div');
    divItem.className = 'param-item' + (noAplica ? ' is-na' : '');
    divItem.dataset.campo = id;
    if (tooltip) divItem.title = tooltip;

    // ── Label ──────────────────────────────────────────────────────
    const lbl = document.createElement('label');
    lbl.setAttribute('for', 'campo_' + id);
    let lblHtml = label;
    if (tooltip) lblHtml += ' <span style="cursor:help;color:var(--nb-primary);font-size:11px;" title="' +
        tooltip.replace(/"/g, '&quot;') + '">ⓘ</span>';
    if (unidad) lblHtml += ' <span class="text-light">[' + unidad + ']</span>';
    if (ref)    lblHtml += ' <span class="param-ref">' + ref + '</span>';
    lbl.innerHTML = lblHtml;
    divItem.appendChild(lbl);

    // ── Row: input + toggle ────────────────────────────────────────────
    const row = document.createElement('div');
    row.className = 'param-row';

    // Input o Select
    let inputEl;
    if (opciones && opciones.length) {
        inputEl = document.createElement('select');
        opciones.forEach(function(opt) {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            if (opt.value === valor) o.selected = true;
            inputEl.appendChild(o);
        });
    } else {
        inputEl = document.createElement('input');
        inputEl.type = tipoEfectivo;
        inputEl.value = (valor !== null && valor !== undefined) ? valor : '';
        if (min  !== undefined) inputEl.min  = min;
        if (max  !== undefined) inputEl.max  = max;
        if (step !== undefined) inputEl.step = step;
    }
    inputEl.id = 'campo_' + id;
    inputEl.disabled = !!noAplica;
    inputEl.addEventListener('change', function(e) {
        if (typeof onChange === 'function') onChange(e.target.value);
        programarGuardado();
    });
    row.appendChild(inputEl);

    // Toggle "No aplica"
    const naLbl = document.createElement('label');
    naLbl.className = 'na-toggle';
    const naCheck = document.createElement('input');
    naCheck.type = 'checkbox';
    naCheck.checked = !!noAplica;
    naCheck.addEventListener('change', function(e) {
        const checked = e.target.checked;
        inputEl.disabled = checked;
        divItem.classList.toggle('is-na', checked);
        if (typeof onNaChange === 'function') onNaChange(checked);
        programarGuardado();
    });
    naLbl.appendChild(naCheck);
    naLbl.appendChild(document.createTextNode('N/A'));
    row.appendChild(naLbl);

    divItem.appendChild(row);
    return divItem;
}

// ── UI helpers ────────────────────────────────────────────────────────────

function crearBtn(texto, clases, icono, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (clases || '');
    btn.innerHTML = icono ? (icono + ' ' + texto) : texto;
    if (typeof onClick === 'function') btn.addEventListener('click', onClick);
    return btn;
}

// ── Progress overlay ──────────────────────────────────────────────────────

function mostrarProgreso(titulo, porcentaje, status) {
    porcentaje = porcentaje === undefined ? 0 : porcentaje;
    status     = status     === undefined ? '' : status;
    const overlay = document.getElementById('progressOverlay');
    if (!overlay) return;
    overlay.querySelector('.progress-box h3').textContent = titulo || 'Procesando...';
    overlay.querySelector('.progress-bar-fill').style.width = porcentaje + '%';
    overlay.querySelector('.progress-status').textContent = status;
    overlay.classList.add('visible');
}

function ocultarProgreso() {
    const overlay = document.getElementById('progressOverlay');
    if (overlay) overlay.classList.remove('visible');
}

// ── Toast ─────────────────────────────────────────────────────────────────

function toast(mensaje, tipo) {
    tipo = tipo || 'info';
    const colores = {
        info:    '#1C1C1C',
        success: '#00873D',
        error:   '#E30613',
        warning: '#E87000'
    };
    const t = document.createElement('div');
    t.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'right:24px',
        'z-index:2000',
        'background:' + (colores[tipo] || colores.info),
        'color:white',
        'padding:10px 18px',
        'border-radius:6px',
        'font-size:13px',
        'font-weight:700',
        'box-shadow:0 4px 16px rgba(0,0,0,0.2)',
        'max-width:320px',
        'line-height:1.4'
    ].join(';');
    t.textContent = mensaje;
    document.body.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 3200);
}
