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
        '</div>';

    setTimeout(function() {
        UI_renderGridConvenio();
        UI_renderCamposLibres();
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
