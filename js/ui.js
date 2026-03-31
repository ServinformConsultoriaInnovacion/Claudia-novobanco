/**
 * ui.js — Interfaz de usuario principal
 * PAX Servinform · 2026
 *
 * Renderiza: sidebar nav + Panel A (Configuración completa) + stubs B-F.
 * Fase 0 — Entregable: layout novobanco con "No aplica" funcionando en
 * todos los campos de servicio y convenio, y gestión de perfiles.
 */

'use strict';

// ── Definición de la navegación ───────────────────────────────────────────

const NAV_ITEMS = [
    {
        id:    'panelStaff',
        icon:  '👥',
        label: 'Staff',
        sub:   'Plantilla · Agentes · Disponibilidad',
        fase:  null
    },
    {
        id:    'panelPrevision',
        icon:  '📞',
        label: 'Previsión',
        sub:   'Llamadas · AHT · Editor',
        fase:  null
    },
    {
        id:    'panelA',
        icon:  '⚙️',
        label: 'Configuración',
        sub:   'Servicio · Convenio · Perfiles',
        fase:  null
    },
    {
        id:    'panelC',
        icon:  '🧮',
        label: 'Dimensionamiento',
        sub:   'Erlang C · FTE · Shrinkage',
        fase:  'Fase 3'
    },
    {
        id:    'panelD',
        icon:  '📊',
        label: 'NDA / NDS · What-If',
        sub:   'Gráficas · Simulación',
        fase:  'Fase 4'
    },
    {
        id:    'panelE',
        icon:  '📅',
        label: 'Planificación',
        sub:   'FDS · Cuadrante',
        fase:  'Fase 5'
    },
    {
        id:    'panelF',
        icon:  '📥',
        label: 'Exportación',
        sub:   'Excel completo · Vista previa',
        fase:  'Fase 6'
    }
];

let _panelActivo = 'panelStaff';

// ══════════════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════════════

function initUI() {
    // Asegurar al menos un servicio y franjas por defecto
    if (!State.config.servicios.length) {
        State.config.servicios.push(crearServicio('Atención al Cliente'));
        State.config.servicios[0].color = siguienteColorServicio();
    }
    if (!State.config.franjas.length) {
        State.config.franjas = generarFranjas(0, 24, 30);
    }

    _renderSidebar();
    mostrarPanel('panelStaff');
}

// ══════════════════════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════════════════════

function _renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';

    // ── Nombre del proyecto ──────────────────────────────────────────────
    const projDiv = document.createElement('div');
    projDiv.className = 'sidebar-project';
    projDiv.innerHTML =
        '<div class="sidebar-project-label">Proyecto</div>' +
        '<input id="inputNombreProyecto" type="text" placeholder="Nombre del proyecto..."' +
        ' value="' + _esc(State.config.nombreProyecto) + '">';
    sidebar.appendChild(projDiv);
    sidebar.querySelector('#inputNombreProyecto').addEventListener('change', function(e) {
        State.config.nombreProyecto = e.target.value;
        programarGuardado();
    });

    // ── Navegación ───────────────────────────────────────────────────────
    const navDiv = document.createElement('div');
    navDiv.className = 'sidebar-nav';
    navDiv.innerHTML = '<div class="sidebar-section-title">Módulos</div>';

    NAV_ITEMS.forEach(function(item) {
        const el = document.createElement('div');
        el.className = 'nav-item' + (item.id === _panelActivo ? ' active' : '');
        el.dataset.panel = item.id;
        el.innerHTML =
            '<span class="nav-icon">' + item.icon + '</span>' +
            '<div class="nav-texts">' +
                '<div class="nav-label">' + item.label + '</div>' +
                '<div class="nav-sub">'   + item.sub   + '</div>' +
            '</div>' +
            (item.fase ? '<span class="nav-badge">' + item.fase + '</span>' : '');
        el.addEventListener('click', function() { mostrarPanel(item.id); });
        navDiv.appendChild(el);
    });
    sidebar.appendChild(navDiv);

    // ── Footer + botón colapsar ─────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.innerHTML =
        '<span style="color:var(--nb-primary);font-weight:800;">novo</span>' +
        '<span style="color:var(--nb-dark);font-weight:800;">banco</span> WFM v1.0<br>' +
        'PAX Servinform · 2026';

    const btnToggle = document.createElement('button');
    btnToggle.id        = 'btnToggleSidebar';
    btnToggle.className = 'sidebar-toggle';
    btnToggle.title     = 'Colapsar / expandir barra lateral';
    btnToggle.innerHTML = '◄';
    btnToggle.addEventListener('click', toggleSidebar);

    sidebar.appendChild(footer);
    sidebar.appendChild(btnToggle);
}

// ── Actualiza sólo los nav-items activos sin re-renderizar todo ──────────
function _actualizarNav() {
    document.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.toggle('active', el.dataset.panel === _panelActivo);
        const lbl = el.querySelector('.nav-label');
        if (lbl) lbl.style.color = el.classList.contains('active') ? 'var(--nb-primary-dark)' : '';
    });
}
// ── Sidebar collapse ──────────────────────────────────────────────────

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var btn     = document.getElementById('btnToggleSidebar');
    sidebar.classList.toggle('collapsed');
    var collapsed = sidebar.classList.contains('collapsed');
    if (btn) btn.innerHTML = collapsed ? '►' : '◄';
}
// ══════════════════════════════════════════════════════════════════════════
//  ROUTING DE PANELES
// ══════════════════════════════════════════════════════════════════════════

function mostrarPanel(panelId) {
    // Desactivar listeners del panel saliente antes de cambiar
    if (_panelActivo === 'panelStaff')    desactivarModuloStaff();
    if (_panelActivo === 'panelPrevision') desactivarModuloPrevision();

    _panelActivo = panelId;
    _actualizarNav();

    const main = document.getElementById('mainContent');
    main.innerHTML = '';
    main.scrollTop = 0;

    switch (panelId) {
        case 'panelStaff':    _renderPanelStaff(main); break;
        case 'panelPrevision': renderModuloPrevision(main); break;
        case 'panelA':        _renderPanelA(main); break;
        default:
            const item = NAV_ITEMS.find(function(i) { return i.id === panelId; });
            if (item) _renderStub(main, item);
    }
}

// ══════════════════════════════════════════════════════════════════════════//  PANEL STAFF
// ════════════════════════════════════════════════════════════════════════════

function _renderPanelStaff(container) {
    // Delega todo el renderizado a staff.js
    renderModuloStaff(container);
}

// ════════════════════════════════════════════════════════════════════════════//  STUB — paneles de fases futuras
// ══════════════════════════════════════════════════════════════════════════

function _renderStub(container, item) {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML =
        '<div class="panel-header" style="cursor:default;">' +
            '<span class="panel-icon">' + item.icon + '</span>' +
            '<h2>' + item.label + '</h2>' +
        '</div>' +
        '<div class="panel-body">' +
            '<div class="stub-content">' +
                '<div class="stub-icon">' + item.icon + '</div>' +
                '<h3>' + item.label + '</h3>' +
                '<p>' + item.sub + '</p>' +
                '<div class="phase-badge">🚧 ' + item.fase + ' — Próximamente</div>' +
            '</div>' +
        '</div>';
    container.appendChild(panel);
}

// ══════════════════════════════════════════════════════════════════════════
//  PANEL A — CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════════════════

function _renderPanelA(container) {
    container.appendChild(_renderPanelA1());
    container.appendChild(_renderPanelA2());
    container.appendChild(_renderPanelA3());
}

// ── A1: Servicios ─────────────────────────────────────────────────────────

function _renderPanelA1() {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panelA1';

    const nSvc = State.config.servicios.length;
    panel.innerHTML =
        '<div class="panel-header" onclick="togglePanel(this)">' +
            '<span class="panel-icon">⚙️</span>' +
            '<h2>A1 · Servicios</h2>' +
            '<span class="panel-desc" id="descA1">' +
                nSvc + ' servicio' + (nSvc !== 1 ? 's' : '') + ' configurado' + (nSvc !== 1 ? 's' : '') +
            '</span>' +
            '<span class="panel-toggle">▼</span>' +
        '</div>' +
        '<div class="panel-body">' +
            '<div class="info-box">💡 Cada servicio tiene sus propios parámetros de SLA, AHT, abandono y shrinkage. ' +
                'Usa <strong>N/A</strong> para desactivar cualquier parámetro sin perder su valor de referencia.</div>' +
            '<div id="listaServicios"></div>' +
            '<div class="actions">' +
                '<button class="btn btn-secondary btn-sm" onclick="UI_addServicio()">➕ Añadir servicio</button>' +
            '</div>' +
        '</div>';

    // Renderizar tarjetas de servicio tras insertar en DOM
    setTimeout(function() { UI_renderListaServicios(); }, 0);
    return panel;
}

function UI_renderListaServicios() {
    const lista = document.getElementById('listaServicios');
    if (!lista) return;
    lista.innerHTML = '';
    State.config.servicios.forEach(function(svc, idx) {
        lista.appendChild(_crearTarjetaServicio(svc, idx));
    });
    _actualizarDescA1();
}

function _crearTarjetaServicio(svc, idx) {
    const sp = document.createElement('div');
    sp.className = 'sub-panel';
    sp.dataset.svcId = svc.id;

    sp.innerHTML =
        '<div class="sub-panel-header" onclick="toggleSubPanel(this)">' +
            '<span class="svc-dot" style="background:' + svc.color + '"></span>' +
            '<h3>' + _esc(svc.nombre || 'Servicio sin nombre') + '</h3>' +
            '<span class="sp-toggle">▼</span>' +
        '</div>' +
        '<div class="sp-body" id="spBody_' + svc.id + '"></div>';

    setTimeout(function() { _renderCamposServicio(svc, idx); }, 0);
    return sp;
}

function _renderCamposServicio(svc, idx) {
    const body = document.getElementById('spBody_' + svc.id);
    if (!body) return;
    body.innerHTML = '';

    // ── Nombre + Color + Eliminar ─────────────────────────────────────
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;gap:10px;align-items:flex-end;margin-bottom:14px;flex-wrap:wrap;';

    const nombreDiv = document.createElement('div');
    nombreDiv.style.flex = '1';
    nombreDiv.innerHTML =
        '<label style="font-size:11px;font-weight:700;color:var(--nb-text-light);text-transform:uppercase;' +
        'letter-spacing:.4px;display:block;margin-bottom:5px;">Nombre del servicio</label>' +
        '<input type="text" value="' + _esc(svc.nombre) + '" placeholder="Ej: Atención al Cliente"' +
        ' style="width:100%;padding:6px 10px;border:1px solid var(--nb-border);border-radius:4px;' +
        'font-size:13px;font-family:inherit;" data-svc-nombre="' + svc.id + '">';
    topRow.appendChild(nombreDiv);

    const colorDiv = document.createElement('div');
    colorDiv.innerHTML =
        '<label style="font-size:11px;font-weight:700;color:var(--nb-text-light);text-transform:uppercase;' +
        'letter-spacing:.4px;display:block;margin-bottom:5px;">Color</label>' +
        '<input type="color" value="' + svc.color + '"' +
        ' style="width:40px;height:34px;padding:2px;border:1px solid var(--nb-border);' +
        'border-radius:4px;cursor:pointer;" data-svc-color="' + svc.id + '">';
    topRow.appendChild(colorDiv);

    if (idx > 0) {
        const delBtn = crearBtn('Eliminar', 'btn-danger btn-sm', '🗑', function() {
            UI_eliminarServicio(svc.id);
        });
        delBtn.style.marginBottom = '0';
        delBtn.style.alignSelf = 'flex-end';
        topRow.appendChild(delBtn);
    }

    body.appendChild(topRow);

    // Eventos de nombre y color
    body.querySelector('[data-svc-nombre]').addEventListener('change', function(e) {
        svc.nombre = e.target.value;
        const h3 = document.querySelector('[data-svc-id="' + svc.id + '"] .sub-panel-header h3');
        if (h3) h3.textContent = svc.nombre || 'Servicio sin nombre';
        programarGuardado();
    });
    body.querySelector('[data-svc-color]').addEventListener('change', function(e) {
        svc.color = e.target.value;
        const dot = document.querySelector('[data-svc-id="' + svc.id + '"] .svc-dot');
        if (dot) dot.style.background = svc.color;
        programarGuardado();
    });

    // ── Campos numéricos ──────────────────────────────────────────────
    const grid = document.createElement('div');
    grid.className = 'param-grid';

    const camposNum = [
        { id: svc.id + '_sla',            label: 'SLA objetivo',           campo: 'sla',           unidad: '%',   min: 0,  max: 100, step: 1   },
        { id: svc.id + '_tiempoSla',      label: 'Tiempo SLA',             campo: 'tiempoSla',     unidad: 'seg', min: 1,  max: 300, step: 1   },
        { id: svc.id + '_ahtGlobal',      label: 'AHT global',             campo: 'ahtGlobal',     unidad: 'seg', min: 1,           step: 1   },
        { id: svc.id + '_tasaAbandono',   label: 'Tasa de abandono',       campo: 'tasaAbandono',  unidad: '%',   min: 0,  max: 50,  step: 0.1 },
        { id: svc.id + '_pacienciaMedia', label: 'Paciencia media (ATA)',  campo: 'pacienciaMedia',unidad: 'seg', min: 1,  max: 600, step: 1,
          tooltip: 'Tiempo medio que espera un cliente antes de abandonar la cola (Average Time to Abandon). Activa el modelo Erlang A.' },
        { id: svc.id + '_shrinkOper',     label: 'Shrinkage operativo',    campo: 'shrinkageOper', unidad: '%',   min: 0,  max: 50,  step: 0.1 },
        { id: svc.id + '_absentismo',     label: 'Absentismo',             campo: 'absentismo',    unidad: '%',   min: 0,  max: 50,  step: 0.1 }
    ];

    camposNum.forEach(function(def) {
        const cfg = svc[def.campo];
        grid.appendChild(renderCampoEditable({
            id:         def.id,
            label:      def.label,
            unidad:     def.unidad,
            min:        def.min,
            max:        def.max,
            step:       def.step,
            tipo:       'number',
            valor:      cfg.valor,
            noAplica:   cfg.noAplica,
            onChange:   function(v) { svc[def.campo].valor = parseFloat(v); programarGuardado(); },
            onNaChange: function(na) { svc[def.campo].noAplica = na; programarGuardado(); }
        }));
    });

    // Modalidad (select)
    grid.appendChild(renderCampoEditable({
        id:         svc.id + '_modalidad',
        label:      'Modalidad',
        valor:      svc.modalidad.valor,
        noAplica:   svc.modalidad.noAplica,
        opciones:   MODALIDADES,
        onChange:   function(v) { svc.modalidad.valor = v; programarGuardado(); },
        onNaChange: function(na) { svc.modalidad.noAplica = na; programarGuardado(); }
    }));

    body.appendChild(grid);
}

function UI_addServicio() {
    const svc = crearServicio('Servicio ' + (State.config.servicios.length + 1));
    svc.color = COLORES_SERVICIO[State.config.servicios.length % COLORES_SERVICIO.length];
    State.config.servicios.push(svc);
    programarGuardado();
    UI_renderListaServicios();
}

function UI_eliminarServicio(svcId) {
    if (State.config.servicios.length <= 1) {
        toast('Debe quedar al menos un servicio configurado.', 'warning');
        return;
    }
    if (!confirm('¿Eliminar este servicio y su configuración?')) return;
    State.config.servicios = State.config.servicios.filter(function(s) { return s.id !== svcId; });
    programarGuardado();
    UI_renderListaServicios();
}

function _actualizarDescA1() {
    const desc = document.getElementById('descA1');
    if (!desc) return;
    const n = State.config.servicios.length;
    desc.textContent = n + ' servicio' + (n !== 1 ? 's' : '') + ' configurado' + (n !== 1 ? 's' : '');
}

// ── A2: Convenio ──────────────────────────────────────────────────────────

function _renderPanelA2() {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panelA2';

    panel.innerHTML =
        '<div class="panel-header" onclick="togglePanel(this)">' +
            '<span class="panel-icon">📋</span>' +
            '<h2>A2 · Convenio / Normativa Laboral</h2>' +
            '<span class="panel-toggle">▼</span>' +
        '</div>' +
        '<div class="panel-body">' +
            '<div class="info-box">💡 Todos los parámetros tienen el toggle <strong>N/A</strong>. ' +
                'Al activarlo el parámetro queda excluido del cálculo sin perder su valor de referencia.</div>' +
            '<div class="actions" style="margin-bottom:16px;margin-top:0;">' +
                '<button class="btn btn-secondary btn-sm" onclick="UI_presetConvenioES()">📄 Preset Convenio Español CC</button>' +
                '<button class="btn btn-secondary btn-sm" onclick="UI_resetConvenio()">↺ Restaurar defaults</button>' +
            '</div>' +
            '<div class="param-grid" id="gridConvenio"></div>' +
            '<hr class="divider">' +
            '<div class="sub-panel">' +
                '<div class="sub-panel-header" onclick="toggleSubPanel(this)">' +
                    '<h3>➕ Campos libres del convenio</h3>' +
                    '<span class="sp-toggle">▼</span>' +
                '</div>' +
                '<div class="sp-body">' +
                    '<div id="listaCamposLibres" style="margin-bottom:10px;"></div>' +
                    '<button class="btn btn-secondary btn-sm" onclick="UI_addCampoLibre()">➕ Añadir campo libre</button>' +
                '</div>' +
            '</div>' +
            '<hr class="divider">' +
            '<div class="sub-panel sp-collapsed">' +
                '<div class="sub-panel-header" onclick="toggleSubPanel(this)">' +
                    '<h3>⚡ Reglas de excepción</h3>' +
                    '<span class="sp-toggle">▼</span>' +
                '</div>' +
                '<div class="sp-body">' +
                    '<div class="info-box" style="margin-bottom:12px;">💡 Define condiciones especiales por segmento de staff. ' +
                        'Una regla sin filtros aplica globalmente (como los antiguos campos libres).</div>' +
                    '<div id="listaReglasExcepcion" style="margin-bottom:10px;"></div>' +
                    '<button class="btn btn-secondary btn-sm" onclick="UI_addReglaExcepcion()">⚡ Añadir regla</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    setTimeout(function() {
        UI_renderGridConvenio();
        UI_renderCamposLibres();
        UI_renderReglasExcepcion();
    }, 0);

    return panel;
}

function UI_renderGridConvenio() {
    const grid = document.getElementById('gridConvenio');
    if (!grid) return;
    grid.innerHTML = '';

    Object.keys(CONVENIO_META).forEach(function(clave) {
        const meta  = CONVENIO_META[clave];
        const campo = State.convenio[clave];
        grid.appendChild(renderCampoEditable({
            id:         'conv_' + clave,
            label:      meta.label,
            unidad:     meta.unidad,
            ref:        meta.ref,
            tipo:       CONVENIO_INPUT_TYPE[clave] || 'number',
            step:       CONVENIO_STEP[clave]       || 1,
            min:        0,
            valor:      campo.valor,
            noAplica:   campo.noAplica,
            onChange:   function(v) { State.convenio[clave].valor = parseFloat(v); programarGuardado(); },
            onNaChange: function(na) { State.convenio[clave].noAplica = na; programarGuardado(); }
        }));
    });
}

function UI_renderCamposLibres() {
    const lista = document.getElementById('listaCamposLibres');
    if (!lista) return;
    lista.innerHTML = '';

    if (!State.convenio.camposLibres.length) {
        lista.innerHTML = '<div style="font-size:12px;color:var(--nb-text-light);padding:6px 0;">No hay campos libres definidos.</div>';
        return;
    }

    // Cabecera de columnas
    const cabecera = document.createElement('div');
    cabecera.style.cssText = 'display:grid;grid-template-columns:1fr 90px 160px auto auto;gap:6px;' +
        'align-items:center;margin-bottom:4px;padding:0 2px;';
    cabecera.innerHTML =
        '<span style="font-size:10px;font-weight:700;color:var(--nb-text-light);text-transform:uppercase;">Nombre</span>' +
        '<span style="font-size:10px;font-weight:700;color:var(--nb-text-light);text-transform:uppercase;">Valor</span>' +
        '<span style="font-size:10px;font-weight:700;color:var(--nb-text-light);text-transform:uppercase;">Rol en dimensionamiento</span>' +
        '<span></span><span></span>';
    lista.appendChild(cabecera);

    State.convenio.camposLibres.forEach(function(campo, idx) {
        const rolActual = campo.rol || 'info';

        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1fr 90px 160px auto auto;' +
            'gap:6px;align-items:center;margin-bottom:6px;';

        // Input nombre
        const inpNombre = document.createElement('input');
        inpNombre.type = 'text';
        inpNombre.placeholder = 'Nombre del campo';
        inpNombre.value = campo.nombre || '';
        inpNombre.style.cssText = 'padding:5px 8px;border:1px solid var(--nb-border);border-radius:4px;font-size:12px;font-family:inherit;';
        inpNombre.addEventListener('change', function(e) {
            State.convenio.camposLibres[idx].nombre = e.target.value; programarGuardado();
        });

        // Input valor (solo texto/número — el label indica la unidad)
        const inpValor = document.createElement('input');
        inpValor.type = rolActual === 'info' ? 'text' : 'number';
        inpValor.placeholder = rolActual === 'info' ? 'Valor' : '%';
        inpValor.value = campo.valor || '';
        inpValor.min = 0;
        inpValor.style.cssText = 'padding:5px 8px;border:1px solid var(--nb-border);border-radius:4px;font-size:12px;font-family:inherit;';
        inpValor.addEventListener('change', function(e) {
            State.convenio.camposLibres[idx].valor = e.target.value; programarGuardado();
        });

        // Select de rol
        const selRol = document.createElement('select');
        selRol.style.cssText = 'padding:5px 6px;border:1px solid var(--nb-border);border-radius:4px;font-size:12px;font-family:inherit;';
        ROLES_CAMPO_LIBRE.forEach(function(r) {
            const opt = document.createElement('option');
            opt.value = r.value;
            opt.textContent = r.label;
            if (r.value === rolActual) opt.selected = true;
            selRol.appendChild(opt);
        });
        selRol.addEventListener('change', function(e) {
            State.convenio.camposLibres[idx].rol = e.target.value;
            // Cambiar tipo del input valor según el rol
            inpValor.type = e.target.value === 'info' ? 'text' : 'number';
            inpValor.placeholder = e.target.value === 'info' ? 'Valor' : '%';
            programarGuardado();
        });

        // Toggle N/A
        const naLbl = document.createElement('label');
        naLbl.className = 'na-toggle';
        const naChk = document.createElement('input');
        naChk.type = 'checkbox';
        naChk.checked = !!campo.noAplica;
        naChk.addEventListener('change', function(e) {
            State.convenio.camposLibres[idx].noAplica = e.target.checked; programarGuardado();
        });
        naLbl.appendChild(naChk);
        naLbl.appendChild(document.createTextNode(' N/A'));

        // Botón eliminar
        const btnDel = crearBtn('', 'btn-danger btn-sm', '🗑', function() {
            UI_eliminarCampoLibre(idx);
        });

        row.appendChild(inpNombre);
        row.appendChild(inpValor);
        row.appendChild(selRol);
        row.appendChild(naLbl);
        row.appendChild(btnDel);
        lista.appendChild(row);
    });
}

function UI_addCampoLibre() {
    State.convenio.camposLibres.push({ nombre: '', valor: '', noAplica: false, rol: 'info' });
    UI_renderCamposLibres();
    programarGuardado();
}

function UI_eliminarCampoLibre(idx) {
    State.convenio.camposLibres.splice(idx, 1);
    UI_renderCamposLibres();
    programarGuardado();
}

function UI_presetConvenioES() {
    Object.keys(PRESET_CONVENIO_ES_CC).forEach(function(k) {
        if (State.convenio[k]) {
            State.convenio[k].valor    = PRESET_CONVENIO_ES_CC[k].valor;
            State.convenio[k].noAplica = PRESET_CONVENIO_ES_CC[k].noAplica;
        }
    });
    UI_renderGridConvenio();
    programarGuardado();
    toast('Convenio Español CC aplicado', 'success');
}

function UI_resetConvenio() { UI_presetConvenioES(); }

// ── A2: Reglas de excepción ───────────────────────────────────────────────

/** Metadatos param base (Fase 2) */
var _REG_PARAM_BASE_META = [
    { key: 'shrinkage',        label: 'Shrinkage adicional',  unidad: '%',    min: 0, max: 100,  step: 0.1 },
    { key: 'reduccionJornada', label: 'Reducción de jornada', unidad: '%',    min: 0, max: 50,   step: 0.1 },
    { key: 'ocupacionMax',     label: 'Ocupación máxima',     unidad: '%',    min: 1, max: 100,  step: 1   },
    { key: 'ahtOverride',      label: 'AHT override',         unidad: 'seg',  min: 1, max: 9999, step: 1   },
    { key: 'jornadaSemanal',   label: 'Jornada semanal',      unidad: 'h',    min: 1, max: 60,   step: 0.5 },
    { key: 'vacaciones',       label: 'Vacaciones',           unidad: 'días', min: 0, max: 60,   step: 1   }
];

/** Metadatos Rotación y turnos (Fase 4) */
var _REG_ROTACION_META = [
    { key: 'frecuencia',          label: 'Frecuencia rotación',    tipo: 'select',
      opciones: ['semanal','quincenal','mensual','trimestral','no_rota'],
      labels:   ['Semanal','Quincenal','Mensual','Trimestral','No rota'] },
    { key: 'patronFds',           label: 'Patrón FDS',             tipo: 'select',
      opciones: ['1_cada_2','1_cada_3','1_cada_4','libre','nunca'],
      labels:   ['1 de cada 2','1 de cada 3','1 de cada 4','Libre','Nunca'] },
    { key: 'fdsAlMes',            label: 'FDS trabajados / mes',   unidad: 'FDS',  min: 0, max: 10,  step: 1 },
    { key: 'cambiosTurnoMes',     label: 'Cambios de turno / mes', unidad: '/mes', min: 0, max: 50,  step: 1 },
    { key: 'cambiosTurnoAnio',    label: 'Cambios de turno / año', unidad: '/año', min: 0, max: 200, step: 1 },
    { key: 'descansoCambioTurno', label: 'Descanso entre turnos',  unidad: 'h',    min: 0, max: 72,  step: 1 },
    { key: 'maxNochesConsec',     label: 'Máx. noches consecutivas',unidad: 'n.',   min: 1, max: 20,  step: 1 },
    { key: 'nochesAlMes',         label: 'Noches al mes',          unidad: 'n.',   min: 0, max: 31,  step: 1 }
];

/** Metadatos Carga especial (Fase 4) */
var _REG_CARGA_META = [
    { key: 'festivosObligAnio',  label: 'Festivos oblig. / año',  unidad: 'días', min: 0,    max: 30,   step: 1 },
    { key: 'guardiasAlMes',      label: 'Guardias / mes',          unidad: '/mes', min: 0,    max: 20,   step: 1 },
    { key: 'jornadaPartidaMes',  label: 'Jornada partida / mes',   unidad: '/mes', min: 0,    max: 31,   step: 1 },
    { key: 'horasExtraMes',      label: 'Horas extra / mes',       unidad: 'h',    min: 0,    max: 200,  step: 1 },
    { key: 'horasExtraAnio',     label: 'Horas extra / año',       unidad: 'h',    min: 0,    max: 1000, step: 1 },
    { key: 'bolsaHoras',         label: 'Bolsa de horas',          unidad: 'h',    min: -500, max: 500,  step: 1 }
];

/** Metadatos Teletrabajo (Fase 4) */
var _REG_TELETRABAJO_META = [
    { key: 'diasSemana', label: 'Días teletrabajo / semana', unidad: 'días', min: 0, max: 7,  step: 1 },
    { key: 'diasMes',    label: 'Días teletrabajo / mes',    unidad: 'días', min: 0, max: 31, step: 1 }
];

/**
 * Renderiza un grupo de parámetros de un sub-objeto (rotacion, carga, teletrabajo).
 * Soporta tipo 'select' (valor string) y tipo numérico (por defecto).
 */
function _rRegla_grupoSubParams(titulo, subObj, metas) {
    var wrap = document.createElement('div');
    wrap.style.marginTop = '10px';

    var tit = document.createElement('div');
    tit.textContent = 'Excepciones · ' + titulo;
    tit.style.cssText = 'font-size:10px;font-weight:700;color:var(--nb-text-light);' +
        'text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;';
    wrap.appendChild(tit);

    metas.forEach(function(meta) {
        var param = subObj[meta.key];
        if (!param) return;

        var fila = document.createElement('div');
        fila.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:7px;';

        var chk = document.createElement('input');
        chk.type    = 'checkbox';
        chk.checked = !!param.activa;
        chk.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--nb-primary);flex-shrink:0;';

        var lbl = document.createElement('span');
        lbl.textContent = meta.label;
        lbl.style.cssText = 'flex:1;font-size:12px;color:' +
            (param.activa ? 'var(--nb-text)' : 'var(--nb-text-light)') + ';';

        var ctrl;
        if (meta.tipo === 'select') {
            ctrl = document.createElement('select');
            ctrl.disabled = !param.activa;
            ctrl.style.cssText = 'width:130px;padding:4px 6px;border:1px solid var(--nb-border);' +
                'border-radius:4px;font-size:12px;font-family:inherit;transition:opacity 0.15s;' +
                (param.activa ? '' : 'opacity:0.3;');
            // Op placeholder vacía
            var dflt = document.createElement('option');
            dflt.value = ''; dflt.textContent = '– Elige –';
            ctrl.appendChild(dflt);
            meta.opciones.forEach(function(val, i) {
                var opt = document.createElement('option');
                opt.value = val;
                opt.textContent = meta.labels[i];
                if (val === param.valor) opt.selected = true;
                ctrl.appendChild(opt);
            });
            ctrl.addEventListener('change', function() {
                param.valor = ctrl.value || null;
                programarGuardado();
            });
        } else {
            ctrl = document.createElement('input');
            ctrl.type        = 'number';
            ctrl.value       = param.valor !== null ? param.valor : '';
            ctrl.placeholder = '–';
            ctrl.min         = meta.min;
            ctrl.max         = meta.max;
            ctrl.step        = meta.step;
            ctrl.disabled    = !param.activa;
            ctrl.style.cssText = 'width:76px;padding:4px 6px;border:1px solid var(--nb-border);' +
                'border-radius:4px;font-size:12px;font-family:inherit;text-align:right;' +
                'transition:opacity 0.15s;' + (param.activa ? '' : 'opacity:0.3;');
            ctrl.addEventListener('change', function() {
                param.valor = ctrl.value !== '' ? parseFloat(ctrl.value) : null;
                programarGuardado();
            });
        }

        var uni = document.createElement('span');
        uni.textContent = meta.tipo === 'select' ? '' : (meta.unidad || '');
        uni.style.cssText = 'font-size:11px;color:var(--nb-text-light);width:28px;flex-shrink:0;';

        chk.addEventListener('change', function() {
            param.activa       = chk.checked;
            lbl.style.color    = param.activa ? 'var(--nb-text)' : 'var(--nb-text-light)';
            ctrl.disabled      = !param.activa;
            ctrl.style.opacity = param.activa ? '' : '0.3';
            programarGuardado();
        });

        fila.appendChild(chk);
        fila.appendChild(lbl);
        fila.appendChild(ctrl);
        fila.appendChild(uni);
        wrap.appendChild(fila);
    });

    return wrap;
}

function UI_renderReglasExcepcion() {
    var lista = document.getElementById('listaReglasExcepcion');
    if (!lista) return;
    lista.innerHTML = '';

    if (!State.convenio.reglasExcepcion.length) {
        lista.innerHTML = '<div style="font-size:12px;color:var(--nb-text-light);padding:4px 0;">' +
            'No hay reglas definidas. Una regla sin filtros equivale a un campo libre global.</div>';
        return;
    }

    State.convenio.reglasExcepcion.forEach(function(regla) {
        lista.appendChild(_rRegla_crearTarjeta(regla));
    });
}

function UI_addReglaExcepcion() {
    State.convenio.reglasExcepcion.push(crearReglaExcepcion('Nueva regla'));
    UI_renderReglasExcepcion();
    programarGuardado();
    toast('Regla añadida', 'success');
}

function UI_eliminarReglaExcepcion(reglaId) {
    State.convenio.reglasExcepcion = State.convenio.reglasExcepcion.filter(function(r) {
        return r.id !== reglaId;
    });
    UI_renderReglasExcepcion();
    programarGuardado();
}

function _rRegla_crearTarjeta(regla) {
    var card = document.createElement('div');
    card.style.cssText = 'border:1px solid var(--nb-border);border-radius:6px;margin-bottom:8px;' +
        'overflow:hidden;transition:opacity 0.2s;' + (regla.activa ? '' : 'opacity:0.5;');

    // ── Header ────────────────────────────────────────────────────────────
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;' +
        'background:var(--nb-grey-bg);cursor:pointer;user-select:none;';

    // Botón activa (toggle ●/○)
    var btnActiva = document.createElement('button');
    btnActiva.textContent = regla.activa ? '●' : '○';
    btnActiva.title = regla.activa ? 'Activa — clic para desactivar' : 'Inactiva — clic para activar';
    btnActiva.style.cssText = 'font-size:15px;line-height:1;background:none;border:none;cursor:pointer;' +
        'padding:0;flex-shrink:0;color:' + (regla.activa ? 'var(--nb-primary)' : 'var(--nb-text-light)') + ';';
    btnActiva.addEventListener('click', function(e) {
        e.stopPropagation();
        regla.activa = !regla.activa;
        card.style.opacity      = regla.activa ? '' : '0.5';
        btnActiva.textContent   = regla.activa ? '●' : '○';
        btnActiva.style.color   = regla.activa ? 'var(--nb-primary)' : 'var(--nb-text-light)';
        btnActiva.title         = regla.activa ? 'Activa — clic para desactivar' : 'Inactiva — clic para activar';
        programarGuardado();
    });

    // Nombre editable inline
    var inpNombre = document.createElement('input');
    inpNombre.type        = 'text';
    inpNombre.value       = regla.nombre;
    inpNombre.placeholder = 'Nombre de la regla';
    inpNombre.style.cssText = 'flex:1;padding:3px 7px;border:1px solid transparent;border-radius:4px;' +
        'font-size:13px;font-weight:600;font-family:inherit;background:transparent;color:var(--nb-text);';
    inpNombre.addEventListener('focus', function() {
        inpNombre.style.borderColor = 'var(--nb-primary)';
        inpNombre.style.background  = '#fff';
    });
    inpNombre.addEventListener('blur', function() {
        inpNombre.style.borderColor = 'transparent';
        inpNombre.style.background  = 'transparent';
    });
    inpNombre.addEventListener('click',  function(e) { e.stopPropagation(); });
    inpNombre.addEventListener('change', function() { regla.nombre = inpNombre.value; programarGuardado(); });

    // Flecha acordeón
    var arrow = document.createElement('span');
    arrow.textContent = '▶';
    arrow.style.cssText = 'font-size:10px;color:var(--nb-text-light);transition:transform 0.2s;flex-shrink:0;';

    // Botón eliminar
    var btnDel = document.createElement('button');
    btnDel.textContent = '🗑';
    btnDel.title = 'Eliminar regla';
    btnDel.style.cssText = 'background:none;border:none;cursor:pointer;font-size:13px;padding:2px;flex-shrink:0;';
    btnDel.addEventListener('click', function(e) {
        e.stopPropagation();
        UI_eliminarReglaExcepcion(regla.id);
    });

    hdr.appendChild(btnActiva);
    hdr.appendChild(inpNombre);
    hdr.appendChild(arrow);
    hdr.appendChild(btnDel);

    // ── Body (acordeón, colapsado por defecto) ────────────────────────────
    var body = document.createElement('div');
    body.style.cssText = 'padding:12px 14px;border-top:1px solid var(--nb-border);display:none;';

    // Bloque filtros (Fase 3)
    body.appendChild(_rRegla_seccionFiltros(regla));

    var titBase = document.createElement('div');
    titBase.textContent = 'Excepciones · Cálculo base';
    titBase.style.cssText = 'font-size:10px;font-weight:700;color:var(--nb-text-light);' +
        'text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;';
    body.appendChild(titBase);

    _REG_PARAM_BASE_META.forEach(function(meta) {
        body.appendChild(_rRegla_filaParam(regla, meta));
    });

    // Grupos Fase 4
    body.appendChild(_rRegla_grupoSubParams(
        'Rotación y turnos', regla.parametros.rotacion, _REG_ROTACION_META
    ));
    body.appendChild(_rRegla_grupoSubParams(
        'Carga especial', regla.parametros.carga, _REG_CARGA_META
    ));
    body.appendChild(_rRegla_grupoSubParams(
        'Teletrabajo', regla.parametros.teletrabajo, _REG_TELETRABAJO_META
    ));

    // Toggle acordeón en el header de la tarjeta
    var bodyVisible = false;
    hdr.addEventListener('click', function() {
        bodyVisible = !bodyVisible;
        body.style.display    = bodyVisible ? '' : 'none';
        arrow.style.transform = bodyVisible ? 'rotate(90deg)' : '';
    });

    card.appendChild(hdr);
    card.appendChild(body);
    return card;
}

function _rRegla_filaParam(regla, meta) {
    var param = regla.parametros[meta.key];

    var fila = document.createElement('div');
    fila.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:7px;';

    var chk = document.createElement('input');
    chk.type    = 'checkbox';
    chk.checked = !!param.activa;
    chk.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--nb-primary);flex-shrink:0;';

    var lbl = document.createElement('span');
    lbl.textContent = meta.label;
    lbl.style.cssText = 'flex:1;font-size:12px;color:' +
        (param.activa ? 'var(--nb-text)' : 'var(--nb-text-light)') + ';';

    var inp = document.createElement('input');
    inp.type        = 'number';
    inp.value       = param.valor !== null ? param.valor : '';
    inp.placeholder = '–';
    inp.min         = meta.min;
    inp.max         = meta.max;
    inp.step        = meta.step;
    inp.disabled    = !param.activa;
    inp.style.cssText = 'width:76px;padding:4px 6px;border:1px solid var(--nb-border);border-radius:4px;' +
        'font-size:12px;font-family:inherit;text-align:right;transition:opacity 0.15s;' +
        (param.activa ? '' : 'opacity:0.3;');

    var uni = document.createElement('span');
    uni.textContent = meta.unidad;
    uni.style.cssText = 'font-size:11px;color:var(--nb-text-light);width:28px;flex-shrink:0;';

    chk.addEventListener('change', function() {
        param.activa      = chk.checked;
        lbl.style.color   = param.activa ? 'var(--nb-text)' : 'var(--nb-text-light)';
        inp.disabled      = !param.activa;
        inp.style.opacity = param.activa ? '' : '0.3';
        programarGuardado();
    });
    inp.addEventListener('change', function() {
        param.valor = inp.value !== '' ? parseFloat(inp.value) : null;
        programarGuardado();
    });

    fila.appendChild(chk);
    fila.appendChild(lbl);
    fila.appendChild(inp);
    fila.appendChild(uni);
    return fila;
}

// ── A2: helpers filtros (Fase 3) ─────────────────────────────────────────

var _TIPOS_TURNO_FILTRO = [
    { value: 'FIJO',              label: 'Fijo'              },
    { value: 'FIJO MAÑANA',       label: 'Fijo Mañana'       },
    { value: 'FIJO TARDE',        label: 'Fijo Tarde'        },
    { value: 'FIJO NOCHE',        label: 'Fijo Noche'        },
    { value: 'ROTATIVO',          label: 'Rotativo'          },
    { value: 'ROTATIVO X 3',      label: 'Rotativo x3'       },
    { value: 'ROTATIVO X 4',      label: 'Rotativo x4'       },
    { value: 'PARTIDO',           label: 'Partido'           },
    { value: 'PARTIDO IRR 31h',   label: 'Partido Irr 31h'  },
    { value: 'IRR 25h',           label: 'Irr 25h'           },
    { value: 'IRR 28h',           label: 'Irr 28h'           }
];

var _ESTADOS_AGENTE_FILTRO = [
    { value: 'ACTIVO',   label: 'Activo'            },
    { value: 'IT',       label: 'IT (baja)'         },
    { value: 'MAT',      label: 'Maternidad'        },
    { value: 'PAT',      label: 'Paternidad'        },
    { value: 'LACT',     label: 'Lactancia'         },
    { value: 'EXC',      label: 'Excedencia'        },
    { value: 'PR',       label: 'Prácticas'         },
    { value: 'P.DTO',    label: 'P. Dto'            }
];

/**
 * Extrae los valores únicos de un campo del staff cargado.
 * Si no hay staff devuelve el fallback proporcionado.
 * @param {string} campo   clave del objeto agente (p.ej. 'tipoTurno', 'estado', 'sede')
 * @param {Array}  fallback lista [{value,label}] cuando State.staff.todos está vacío
 * @returns {Array} [{value, label}]
 */
function _rRegla_opcionesDesdeStaff(campo, fallback) {
    if (!State.staff.todos.length) return fallback;
    var vistos = {};
    var res = [];
    State.staff.todos.forEach(function(a) {
        var v = (a[campo] || '').trim();
        if (v && !vistos[v]) {
            vistos[v] = true;
            res.push({ value: v, label: v });
        }
    });
    return res.length ? res : fallback;
}

/**
 * Renderiza el bloque «A quién aplica» con los filtros estáticos
 * (servicio, tipo de turno, estado del agente).
 */
function _rRegla_seccionFiltros(regla) {
    var sec = document.createElement('div');
    sec.style.marginBottom = '2px';

    var tit = document.createElement('div');
    tit.textContent = 'A quién aplica (filtro)';
    tit.style.cssText = 'font-size:10px;font-weight:700;color:var(--nb-primary);' +
        'text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;';
    sec.appendChild(tit);

    var sinStaff = !State.staff.todos.length;

    if (sinStaff) {
        var aviso = document.createElement('div');
        aviso.style.cssText = 'font-size:11px;color:var(--nb-text-light);font-style:italic;' +
            'margin-bottom:10px;padding:6px 8px;background:var(--nb-grey-bg);border-radius:4px;';
        aviso.textContent = '⚠️ Sin staff cargado. Carga un Excel con hoja STAFF para ver los valores reales.';
        sec.appendChild(aviso);
    }

    var defs = [
        {
            label:   'Servicio',
            opciones: function() {
                return State.config.servicios.map(function(s) {
                    return { value: s.id, label: s.nombre };
                });
            },
            selArr: regla.filtro.servicios
        },
        {
            label:   'Tipo de turno',
            opciones: function() {
                return _rRegla_opcionesDesdeStaff('tipoTurno', _TIPOS_TURNO_FILTRO);
            },
            selArr: regla.filtro.tiposTurno
        },
        {
            label:   'Estado agente',
            opciones: function() {
                return _rRegla_opcionesDesdeStaff('estado', _ESTADOS_AGENTE_FILTRO);
            },
            selArr: regla.filtro.estados
        },
        {
            label:   'Sede',
            opciones: function() {
                return _rRegla_opcionesDesdeStaff('sede', []);
            },
            selArr: regla.filtro.sedes
        }
    ];

    defs.forEach(function(def) {
        var fila = document.createElement('div');
        fila.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;';

        var lbl = document.createElement('span');
        lbl.textContent = def.label;
        lbl.style.cssText = 'font-size:11px;color:var(--nb-text-light);width:90px;' +
            'flex-shrink:0;padding-top:4px;';

        var wrap = document.createElement('div');
        _rRegla_chipMulti(wrap, def.opciones(), def.selArr, programarGuardado);

        fila.appendChild(lbl);
        fila.appendChild(wrap);
        sec.appendChild(fila);
    });

    // ── Buscador de agentes individuales ───────────────────────────────
    var filaAgentes = document.createElement('div');
    filaAgentes.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;';

    var lblAg = document.createElement('span');
    lblAg.textContent = 'Agentes';
    lblAg.style.cssText = 'font-size:11px;color:var(--nb-text-light);width:90px;flex-shrink:0;padding-top:4px;';

    var wrapAg = document.createElement('div');
    wrapAg.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:6px;';
    _rRegla_buscadorAgentes(wrapAg, regla.filtro.agentes, sec);

    filaAgentes.appendChild(lblAg);
    filaAgentes.appendChild(wrapAg);
    sec.appendChild(filaAgentes);

    // ── Días de la semana ─────────────────────────────────────────
    var filaDias = document.createElement('div');
    filaDias.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:7px;';

    var lblDias = document.createElement('span');
    lblDias.textContent = 'Días';
    lblDias.style.cssText = 'font-size:11px;color:var(--nb-text-light);width:90px;flex-shrink:0;';

    var wrapDias = document.createElement('div');
    wrapDias.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;flex:1;';

    var DIAS = [
        { val: 1, label: 'L' }, { val: 2, label: 'M' }, { val: 3, label: 'X' },
        { val: 4, label: 'J' }, { val: 5, label: 'V' }, { val: 6, label: 'S' },
        { val: 0, label: 'D' }
    ];
    DIAS.forEach(function(d) {
        var activo = regla.filtro.diasSemana.indexOf(d.val) > -1;
        var btn = document.createElement('button');
        btn.textContent = d.label;
        btn.dataset.dia = d.val;
        btn.title = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.val];
        btn.style.cssText = 'width:26px;height:26px;border-radius:50%;font-size:11px;font-weight:700;' +
            'cursor:pointer;transition:all 0.15s;border:1px solid ' +
            (activo ? 'var(--nb-primary)' : 'var(--nb-border)') + ';' +
            'background:' + (activo ? 'var(--nb-primary)' : '#fff') + ';' +
            'color:'       + (activo ? '#fff'              : 'var(--nb-text-light)') + ';';
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = regla.filtro.diasSemana.indexOf(d.val);
            if (idx > -1) {
                regla.filtro.diasSemana.splice(idx, 1);
                btn.style.background   = '#fff';
                btn.style.borderColor  = 'var(--nb-border)';
                btn.style.color        = 'var(--nb-text-light)';
            } else {
                regla.filtro.diasSemana.push(d.val);
                btn.style.background   = 'var(--nb-primary)';
                btn.style.borderColor  = 'var(--nb-primary)';
                btn.style.color        = '#fff';
            }
            programarGuardado();
        });
        wrapDias.appendChild(btn);
    });

    // Botones rápidos
    var btnLV = document.createElement('button');
    btnLV.textContent = 'L–V';
    btnLV.title = 'Seleccionar lunes a viernes';
    btnLV.style.cssText = 'padding:2px 7px;font-size:10px;border:1px solid var(--nb-border);' +
        'border-radius:4px;background:#fff;cursor:pointer;margin-left:6px;color:var(--nb-text-light);';
    btnLV.addEventListener('click', function(e) {
        e.stopPropagation();
        regla.filtro.diasSemana = [1,2,3,4,5];
        _rRegla_refrescarDias(wrapDias, regla.filtro.diasSemana);
        programarGuardado();
    });

    var btnFDS = document.createElement('button');
    btnFDS.textContent = 'FDS';
    btnFDS.title = 'Seleccionar sábado y domingo';
    btnFDS.style.cssText = btnLV.style.cssText;
    btnFDS.addEventListener('click', function(e) {
        e.stopPropagation();
        regla.filtro.diasSemana = [6,0];
        _rRegla_refrescarDias(wrapDias, regla.filtro.diasSemana);
        programarGuardado();
    });

    var btnTodos = document.createElement('button');
    btnTodos.textContent = 'Todos';
    btnTodos.title = 'Deseleccionar todos los días (sin restricción)';
    btnTodos.style.cssText = btnLV.style.cssText;
    btnTodos.addEventListener('click', function(e) {
        e.stopPropagation();
        regla.filtro.diasSemana = [];
        _rRegla_refrescarDias(wrapDias, regla.filtro.diasSemana);
        programarGuardado();
    });

    wrapDias.appendChild(btnLV);
    wrapDias.appendChild(btnFDS);
    wrapDias.appendChild(btnTodos);

    filaDias.appendChild(lblDias);
    filaDias.appendChild(wrapDias);
    sec.appendChild(filaDias);

    var descripcion = document.createElement('div');
    var tieneFilOS = regla.filtro.servicios.length   ||
                     regla.filtro.tiposTurno.length  ||
                     regla.filtro.estados.length     ||
                     regla.filtro.sedes.length       ||
                     regla.filtro.agentes.length     ||
                     regla.filtro.diasSemana.length;
    descripcion.textContent = tieneFilOS
        ? '⚡ La regla aplica solo a agentes que cumplan los filtros anteriores.'
        : '🌐 Sin filtros — la regla aplica a todo el staff.';
    descripcion.style.cssText = 'font-size:11px;color:var(--nb-text-light);font-style:italic;margin-bottom:10px;';
    sec.appendChild(descripcion);

    var hr = document.createElement('hr');
    hr.style.cssText = 'border:none;border-top:1px solid var(--nb-border);margin:6px 0 12px;';
    sec.appendChild(hr);

    return sec;
}

/**
 * Refresca el estado visual de los botones de días de la semana
 * sin reconstruir toda la sección.
 */
function _rRegla_refrescarDias(wrapDias, diasArr) {
    var VALS = [1,2,3,4,5,6,0];
    var btns = wrapDias.querySelectorAll('button[data-dia]');
    btns.forEach(function(btn) {
        var val = parseInt(btn.dataset.dia, 10);
        var activo = diasArr.indexOf(val) > -1;
        btn.style.background  = activo ? 'var(--nb-primary)' : '#fff';
        btn.style.borderColor = activo ? 'var(--nb-primary)' : 'var(--nb-border)';
        btn.style.color       = activo ? '#fff'              : 'var(--nb-text-light)';
    });
}

/**
 * Buscador de agentes individuales con autocompletado + paste desde Excel.
 * wrapEl: contenedor flex-column donde se renderiza
 * agentesArr: array mutable de codigos seleccionados (regla.filtro.agentes)
 * secPadre: el elemento de la sección filtros (para re-render del aviso)
 */
function _rRegla_buscadorAgentes(wrapEl, agentesArr, secPadre) {
    wrapEl.innerHTML = '';

    // ── Chips de agentes ya seleccionados ──────────────────────────────
    if (agentesArr.length) {
        var chipsWrap = document.createElement('div');
        chipsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        agentesArr.forEach(function(codigo) {
            var agente = State.staff.todos.find(function(a) { return a.codigo === codigo; });
            var label  = agente
                ? codigo + (agente.nombre ? ' · ' + agente.nombre : '')
                : codigo + ' ⚠️';

            var chip = document.createElement('span');
            chip.style.cssText = 'display:inline-flex;align-items:center;gap:2px;padding:2px 8px 2px 9px;' +
                'background:var(--nb-primary-light);border:1px solid var(--nb-primary-mid);' +
                'border-radius:12px;font-size:11px;color:var(--nb-text);white-space:nowrap;';
            chip.appendChild(document.createTextNode(label));

            var btnX = document.createElement('button');
            btnX.textContent = '×';
            btnX.title = 'Quitar';
            btnX.style.cssText = 'background:none;border:none;cursor:pointer;font-size:13px;' +
                'line-height:1;padding:0 0 1px 3px;color:var(--nb-text-light);';
            btnX.addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = agentesArr.indexOf(codigo);
                if (idx > -1) agentesArr.splice(idx, 1);
                _rRegla_buscadorAgentes(wrapEl, agentesArr, secPadre);
                programarGuardado();
            });
            chip.appendChild(btnX);
            chipsWrap.appendChild(chip);
        });
        wrapEl.appendChild(chipsWrap);
    }

    // ── Input buscador ─────────────────────────────────────────────────
    var inputWrap = document.createElement('div');
    inputWrap.style.cssText = 'position:relative;';

    var inp = document.createElement('input');
    inp.type        = 'text';
    inp.placeholder = State.staff.todos.length
        ? '🔍 Buscar por código o nombre... (o pegar columna de Excel)'
        : '⚠️ Carga staff primero';
    inp.disabled    = !State.staff.todos.length;
    inp.style.cssText = 'width:100%;padding:5px 9px;border:1px solid var(--nb-border);' +
        'border-radius:4px;font-size:12px;font-family:inherit;box-sizing:border-box;';

    var dropdown = document.createElement('div');
    dropdown.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;z-index:200;' +
        'background:#fff;border:1px solid var(--nb-border);border-top:none;border-radius:0 0 4px 4px;' +
        'max-height:160px;overflow-y:auto;box-shadow:0 4px 8px rgba(0,0,0,0.08);';

    function _mostrarSugerencias(q) {
        dropdown.innerHTML = '';
        if (!q) { dropdown.style.display = 'none'; return; }
        var ql = q.toLowerCase();
        var candidatos = State.staff.todos.filter(function(a) {
            if (agentesArr.indexOf(a.codigo) > -1) return false;
            return (a.codigo   || '').toLowerCase().indexOf(ql) > -1 ||
                   (a.nombre   || '').toLowerCase().indexOf(ql) > -1;
        }).slice(0, 10);

        if (!candidatos.length) {
            dropdown.style.display = 'none';
            return;
        }
        candidatos.forEach(function(a) {
            var it = document.createElement('div');
            it.style.cssText = 'padding:6px 10px;cursor:pointer;font-size:12px;' +
                'border-bottom:1px solid var(--nb-border);';
            it.textContent = a.codigo + (a.nombre ? ' · ' + a.nombre : '') +
                (a.servicio ? '  [' + a.servicio + ']' : '');
            it.addEventListener('mousedown', function(e) {
                e.preventDefault();
                agentesArr.push(a.codigo);
                inp.value = '';
                dropdown.style.display = 'none';
                _rRegla_buscadorAgentes(wrapEl, agentesArr, secPadre);
                programarGuardado();
            });
            it.addEventListener('mouseover', function() { it.style.background = 'var(--nb-primary-light)'; });
            it.addEventListener('mouseout',  function() { it.style.background = ''; });
            dropdown.appendChild(it);
        });
        dropdown.style.display = '';
    }

    inp.addEventListener('input', function() { _mostrarSugerencias(inp.value.trim()); });
    inp.addEventListener('blur',  function() { setTimeout(function() { dropdown.style.display = 'none'; }, 150); });
    inp.addEventListener('focus', function() { if (inp.value.trim()) _mostrarSugerencias(inp.value.trim()); });

    // Paste desde Excel: detecta saltos de línea o punto y coma → añade múltiples códigos
    inp.addEventListener('paste', function(e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text');
        var codigos = text.split(/[\n\r\t;,]+/).map(function(c) { return c.trim(); }).filter(Boolean);
        var anadidos = 0;
        codigos.forEach(function(cod) {
            var existe = State.staff.todos.some(function(a) { return a.codigo === cod; });
            if (existe && agentesArr.indexOf(cod) < 0) {
                agentesArr.push(cod);
                anadidos++;
            }
        });
        if (anadidos) {
            _rRegla_buscadorAgentes(wrapEl, agentesArr, secPadre);
            programarGuardado();
            toast(anadidos + ' agente' + (anadidos > 1 ? 's' : '') + ' añadido' + (anadidos > 1 ? 's' : ''), 'success');
        } else {
            toast('No se encontraron códigos en el staff cargado', 'warning');
        }
    });

    inputWrap.appendChild(inp);
    inputWrap.appendChild(dropdown);
    wrapEl.appendChild(inputWrap);
}

/**
 * Renderiza un selector multi-chip dentro de `wrapEl`.
 * opciones: [{value, label}]   selArr: array mutable del filtro
 * onChg: callback al cambiar la selección
 */
function _rRegla_chipMulti(wrapEl, opciones, selArr, onChg) {
    wrapEl.innerHTML = '';
    wrapEl.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-height:24px;flex:1;';

    if (!selArr.length) {
        var todos = document.createElement('span');
        todos.textContent = '(todos)';
        todos.style.cssText = 'font-size:11px;color:var(--nb-text-light);font-style:italic;margin-right:4px;padding-top:2px;';
        wrapEl.appendChild(todos);
    }

    selArr.forEach(function(val) {
        var opt = opciones.find(function(o) { return o.value === val; });
        var label = opt ? opt.label : val;

        var chip = document.createElement('span');
        chip.style.cssText = 'display:inline-flex;align-items:center;gap:2px;padding:2px 8px 2px 9px;' +
            'background:var(--nb-primary-light);border:1px solid var(--nb-primary-mid);' +
            'border-radius:12px;font-size:11px;color:var(--nb-text);white-space:nowrap;';

        var txt = document.createTextNode(label);
        var btnX = document.createElement('button');
        btnX.textContent = '×';
        btnX.title = 'Quitar';
        btnX.style.cssText = 'background:none;border:none;cursor:pointer;font-size:13px;line-height:1;' +
            'padding:0 0 1px 3px;color:var(--nb-text-light);';
        btnX.addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = selArr.indexOf(val);
            if (idx > -1) selArr.splice(idx, 1);
            _rRegla_chipMulti(wrapEl, opciones, selArr, onChg);
            onChg();
        });

        chip.appendChild(txt);
        chip.appendChild(btnX);
        wrapEl.appendChild(chip);
    });

    var pendientes = opciones.filter(function(o) { return selArr.indexOf(o.value) < 0; });
    if (pendientes.length) {
        var addSel = document.createElement('select');
        addSel.style.cssText = 'padding:2px 4px;border:1px solid var(--nb-border);border-radius:4px;' +
            'font-size:11px;font-family:inherit;color:var(--nb-text-light);cursor:pointer;max-width:130px;';
        var dflt = document.createElement('option');
        dflt.value = '';
        dflt.textContent = '+ Añadir...';
        addSel.appendChild(dflt);
        pendientes.forEach(function(o) {
            var opt2 = document.createElement('option');
            opt2.value = o.value;
            opt2.textContent = o.label;
            addSel.appendChild(opt2);
        });
        addSel.addEventListener('click', function(e) { e.stopPropagation(); });
        addSel.addEventListener('change', function() {
            if (addSel.value) {
                selArr.push(addSel.value);
                _rRegla_chipMulti(wrapEl, opciones, selArr, onChg);
                onChg();
            }
        });
        wrapEl.appendChild(addSel);
    }
}

// ── A3: Perfiles ──────────────────────────────────────────────────────────

function _renderPanelA3() {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panelA3';

    panel.innerHTML =
        '<div class="panel-header" onclick="togglePanel(this)">' +
            '<span class="panel-icon">💾</span>' +
            '<h2>A3 · Perfiles de Configuración</h2>' +
            '<span class="panel-toggle">▼</span>' +
        '</div>' +
        '<div class="panel-body">' +
            '<div class="info-box">💡 Guarda múltiples configuraciones nombradas (distintos clientes, servicios o convenios) ' +
                'y cárgalas con un clic. El último perfil activo se restaura automáticamente.</div>' +
            '<div class="flex-gap flex-wrap" style="margin-bottom:16px;">' +
                '<input id="inputNombrePerfil" type="text" placeholder="Nombre del perfil..."' +
                ' style="flex:1;min-width:180px;padding:7px 10px;border:1px solid var(--nb-border);' +
                'border-radius:4px;font-size:13px;font-family:inherit;">' +
                '<button class="btn btn-primary btn-sm" onclick="UI_guardarPerfil()">💾 Guardar perfil</button>' +
                '<button class="btn btn-secondary btn-sm" onclick="exportarPerfiles()">📤 Exportar JSON</button>' +
                '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">📥 Importar JSON' +
                    '<input type="file" accept=".json" style="display:none;" onchange="UI_importarPerfiles(event)">' +
                '</label>' +
            '</div>' +
            '<div id="listaPerfiles"></div>' +
        '</div>';

    setTimeout(function() { UI_renderListaPerfiles(); }, 0);
    return panel;
}

function UI_renderListaPerfiles() {
    const lista = document.getElementById('listaPerfiles');
    if (!lista) return;

    const perfiles = Object.values(State.perfiles.lista);

    if (!perfiles.length) {
        lista.innerHTML =
            '<div style="text-align:center;padding:24px;color:var(--nb-text-light);font-size:13px;">' +
            'No hay perfiles guardados aún. Configura el servicio y el convenio y guarda tu primer perfil.' +
            '</div>';
        return;
    }

    // Ordenar por fecha desc
    perfiles.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });

    const ul = document.createElement('div');
    ul.className = 'profile-list';

    perfiles.forEach(function(p) {
        const activo = p.nombre === State.perfiles.activo;
        const fecha  = new Date(p.fecha).toLocaleString('es-ES', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const item = document.createElement('div');
        item.className = 'profile-item' + (activo ? ' active' : '');
        item.innerHTML =
            '<span class="profile-name">' + _esc(p.nombre) + (activo ? ' ✓' : '') + '</span>' +
            '<span class="profile-date">' + fecha + '</span>';

        const btnCargar = crearBtn('Cargar', 'btn-secondary btn-sm', '', function() {
            UI_cargarPerfil(p.nombre);
        });
        const btnBorrar = crearBtn('', 'btn-danger btn-sm', '🗑', function() {
            UI_borrarPerfil(p.nombre);
        });

        item.appendChild(btnCargar);
        item.appendChild(btnBorrar);
        ul.appendChild(item);
    });

    lista.innerHTML = '';
    lista.appendChild(ul);
}

function UI_guardarPerfil() {
    const input  = document.getElementById('inputNombrePerfil');
    const nombre = (input && input.value.trim()) || State.perfiles.activo;
    if (!nombre) { toast('Introduce un nombre para el perfil', 'warning'); return; }
    guardarPerfil(nombre);
    if (input) input.value = '';
    UI_renderListaPerfiles();
    toast('Perfil "' + nombre + '" guardado', 'success');
}

function UI_cargarPerfil(nombre) {
    if (!cargarPerfil(nombre)) return;
    // Actualizar inputs del proyecto
    const inp = document.getElementById('inputNombreProyecto');
    if (inp) inp.value = State.config.nombreProyecto;
    UI_renderGridConvenio();
    UI_renderListaServicios();
    UI_renderListaPerfiles();
    toast('Perfil "' + nombre + '" cargado', 'success');
}

function UI_borrarPerfil(nombre) {
    if (!confirm('¿Eliminar el perfil "' + nombre + '"?')) return;
    borrarPerfil(nombre);
    UI_renderListaPerfiles();
    toast('Perfil "' + nombre + '" eliminado');
}

function UI_importarPerfiles(event) {
    const file = event.target.files[0];
    if (!file) return;
    importarPerfiles(file)
        .then(function(n) {
            UI_renderListaPerfiles();
            toast(n + ' perfil' + (n !== 1 ? 'es' : '') + ' importado' + (n !== 1 ? 's' : ''), 'success');
        })
        .catch(function(e) { toast('Error al importar: ' + e.message, 'error'); });
}

// (Panel B eliminado — sustituido por panelStaff y panelPrevision como módulos independientes)

// ── (B1/B2/B3 eliminados — su funcionalidad está en panelStaff y panelPrevision) ──

function _renderSubPanelB1_OBSOLETO() {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panelB1';

    panel.innerHTML =
        '<div class="panel-header" onclick="togglePanel(this)">' +
            '<span class="panel-icon">📂</span>' +
            '<h2>B1 · Carga de datos Excel</h2>' +
            '<span class="panel-toggle">▼</span>' +
        '</div>' +
        '<div class="panel-body">' +
            '<div class="info-box">💡 El Excel debe tener hojas <strong>STAFF</strong>, <strong>Previsión</strong> ' +
                'y opcionalmente <strong>Último Turno</strong>. Todo lo cargado es editable desde la UI.</div>' +
            '<div id="uploadZone" style="border:2px dashed var(--nb-border);border-radius:8px;padding:32px 24px;' +
                'text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:12px;">' +
                '<div style="font-size:32px;margin-bottom:8px;">📁</div>' +
                '<div style="font-weight:700;font-size:14px;margin-bottom:4px;">Arrastra el Excel aquí o haz clic</div>' +
                '<div style="font-size:12px;color:var(--nb-text-light);">.xlsx · .xls</div>' +
                '<input type="file" id="inputExcel" accept=".xlsx,.xls" style="display:none;">' +
            '</div>' +
            '<div id="ultimoBanner" style="display:none;"></div>' +
            '<div id="resultadoCarga" style="display:none;"></div>' +
            '<div class="actions">' +
                '<button class="btn btn-secondary btn-sm" id="btnGenerarDemo">🧪 Generar datos demo</button>' +
            '</div>' +
        '</div>';

    // Comprobar si hay un archivo previo en IDB
    setTimeout(function() {
        recuperarUltimoArchivo().then(function(file) {
            if (!file) return;
            _mostrarBannerUltimoArchivo(file.name,
                function() { _cargarExcel(file); });
        }).catch(function() {});
    }, 0);

    // Eventos
    setTimeout(function() {
        const zone  = panel.querySelector('#uploadZone');
        const input = panel.querySelector('#inputExcel');
        if (!zone || !input) return;

        zone.addEventListener('click', function() { input.click(); });
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.style.borderColor = 'var(--nb-primary)';
        });
        zone.addEventListener('dragleave', function() {
            zone.style.borderColor = 'var(--nb-border)';
        });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.style.borderColor = 'var(--nb-border)';
            const file = e.dataTransfer.files[0];
            if (file) _cargarExcel(file);
        });
        input.addEventListener('change', function(e) {
            if (e.target.files[0]) _cargarExcel(e.target.files[0]);
        });
        panel.querySelector('#btnGenerarDemo').addEventListener('click', function() {
            if (generarDemoData()) {
                // Refrescar paneles B2 y B3 si están visibles
                const b2body = document.getElementById('editorPrevisionBody');
                if (b2body) renderEditorPrevision(b2body);
                const b3body = document.getElementById('resumenStaffBody');
                if (b3body) renderResumenStaff(b3body);
            }
        });
    }, 0);

    return panel;
}

// (B1, B2, B3 y helpers de carga eliminados — ver panelStaff y panelPrevision)

// ══════════════════════════════════════════════════════════════════════════════//  HELPERS DE ACORDEÓN (llamados desde onclick en el HTML dinámico)
// ══════════════════════════════════════════════════════════════════════════

function togglePanel(header) {
    const panel = header.closest('.panel');
    panel.classList.toggle('collapsed');
}

function toggleSubPanel(header) {
    const sp = header.closest('.sub-panel');
    sp.classList.toggle('sp-collapsed');
}

// ══════════════════════════════════════════════════════════════════════════
//  UTILIDAD INTERNA
// ══════════════════════════════════════════════════════════════════════════

/** Escapa caracteres HTML para inserción segura en atributos/texto */
function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
