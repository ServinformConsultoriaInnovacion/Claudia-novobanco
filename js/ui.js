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
        case 'panelStaff':     _renderPanelStaff(main); break;
        case 'panelPrevision': renderModuloPrevision(main); break;
        case 'panelA':         _renderPanelA(main); break;
        case 'panelC':         _renderPanelC(main); break;
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

// ════════════════════════════════════════════════════════════════════════════
//  PANEL C — Dimensionamiento Erlang C
// ════════════════════════════════════════════════════════════════════════════

function _renderPanelC(container) {
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panelC';

    panel.innerHTML =
        '<div class="panel-header" style="cursor:default;">' +
            '<span class="panel-icon">📐</span>' +
            '<h2>C · Dimensionamiento Erlang C</h2>' +
        '</div>' +
        '<div class="panel-body">';

    container.appendChild(panel);
    var body = panel.querySelector('.panel-body');

    // ── Guardia: necesita previsión ───────────────────────────────────────
    var tieneDatos = Object.keys(State.forecast.llamadas || {}).length > 0;
    if (!tieneDatos) {
        body.innerHTML =
            '<div class="info-box" style="background:#fff3cd;border-color:#ffc107;color:#856404;">' +
            '⚠️ No hay datos de previsión cargados. Ve al panel <strong>Previsión</strong> y carga ' +
            'un Excel o introduce datos manualmente.</div>';
        return;
    }

    var tieneServicios = (State.config.servicios || []).length > 0;
    if (!tieneServicios) {
        body.innerHTML =
            '<div class="info-box" style="background:#fff3cd;border-color:#ffc107;color:#856404;">' +
            '⚠️ No hay servicios configurados. Ve al panel <strong>Configuración</strong> y define al menos un servicio.</div>';
        return;
    }

    // ── Parámetros globales ───────────────────────────────────────────────
    var opts = State.dimensionamiento.opciones;

    var secParams = document.createElement('div');
    secParams.style.cssText = 'background:var(--nb-grey-bg);border:1px solid var(--nb-border);' +
        'border-radius:6px;padding:14px 16px;margin-bottom:16px;';

    var titParams = document.createElement('div');
    titParams.textContent = 'Parámetros del cálculo';
    titParams.style.cssText = 'font-size:11px;font-weight:700;color:var(--nb-text-light);' +
        'text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;';
    secParams.appendChild(titParams);

    var rowParams = document.createElement('div');
    rowParams.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;';

    // Selector de servicio
    var wSvc = _pC_labelWrap('Servicio');
    var selSvc = document.createElement('select');
    selSvc.style.cssText = _pC_ctrlStyle();
    var optTodos = document.createElement('option');
    optTodos.value = ''; optTodos.textContent = 'Todos los servicios';
    selSvc.appendChild(optTodos);
    State.config.servicios.forEach(function(svc) {
        var o = document.createElement('option');
        o.value = svc.id; o.textContent = svc.nombre;
        if (opts.soloServicio === svc.id) o.selected = true;
        selSvc.appendChild(o);
    });
    selSvc.addEventListener('change', function() {
        opts.soloServicio = selSvc.value || null;
        programarGuardado();
    });
    wSvc.appendChild(selSvc);
    rowParams.appendChild(wSvc);

    // Fecha desde
    var wFd = _pC_labelWrap('Desde');
    var inpFd = document.createElement('input');
    inpFd.type = 'date'; inpFd.value = opts.fechaDesde || '';
    inpFd.style.cssText = _pC_ctrlStyle();
    inpFd.addEventListener('change', function() {
        opts.fechaDesde = inpFd.value || null; programarGuardado();
    });
    wFd.appendChild(inpFd);
    rowParams.appendChild(wFd);

    // Fecha hasta
    var wFh = _pC_labelWrap('Hasta');
    var inpFh = document.createElement('input');
    inpFh.type = 'date'; inpFh.value = opts.fechaHasta || '';
    inpFh.style.cssText = _pC_ctrlStyle();
    inpFh.addEventListener('change', function() {
        opts.fechaHasta = inpFh.value || null; programarGuardado();
    });
    wFh.appendChild(inpFh);
    rowParams.appendChild(wFh);

    // Shrinkage extra global
    var wShk = _pC_labelWrap('Shrinkage extra (%)');
    var inpShk = document.createElement('input');
    inpShk.type = 'number'; inpShk.min = '0'; inpShk.max = '60';
    inpShk.step = '0.1'; inpShk.value = opts.shrinkageExtra || 0;
    inpShk.style.cssText = _pC_ctrlStyle('80px');
    inpShk.title = 'Shrinkage adicional global encima del shrinkage de cada servicio';
    inpShk.addEventListener('change', function() {
        opts.shrinkageExtra = parseFloat(inpShk.value) || 0; programarGuardado();
    });
    wShk.appendChild(inpShk);
    rowParams.appendChild(wShk);

    // Botón calcular
    var btnCalc = document.createElement('button');
    btnCalc.textContent = '🔄 Calcular';
    btnCalc.className = 'btn btn-primary';
    btnCalc.style.cssText = 'align-self:flex-end;';
    btnCalc.addEventListener('click', function() { _pC_ejecutarCalculo(body, btnCalc); });
    rowParams.appendChild(btnCalc);

    secParams.appendChild(rowParams);
    body.appendChild(secParams);

    // ── Shrinkage mensual diferenciado ────────────────────────────────────
    _pC_seccionShrinkageMensual(body);

    // ── Zona de resultados (se rellena al calcular) ───────────────────────
    var zonaResultados = document.createElement('div');
    zonaResultados.id = 'pC_resultados';
    body.appendChild(zonaResultados);

    // Si hay resultado previo, mostrarlo
    if (State.dimensionamiento.resultado) {
        _pC_renderResultados(zonaResultados, State.dimensionamiento.resultado);
    }
}

// ── Helpers de layout ─────────────────────────────────────────────────────

function _pC_labelWrap(label) {
    var w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    var lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = 'font-size:11px;font-weight:600;color:var(--nb-text-light);';
    w.appendChild(lbl);
    return w;
}

function _pC_ctrlStyle(width) {
    return 'padding:5px 8px;border:1px solid var(--nb-border);border-radius:4px;' +
        'font-size:12px;font-family:inherit;' + (width ? 'width:' + width + ';' : '');
}

// ── Ejecución del cálculo ─────────────────────────────────────────────────

function _pC_ejecutarCalculo(body, btnCalc) {
    btnCalc.disabled    = true;
    btnCalc.textContent = '⏳ Calculando…';

    // Diferir para no bloquear el repintado del botón
    setTimeout(function() {
        try {
            var opts = State.dimensionamiento.opciones;
            var res  = dimensionarTodo({
                fechaDesde:     opts.fechaDesde,
                fechaHasta:     opts.fechaHasta,
                soloServicio:   opts.soloServicio,
                shrinkageExtra: opts.shrinkageExtra
            });
            State.dimensionamiento.resultado = res;
            programarGuardado();

            var zona = document.getElementById('pC_resultados');
            if (zona) _pC_renderResultados(zona, res);
            toast('Dimensionamiento completado — ' + res.resumen.totalFranjas + ' franjas calculadas', 'success');
        } catch (e) {
            console.error('[PanelC] Error al calcular:', e);
            toast('Error en el cálculo: ' + e.message, 'error');
        } finally {
            btnCalc.disabled    = false;
            btnCalc.textContent = '🔄 Calcular';
        }
    }, 30);
}

// ── Renderizado de resultados ─────────────────────────────────────────────

function _pC_renderResultados(zona, res) {
    zona.innerHTML = '';

    if (!res || !res.filas || res.filas.length === 0) {
        zona.innerHTML = '<div class="info-box">No hay resultados para los filtros seleccionados.</div>';
        return;
    }

    var r = res.resumen;

    // ── KPI cards ─────────────────────────────────────────────────────────
    var kpis = document.createElement('div');
    kpis.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));' +
        'gap:10px;margin-bottom:16px;';
    [
        { label: '📞 Total llamadas',   valor: r.totalLlamadas.toLocaleString('es-ES') },
        { label: '👤 FTE pico',         valor: r.agentesMax },
        { label: '👥 FTE promedio',     valor: r.agentesPromedio },
        { label: '🗓 Franjas calc.',    valor: r.totalFranjas.toLocaleString('es-ES') }
    ].forEach(function(kpi) {
        var card = document.createElement('div');
        card.style.cssText = 'background:#fff;border:1px solid var(--nb-border);border-radius:8px;' +
            'padding:12px 14px;text-align:center;';
        card.innerHTML =
            '<div style="font-size:10px;color:var(--nb-text-light);margin-bottom:4px;">' + kpi.label + '</div>' +
            '<div style="font-size:20px;font-weight:800;color:var(--nb-primary);">' + kpi.valor + '</div>';
        kpis.appendChild(card);
    });
    zona.appendChild(kpis);

    // ── Tabs C1 / C2 ─────────────────────────────────────────────────────
    var tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:0;border-bottom:2px solid var(--nb-border);margin-bottom:14px;';

    var tabContent = document.createElement('div');

    function _activarTab(id) {
        tabBar.querySelectorAll('button[data-pctab]').forEach(function(b) {
            var activo = b.dataset.pctab === id;
            b.style.cssText = 'padding:7px 18px;font-size:12px;font-weight:' + (activo ? '700' : '500') + ';' +
                'border:none;border-bottom:2px solid ' + (activo ? 'var(--nb-primary)' : 'transparent') + ';' +
                'background:none;cursor:pointer;color:' + (activo ? 'var(--nb-primary)' : 'var(--nb-text-light)') + ';' +
                'margin-bottom:-2px;white-space:nowrap;';
        });
        tabContent.innerHTML = '';
        if      (id === 'c1') _pC_renderTablaC1(tabContent, res);
        else if (id === 'c2') _pC_renderTablaC2(tabContent, res);
        else                  _pC_renderCuadrante(tabContent, res);
    }

    [{ id:'c1', label:'📊 C1 · Dimensionamiento ideal' },
     { id:'c2', label:'⚖️ C2 · Requerido vs staff' },
     { id:'c3', label:'🗓 C3 · Cuadrante gestor×día' }]
    .forEach(function(t) {
        var btn = document.createElement('button');
        btn.textContent  = t.label;
        btn.dataset.pctab = t.id;
        btn.addEventListener('click', function() { _activarTab(t.id); });
        tabBar.appendChild(btn);
    });

    zona.appendChild(tabBar);
    zona.appendChild(tabContent);
    _activarTab('c1');
}

// ── C1: Tabla pivot días × franjas ────────────────────────────────────────

function _pC_renderTablaC1(zona, res) {
    var DIAS_C = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    // Construir pivot: fecha → franja → datos agregados
    var pivot      = {};
    var fechasSet  = {};
    var franjasSet = {};

    res.filas.forEach(function(f) {
        fechasSet[f.fecha]   = true;
        franjasSet[f.franja] = true;
        if (!pivot[f.fecha]) pivot[f.fecha] = {};
        if (!pivot[f.fecha][f.franja]) {
            pivot[f.fecha][f.franja] = { llamadas:0, ahtPeso:0, ahtPesoN:0, agentes:0, slaMin:null };
        }
        var c = pivot[f.fecha][f.franja];
        c.llamadas   += f.llamadas;
        c.ahtPeso    += (f.llamadas || 0) * (f.aht || 0);  // AHT ponderado por llamadas
        c.ahtPesoN   += (f.llamadas || 0);
        c.agentes    += f.agentes;   // FTE total = suma de servicios
        if (f.sla !== null) c.slaMin = (c.slaMin === null) ? f.sla : Math.min(c.slaMin, f.sla);
    });

    var fechas  = Object.keys(fechasSet).sort();
    var franjas = Object.keys(franjasSet).sort();

    // Máximo FTE por franja (para heatmap de intensidad)
    var maxFTE = {};
    franjas.forEach(function(fr) {
        var mx = 0;
        fechas.forEach(function(fe) {
            if (pivot[fe] && pivot[fe][fr]) mx = Math.max(mx, pivot[fe][fr].agentes);
        });
        maxFTE[fr] = mx;
    });

    // Contenedor scroll bidireccional
    var wrap = document.createElement('div');
    wrap.style.cssText = 'overflow:auto;border:1px solid var(--nb-border);border-radius:6px;' +
        'max-height:calc(100vh - 380px);';

    var tbl = document.createElement('table');
    tbl.style.cssText = 'border-collapse:collapse;font-size:11px;white-space:nowrap;';

    // ── Cabecera ─────────────────────────────────────────────────────────
    var thead = document.createElement('thead');

    // Fila 1: franjas horarias
    var trH = document.createElement('tr');
    var thEsq = document.createElement('th');
    thEsq.textContent = 'Fecha';
    thEsq.style.cssText = _pC_thSt(true, true) + 'min-width:105px;z-index:4;';
    trH.appendChild(thEsq);
    franjas.forEach(function(fr) {
        var th = document.createElement('th');
        th.textContent = fr;
        th.style.cssText = _pC_thSt(false, true) + 'text-align:center;min-width:72px;';
        trH.appendChild(th);
    });
    thead.appendChild(trH);

    // Fila 2: FTE pico del periodo por franja
    var trPico = document.createElement('tr');
    var tdPicoLbl = document.createElement('td');
    tdPicoLbl.innerHTML = '<span style="font-size:9px;font-weight:700;color:var(--nb-text-light);">PICO PERIODO</span>';
    tdPicoLbl.style.cssText = _pC_thSt(true, false) + 'background:var(--nb-grey-bg);z-index:3;';
    trPico.appendChild(tdPicoLbl);
    franjas.forEach(function(fr) {
        var td = document.createElement('td');
        td.style.cssText = _pC_thSt(false, false) + 'text-align:center;background:var(--nb-grey-bg);border-top:none;';
        var mx = maxFTE[fr];
        td.innerHTML = mx > 0
            ? '<span style="font-size:13px;font-weight:800;color:var(--nb-primary);">' + mx + '</span>'
            : '<span style="color:var(--nb-border);">—</span>';
        trPico.appendChild(td);
    });
    thead.appendChild(trPico);
    tbl.appendChild(thead);

    // ── Cuerpo ────────────────────────────────────────────────────────────
    var tbody = document.createElement('tbody');
    fechas.forEach(function(fecha, iFecha) {
        var d = new Date(fecha + 'T00:00:00');
        var diaN = DIAS_C[d.getDay()];
        var esFDS = (d.getDay() === 0 || d.getDay() === 6);
        var bgFila = esFDS ? '#eff6ff' : (iFecha % 2 === 0 ? '#fff' : 'var(--nb-grey-bg)');

        var tr = document.createElement('tr');

        // Celda fecha (sticky izquierda)
        var tdF = document.createElement('td');
        tdF.style.cssText = 'position:sticky;left:0;z-index:2;' +
            'background:' + (esFDS ? '#dbeafe' : 'var(--nb-grey-bg)') + ';' +
            'padding:4px 8px;border-bottom:1px solid var(--nb-border);' +
            'border-right:2px solid var(--nb-border);min-width:105px;';
        tdF.innerHTML =
            '<span style="font-size:9px;font-weight:600;color:' +
            (esFDS ? '#1e40af' : 'var(--nb-text-light)') + ';">' + diaN + '</span>' +
            '<br><span style="font-size:12px;font-weight:700;">' +
            fecha.slice(8) + '/' + fecha.slice(5, 7) + '</span>';
        tr.appendChild(tdF);

        // Celdas de franjas
        franjas.forEach(function(fr) {
            var cel = pivot[fecha] && pivot[fecha][fr];
            var td  = document.createElement('td');
            td.style.cssText = 'padding:3px 4px;border-bottom:1px solid var(--nb-border);' +
                'border-right:1px solid var(--nb-border);text-align:center;' +
                'vertical-align:middle;background:' + bgFila + ';';

            if (!cel || cel.agentes === 0) {
                td.innerHTML = '<span style="color:var(--nb-border);font-size:10px;">—</span>';
            } else {
                var ahtMedio = cel.ahtPesoN > 0 ? Math.round(cel.ahtPeso / cel.ahtPesoN) : 0;
                var ratio    = maxFTE[fr] > 0 ? cel.agentes / maxFTE[fr] : 0;
                var bgFTE = ratio <= 0.4  ? '#dcfce7'
                          : ratio <= 0.65 ? '#fef9c3'
                          : ratio <= 0.85 ? '#fed7aa'
                          :                 '#fecaca';
                var colorFTE = ratio > 0.65 ? '#7f1d1d' : '#14532d';

                td.innerHTML =
                    '<div style="font-size:9px;color:var(--nb-text-light);line-height:1.5;">' +
                        Math.round(cel.llamadas) + '&thinsp;llam' +
                    '</div>' +
                    '<div style="font-size:9px;color:var(--nb-text-light);line-height:1.5;">' +
                        'AHT&thinsp;' + ahtMedio + 's' +
                    '</div>' +
                    '<div style="display:inline-block;font-size:14px;font-weight:800;' +
                        'background:' + bgFTE + ';color:' + colorFTE + ';' +
                        'border-radius:4px;padding:1px 5px;min-width:26px;line-height:1.6;">' +
                        cel.agentes +
                    '</div>';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    zona.appendChild(wrap);

    // Leyenda heatmap
    var ley = document.createElement('div');
    ley.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:10px;color:var(--nb-text-light);align-items:center;';
    ley.innerHTML =
        '<span style="font-weight:700;">FTE pico:</span>' +
        '<span style="background:#dcfce7;padding:1px 6px;border-radius:3px;color:#14532d;">≤40%</span>' +
        '<span style="background:#fef9c3;padding:1px 6px;border-radius:3px;color:#713f12;">41–65%</span>' +
        '<span style="background:#fed7aa;padding:1px 6px;border-radius:3px;color:#7c2d12;">66–85%</span>' +
        '<span style="background:#fecaca;padding:1px 6px;border-radius:3px;color:#7f1d1d;">&gt;85%</span>' +
        '<span style="margin-left:8px;">🟦 = fin de semana</span>' +
        '<span>Número = agentes de plantilla (incluye shrinkage)</span>';
    zona.appendChild(ley);
}

// ── C2: Requerido vs staff disponible ────────────────────────────────────

/**
 * Devuelve true si el agente cubre la franja HH:MM en el día de semana indicado.
 * Revisa los 4 segmentos inicio/fin del agente.
 * diasSemana: 0=Dom, 1=Lun…6=Sáb
 */
function _pC_cubreFranja(agente, franjaHHMM, diaSemana) {
    // Determinar si el agente trabaja ese día según su tipo de turno
    var t = (agente.tipoTurno || '').toUpperCase();
    var esFDS = (diaSemana === 0 || diaSemana === 6);
    // Si tiene disponibilidad NF sólo trabaja L-V; 7D cualquier día
    var disp = (agente.disponibilidad || 'NF').toUpperCase();
    if (disp !== '7D' && esFDS) return false;
    // Turnos explícitamente de FDS no cubren L-V
    if ((t === 'FDS' || t === 'FINDE') && !esFDS) return false;

    // Comprobar si la franja cae en alguno de los segmentos horarios
    var segmentos = [
        { ini: agente.inicioTurno,  fin: agente.finTurno  },
        { ini: agente.inicioTurno2, fin: agente.finTurno2 },
        { ini: agente.inicioTurno3, fin: agente.finTurno3 },
        { ini: agente.inicioTurno4, fin: agente.finTurno4 }
    ];
    for (var si = 0; si < segmentos.length; si++) {
        var seg = segmentos[si];
        if (!seg.ini || !seg.fin) continue;
        // Comparación lexicográfica HH:MM es suficiente para rango intradiario
        if (franjaHHMM >= seg.ini && franjaHHMM < seg.fin) return true;
    }
    return false;
}

function _pC_renderTablaC2(zona, res) {
    var DIAS_C = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    // Reusar el mismo pivot que C1
    var pivot      = {};
    var fechasSet  = {};
    var franjasSet = {};
    res.filas.forEach(function(f) {
        fechasSet[f.fecha]   = true;
        franjasSet[f.franja] = true;
        if (!pivot[f.fecha]) pivot[f.fecha] = {};
        if (!pivot[f.fecha][f.franja]) pivot[f.fecha][f.franja] = { requerido: 0 };
        pivot[f.fecha][f.franja].requerido += f.agentes;
    });
    var fechas  = Object.keys(fechasSet).sort();
    var franjas = Object.keys(franjasSet).sort();

    // Staff activo con inicioTurno definido
    var staffActivo = State.staff.activos.filter(function(a) { return !!a.inicioTurno; });
    var hayStaff    = staffActivo.length > 0;

    if (!hayStaff) {
        var aviso = document.createElement('div');
        aviso.style.cssText = 'background:#fff3cd;border:1px solid #ffc107;border-radius:6px;' +
            'padding:14px 18px;margin-bottom:14px;font-size:12px;color:#856404;';
        aviso.innerHTML = '⚠️ No hay staff activo cargado con horarios definidos. ' +
            'Carga el fichero de plantilla en el <strong>Panel Staff</strong> para ver el cruce.';
        zona.appendChild(aviso);
    }

    // Calcular disponibles por fecha+franja
    var dispMap = {};  // fecha → franja → nDisponibles
    fechas.forEach(function(fecha) {
        var d   = new Date(fecha + 'T00:00:00');
        var dia = d.getDay();  // 0=Dom…6=Sáb
        dispMap[fecha] = {};
        franjas.forEach(function(fr) {
            if (!hayStaff) { dispMap[fecha][fr] = null; return; }
            var n = 0;
            staffActivo.forEach(function(a) {
                if (_pC_cubreFranja(a, fr, dia)) n++;
            });
            dispMap[fecha][fr] = n;
        });
    });

    // Contruir tabla
    var wrap = document.createElement('div');
    wrap.style.cssText = 'overflow:auto;border:1px solid var(--nb-border);border-radius:6px;' +
        'max-height:calc(100vh - 400px);margin-bottom:10px;';

    var tbl = document.createElement('table');
    tbl.style.cssText = 'border-collapse:collapse;font-size:11px;white-space:nowrap;';

    // Cabecera
    var thead = document.createElement('thead');
    var trH = document.createElement('tr');
    var thEsq = document.createElement('th');
    thEsq.innerHTML = 'Fecha<br><span style="font-size:9px;font-weight:400;color:var(--nb-text-light);">Req / Disp / Δ</span>';
    thEsq.style.cssText = _pC_thSt(true, true) + 'min-width:110px;z-index:4;';
    trH.appendChild(thEsq);
    franjas.forEach(function(fr) {
        var th = document.createElement('th');
        th.textContent = fr;
        th.style.cssText = _pC_thSt(false, true) + 'text-align:center;min-width:68px;';
        trH.appendChild(th);
    });
    thead.appendChild(trH);
    tbl.appendChild(thead);

    var tbody = document.createElement('tbody');
    fechas.forEach(function(fecha, iFecha) {
        var d   = new Date(fecha + 'T00:00:00');
        var dia = d.getDay();
        var diaN  = DIAS_C[dia];
        var esFDS = (dia === 0 || dia === 6);
        var bgFila = esFDS ? '#eff6ff' : (iFecha % 2 === 0 ? '#fff' : 'var(--nb-grey-bg)');

        var tr = document.createElement('tr');

        // Columna fecha sticky
        var tdF = document.createElement('td');
        tdF.style.cssText = 'position:sticky;left:0;z-index:2;' +
            'background:' + (esFDS ? '#dbeafe' : 'var(--nb-grey-bg)') + ';' +
            'padding:4px 8px;border-bottom:1px solid var(--nb-border);' +
            'border-right:2px solid var(--nb-border);min-width:110px;';
        tdF.innerHTML =
            '<span style="font-size:9px;font-weight:600;color:' +
            (esFDS ? '#1e40af' : 'var(--nb-text-light)') + ';">' + diaN + '</span>' +
            '<br><span style="font-size:12px;font-weight:700;">' +
            fecha.slice(8) + '/' + fecha.slice(5,7) + '</span>';
        tr.appendChild(tdF);

        franjas.forEach(function(fr) {
            var cel  = pivot[fecha] && pivot[fecha][fr];
            var td   = document.createElement('td');
            td.style.cssText = 'padding:3px 4px;border-bottom:1px solid var(--nb-border);' +
                'border-right:1px solid var(--nb-border);text-align:center;' +
                'vertical-align:middle;background:' + bgFila + ';';

            if (!cel || cel.requerido === 0) {
                td.innerHTML = '<span style="color:var(--nb-border);font-size:10px;">—</span>';
            } else {
                var req  = cel.requerido;
                var disp = dispMap[fecha][fr];
                var delta = disp !== null ? (disp - req) : null;

                var bgCell = '#fff';
                var colorDelta = 'var(--nb-text)';
                if (delta !== null) {
                    if      (delta >= 0)           { bgCell = '#dcfce7'; colorDelta = '#166534'; }
                    else if (delta >= -Math.round(req * 0.2)) { bgCell = '#fef9c3'; colorDelta = '#854d0e'; }
                    else                            { bgCell = '#fecaca'; colorDelta = '#991b1b'; }
                }
                td.style.background = bgCell;

                var dispTxt = disp !== null ? String(disp) : '?';
                var deltaTxt = delta !== null
                    ? (delta >= 0 ? '+' + delta : String(delta))
                    : '?';

                td.innerHTML =
                    '<div style="font-size:9px;color:var(--nb-text-light);line-height:1.6;">' +
                        'Req: <strong>' + req + '</strong>' +
                    '</div>' +
                    '<div style="font-size:9px;color:var(--nb-text-light);line-height:1.6;">' +
                        'Disp: <strong>' + dispTxt + '</strong>' +
                    '</div>' +
                    '<div style="font-size:13px;font-weight:800;line-height:1.6;color:' + colorDelta + ';">' +
                        deltaTxt +
                    '</div>';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    zona.appendChild(wrap);

    // Leyenda
    var ley = document.createElement('div');
    ley.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;font-size:10px;color:var(--nb-text-light);align-items:center;margin-top:4px;';
    ley.innerHTML =
        '<span style="font-weight:700;">Δ = Disponibles − Requeridos:</span>' +
        '<span style="background:#dcfce7;padding:1px 6px;border-radius:3px;color:#166534;">≥ 0 superávit</span>' +
        '<span style="background:#fef9c3;padding:1px 6px;border-radius:3px;color:#854d0e;">déficit ≤ 20%</span>' +
        '<span style="background:#fecaca;padding:1px 6px;border-radius:3px;color:#991b1b;">déficit > 20%</span>' +
        '<span style="margin-left:8px;">Disponibles = agentes activos cuyo turno horario cubre esa franja ese día</span>';
    zona.appendChild(ley);
}

// ── C3: Cuadrante gestor × día ─────────────────────────────────────────────

function _pC_renderCuadrante(zona, res) {
    var DIAS_C  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    var DIAS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

    // Estado de semana navegable
    if (!zona._semOffset) zona._semOffset = 0;

    // Calcular fechas de la semana (Lun‥Dom) según offset de semanas desde hoy
    function semanaDe(offset) {
        var hoy  = new Date();
        var diaH = hoy.getDay() || 7;  // 1=Lun…7=Dom
        var lun  = new Date(hoy);
        lun.setDate(hoy.getDate() - (diaH - 1) + offset * 7);
        var dias = [];
        for (var i = 0; i < 7; i++) {
            var d = new Date(lun);
            d.setDate(lun.getDate() + i);
            dias.push(d);
        }
        return dias;
    }

    function toStr(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // FTE requerido máximo del día: max(agentes) en todas las franjas de esa fecha
    var maxReqPorFecha = {};
    if (res && res.filas) {
        res.filas.forEach(function(f) {
            if (!maxReqPorFecha[f.fecha] || f.agentes > maxReqPorFecha[f.fecha])
                maxReqPorFecha[f.fecha] = f.agentes;
        });
    }

    function render() {
        zona.innerHTML = '';
        var dias   = semanaDe(zona._semOffset);
        var staff  = State.staff.todos;
        var sinStaff = !staff.length;

        if (sinStaff) {
            zona.innerHTML =
                '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;' +
                'padding:14px 18px;font-size:12px;color:#856404;">' +
                '⚠️ No hay staff cargado. Ve al <strong>Panel Staff</strong> e importa la plantilla.' +
                '</div>';
            return;
        }

        // Navbar de semana
        var nav = document.createElement('div');
        nav.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;';

        var btnPrev = document.createElement('button');
        btnPrev.textContent = '← Sem. anterior';
        btnPrev.className   = 'btn';
        btnPrev.style.cssText = 'font-size:11px;padding:4px 10px;';
        btnPrev.addEventListener('click', function() { zona._semOffset--; render(); });

        var lblSem = document.createElement('span');
        lblSem.style.cssText = 'font-size:12px;font-weight:700;color:var(--nb-primary);min-width:200px;text-align:center;';
        var d0 = dias[0], d6 = dias[6];
        lblSem.textContent = d0.getDate() + '/' + (d0.getMonth()+1) + ' – ' +
            d6.getDate() + '/' + (d6.getMonth()+1) + '/' + d6.getFullYear();

        var btnNext = document.createElement('button');
        btnNext.textContent = 'Sem. siguiente →';
        btnNext.className   = 'btn';
        btnNext.style.cssText = 'font-size:11px;padding:4px 10px;';
        btnNext.addEventListener('click', function() { zona._semOffset++; render(); });

        nav.appendChild(btnPrev);
        nav.appendChild(lblSem);
        nav.appendChild(btnNext);

        // Filtro por servicio
        var selSvc = document.createElement('select');
        selSvc.style.cssText = 'font-size:11px;padding:3px 8px;border:1px solid var(--nb-border);border-radius:4px;margin-left:auto;';
        var oTodos = document.createElement('option');
        oTodos.value = ''; oTodos.textContent = 'Todos los servicios';
        selSvc.appendChild(oTodos);
        State.config.servicios.forEach(function(svc) {
            var o = document.createElement('option');
            o.value = svc.id; o.textContent = svc.nombre;
            selSvc.appendChild(o);
        });
        selSvc.addEventListener('change', function() {
            zona._filtroSvc = selSvc.value || null;
            render();
        });
        if (zona._filtroSvc) selSvc.value = zona._filtroSvc;
        nav.appendChild(selSvc);
        zona.appendChild(nav);

        // Staff filtrado
        var staffFiltrado = staff.filter(function(a) {
            if (zona._filtroSvc && a.servicioId !== zona._filtroSvc) return false;
            return true;
        });

        if (!staffFiltrado.length) {
            zona.innerHTML += '<div style="font-size:12px;color:var(--nb-text-light);padding:20px;">No hay agentes para el filtro seleccionado.</div>';
            return;
        }

        // Calcular disponibles por día para el pie de tabla
        var dispPorDia = dias.map(function(d) {
            var dia = d.getDay();
            var n = staffFiltrado.filter(function(a) {
                if (!a.inicioTurno) return false;
                return _pC_cubreFranja(a, a.inicioTurno, dia);
            }).length;
            return n;
        });

        // Tabla
        var wrap = document.createElement('div');
        wrap.style.cssText = 'overflow:auto;border:1px solid var(--nb-border);border-radius:6px;' +
            'max-height:calc(100vh - 440px);';

        var tbl = document.createElement('table');
        tbl.style.cssText = 'border-collapse:collapse;font-size:11px;white-space:nowrap;width:100%;';

        // Cabecera: Agente + 7 días
        var thead = document.createElement('thead');
        var trH   = document.createElement('tr');
        var thAg  = document.createElement('th');
        thAg.textContent = 'Agente';
        thAg.style.cssText = _pC_thSt(true, true) + 'min-width:160px;z-index:4;';
        trH.appendChild(thAg);
        dias.forEach(function(d) {
            var dia   = d.getDay();
            var esFDS = (dia === 0 || dia === 6);
            var th    = document.createElement('th');
            th.style.cssText = _pC_thSt(false, true) + 'text-align:center;min-width:80px;' +
                (esFDS ? 'color:#1e40af;background:#dbeafe;' : '');
            th.innerHTML = '<span style="font-size:10px;">' + DIAS_C[dia] + '</span><br>' +
                d.getDate() + '/' + (d.getMonth()+1);
            trH.appendChild(th);
        });
        thead.appendChild(trH);
        tbl.appendChild(thead);

        var tbody   = document.createElement('tbody');
        var ESTADOS_AUSENCIA = ['IT','MAT','PAT','LACT','EXC','PR','P.DTO','VAC'];

        staffFiltrado.forEach(function(a, iA) {
            var tr = document.createElement('tr');
            tr.style.background = iA % 2 === 0 ? '#fff' : 'var(--nb-grey-bg)';

            // Celda nombre agente (sticky)
            var tdNom = document.createElement('td');
            tdNom.style.cssText = 'position:sticky;left:0;z-index:2;background:inherit;' +
                'padding:5px 10px;border-bottom:1px solid var(--nb-border);' +
                'border-right:2px solid var(--nb-border);min-width:160px;';
            tdNom.innerHTML =
                '<div style="font-size:11px;font-weight:700;">' + (a.codigo || '—') + '</div>' +
                '<div style="font-size:10px;color:var(--nb-text-light);">' + (a.tipoTurno || '') + '</div>';
            tr.appendChild(tdNom);

            dias.forEach(function(d) {
                var fecha  = toStr(d);
                var dia    = d.getDay();
                var esFDS  = (dia === 0 || dia === 6);
                var td     = document.createElement('td');
                td.style.cssText = 'padding:4px 6px;border-bottom:1px solid var(--nb-border);' +
                    'border-right:1px solid var(--nb-border);text-align:center;vertical-align:middle;' +
                    (esFDS ? 'background:#eff6ff;' : '');

                // Determinar estado del agente en esa fecha
                var codigo   = a.codigo || '';
                var estadoExt = '';
                // Vacaciones
                for (var v = 1; v <= 4; v++) {
                    var vi = a['inicioVac' + v], vf = a['finVac' + v];
                    if (vi && vf && fecha >= vi && fecha <= vf) { estadoExt = 'VAC'; break; }
                }
                // DLF
                if (!estadoExt) {
                    for (var dl = 1; dl <= 6; dl++) {
                        if (a['dlf' + dl] === fecha) { estadoExt = 'DLF'; break; }
                    }
                }
                // Festivos
                if (!estadoExt) {
                    for (var ft = 1; ft <= 6; ft++) {
                        if (a['fest' + ft] === fecha) { estadoExt = 'FEST'; break; }
                    }
                }
                // IT / Ausencia prolongada
                if (!estadoExt) {
                    var estadoBase = (a.estado || '').toUpperCase();
                    if (ESTADOS_AUSENCIA.indexOf(estadoBase) > -1) {
                        if (!a.finAusencia || fecha <= a.finAusencia) estadoExt = estadoBase;
                    }
                }

                // Color y etiqueta por estado
                var COLORES_EST = {
                    'M':    { bg:'#dcfce7', c:'#166534', label:'M' },
                    'T':    { bg:'#fef9c3', c:'#854d0e', label:'T' },
                    'N':    { bg:'#1e293b', c:'#f1f5f9', label:'N' },
                    'P':    { bg:'#e0f2fe', c:'#0c4a6e', label:'P' },
                    'C':    { bg:'#f3e8ff', c:'#6b21a8', label:'C' },
                    'VAC':  { bg:'#fbbf24', c:'#fff',    label:'VAC' },
                    'DLF':  { bg:'#93c5fd', c:'#1e3a8a', label:'DLF' },
                    'FEST': { bg:'#fda4af', c:'#881337', label:'FST' },
                    'IT':   { bg:'#d1d5db', c:'#374151', label:'IT'  },
                    'MAT':  { bg:'#d1d5db', c:'#374151', label:'MAT' },
                    'L':    { bg:'#f1f5f9', c:'#64748b', label:'L'   }
                };

                var ttCode, ttBg, ttC;
                if (estadoExt) {
                    var est = COLORES_EST[estadoExt] || { bg:'#d1d5db', c:'#374151', label: estadoExt };
                    ttCode = est.label; ttBg = est.bg; ttC = est.c;
                } else if (!_pC_cubreFranja(a, a.inicioTurno || '00:00', dia)) {
                    ttCode = 'L'; ttBg = COLORES_EST['L'].bg; ttC = COLORES_EST['L'].c;
                } else {
                    // Código de turno por tipo
                    var tipoUp = (a.tipoTurno || '').toUpperCase();
                    var cod = tipoUp === 'TARDE' ? 'T'
                            : tipoUp === 'NOCHE' ? 'N'
                            : tipoUp === 'PARTIDO' ? 'P'
                            : tipoUp === 'COMPACTADO' ? 'C'
                            : 'M';
                    var ec = COLORES_EST[cod] || COLORES_EST['M'];
                    ttCode = ec.label; ttBg = ec.bg; ttC = ec.c;
                }

                td.innerHTML =
                    '<span style="display:inline-block;padding:2px 7px;border-radius:4px;' +
                    'font-size:11px;font-weight:800;background:' + ttBg + ';color:' + ttC + ';">' +
                    ttCode + '</span>';
                if (a.inicioTurno && !estadoExt) {
                    td.innerHTML += '<div style="font-size:9px;color:var(--nb-text-light);margin-top:1px;">' +
                        a.inicioTurno + '-' + (a.finTurno || '') + '</div>';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        // Fila pie: FTE disponible vs requerido
        var trPie = document.createElement('tr');
        trPie.style.cssText = 'background:var(--nb-grey-bg);font-weight:700;';
        var tdPieLbl = document.createElement('td');
        tdPieLbl.style.cssText = 'position:sticky;left:0;z-index:2;background:var(--nb-grey-bg);' +
            'padding:5px 10px;border-top:2px solid var(--nb-border);border-right:2px solid var(--nb-border);font-size:10px;';
        tdPieLbl.innerHTML = '<span style="font-size:9px;text-transform:uppercase;letter-spacing:.05em;' +
            'color:var(--nb-text-light);">Disponibles<br>vs Requerido</span>';
        trPie.appendChild(tdPieLbl);
        dias.forEach(function(d, idx) {
            var fecha  = toStr(d);
            var dia    = d.getDay();
            var esFDS  = (dia === 0 || dia === 6);
            var tdP    = document.createElement('td');
            tdP.style.cssText = 'padding:5px 6px;border-top:2px solid var(--nb-border);' +
                'border-right:1px solid var(--nb-border);text-align:center;' +
                (esFDS ? 'background:#dbeafe;' : '');

            var disp = staffFiltrado.filter(function(a) {
                if (!a.inicioTurno) return false;
                var estadoBase = (a.estado || '').toUpperCase();
                if (['IT','MAT','PAT','LACT','EXC','PR','P.DTO'].indexOf(estadoBase) > -1) return false;
                // Vacaciones ese día
                for (var v = 1; v <= 4; v++) {
                    var vi = a['inicioVac' + v], vf = a['finVac' + v];
                    if (vi && vf && fecha >= vi && fecha <= vf) return false;
                }
                return _pC_cubreFranja(a, a.inicioTurno, dia);
            }).length;

            var req  = maxReqPorFecha[fecha] || 0;
            var delta = disp - req;
            var bgP   = req === 0  ? 'transparent'
                      : delta >= 0 ? '#dcfce7'
                      : delta >= -Math.round(req * 0.2) ? '#fef9c3'
                      : '#fecaca';
            var cP    = req === 0  ? 'var(--nb-text-light)'
                      : delta >= 0 ? '#166534'
                      : delta >= -Math.round(req * 0.2) ? '#854d0e'
                      : '#991b1b';

            tdP.style.background = bgP;
            tdP.innerHTML =
                '<div style="font-size:12px;font-weight:800;color:' + cP + ';">' +
                    disp + '</div>' +
                '<div style="font-size:9px;color:var(--nb-text-light);">' +
                    (req > 0 ? 'req: ' + req : '—') + '</div>';
            trPie.appendChild(tdP);
        });
        tbody.appendChild(trPie);
        tbl.appendChild(tbody);
        wrap.appendChild(tbl);
        zona.appendChild(wrap);

        // Leyenda
        var ley = document.createElement('div');
        ley.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;font-size:10px;color:var(--nb-text-light);' +
            'align-items:center;margin-top:8px;';
        ley.innerHTML =
            '<span style="font-weight:700;">Turnos:</span>' +
            ['M:#dcfce7:#166534:Mañana','T:#fef9c3:#854d0e:Tarde',
             'N:#1e293b:#f1f5f9:Noche','P:#e0f2fe:#0c4a6e:Partido',
             'C:#f3e8ff:#6b21a8:Compactado','L:#f1f5f9:#64748b:Libre',
             'VAC:#fbbf24:#fff:Vacaciones','DLF:#93c5fd:#1e3a8a:DLF',
             'IT:#d1d5db:#374151:IT/Ausencia'].map(function(s) {
                var p = s.split(':');
                return '<span style="background:' + p[1] + ';color:' + p[2] + ';' +
                    'padding:1px 6px;border-radius:3px;font-weight:700;">' + p[0] + '</span>' +
                    '<span style="margin-right:4px;">' + p[3] + '</span>';
            }).join(' ');
        zona.appendChild(ley);
    }  // end render()

    render();
}

// ── Helpers internos de estilo para tablas C ───────────────────────────────

function _pC_thSt(sticky, topSticky) {
    return 'padding:5px 7px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;' +
        'border-bottom:2px solid var(--nb-border);border-right:1px solid var(--nb-border);' +
        'background:var(--nb-grey-bg);white-space:nowrap;' +
        (topSticky ? 'position:sticky;top:0;' : '') +
        (sticky    ? 'position:sticky;left:0;' : '');
}

// ── Shrinkage mensual diferenciado ────────────────────────────────────────

function _pC_seccionShrinkageMensual(body) {
    var fechas = Object.keys(State.forecast.llamadas || {}).sort();
    if (fechas.length === 0) return;

    // Meses únicos presentes en la previsión
    var vistos = {};
    var meses  = [];
    fechas.forEach(function(f) {
        var m = f.slice(0, 7);
        if (!vistos[m]) { vistos[m] = true; meses.push(m); }
    });
    if (meses.length === 0) return;

    var NOM_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    var sec = document.createElement('div');
    sec.style.cssText = 'background:var(--nb-grey-bg);border:1px solid var(--nb-border);' +
        'border-radius:6px;padding:12px 16px;margin-bottom:16px;';

    // Cabecera toggle
    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;cursor:pointer;';
    var togLabel = document.createElement('span');
    togLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--nb-text-light);' +
        'text-transform:uppercase;letter-spacing:.06em;';
    togLabel.textContent = 'Shrinkage mensual diferenciado';
    var togBtn = document.createElement('span');
    togBtn.textContent = '▼ mostrar';
    togBtn.style.cssText = 'font-size:10px;color:var(--nb-primary);font-weight:600;';
    hdr.appendChild(togLabel);
    hdr.appendChild(togBtn);

    var cuerpo = document.createElement('div');
    cuerpo.style.display = 'none';
    cuerpo.style.marginTop = '12px';

    hdr.addEventListener('click', function() {
        var oculto = cuerpo.style.display === 'none';
        cuerpo.style.display = oculto ? 'block' : 'none';
        togBtn.textContent  = oculto ? '▲ ocultar' : '▼ mostrar';
    });

    // Tabla de meses
    var tbl = document.createElement('table');
    tbl.style.cssText = 'border-collapse:collapse;font-size:12px;';

    var thd = document.createElement('thead');
    thd.innerHTML = '<tr>' +
        '<th style="' + _pC_thSmallSt() + 'text-align:left;min-width:130px;">Mes</th>' +
        '<th style="' + _pC_thSmallSt() + 'min-width:110px;">Oper. (%)</th>' +
        '<th style="' + _pC_thSmallSt() + 'min-width:110px;">Absentismo (%)</th>' +
        '<th style="' + _pC_thSmallSt() + 'min-width:90px;">Factor neto</th>' +
        '</tr>';
    tbl.appendChild(thd);

    var tbd = document.createElement('tbody');
    meses.forEach(function(mesKey, i) {
        var mes   = parseInt(mesKey.split('-')[1], 10);
        var anio  = mesKey.split('-')[0];
        var label = NOM_MESES[mes - 1] + ' ' + anio;
        var exis  = State.dimensionamiento.shrinkageMensual[mesKey] || {};

        var tr = document.createElement('tr');
        tr.style.background = i % 2 === 0 ? '#fff' : 'var(--nb-grey-bg)';

        var tdNom = document.createElement('td');
        tdNom.textContent = label;
        tdNom.style.cssText = _pC_tdSmallSt() + 'font-weight:600;';
        tr.appendChild(tdNom);

        var tdOper   = document.createElement('td');
        tdOper.style.cssText = _pC_tdSmallSt() + 'text-align:center;';
        var inpOper = _pC_mkInput(exis.operativo ? getVal(exis.operativo) : null, 'oper %');
        tdOper.appendChild(inpOper);
        tr.appendChild(tdOper);

        var tdAbs  = document.createElement('td');
        tdAbs.style.cssText = _pC_tdSmallSt() + 'text-align:center;';
        var inpAbs = _pC_mkInput(exis.absentismo ? getVal(exis.absentismo) : null, 'abs %');
        tdAbs.appendChild(inpAbs);
        tr.appendChild(tdAbs);

        var tdFN = document.createElement('td');
        tdFN.style.cssText = _pC_tdSmallSt() + 'text-align:center;font-weight:700;';
        tr.appendChild(tdFN);

        function recalc() {
            var pvd  = (getConvenio('pvdShrinkage') || 0) / 100;
            var oper = (parseFloat(inpOper.value) || 0) / 100;
            var abs  = (parseFloat(inpAbs.value)  || 0) / 100;
            var fn   = (1 - pvd) * (1 - oper) * (1 - abs);
            tdFN.textContent = (fn * 100).toFixed(1) + '%';
            tdFN.style.color = fn < 0.65 ? 'var(--nb-red)'
                             : fn < 0.72 ? '#d97706'
                             :             'var(--nb-green)';
            if (!State.dimensionamiento.shrinkageMensual[mesKey])
                State.dimensionamiento.shrinkageMensual[mesKey] = {};
            var sm = State.dimensionamiento.shrinkageMensual[mesKey];
            sm.operativo  = { valor: parseFloat(inpOper.value) || null,
                              noAplica: inpOper.value.trim() === '' };
            sm.absentismo = { valor: parseFloat(inpAbs.value)  || null,
                              noAplica: inpAbs.value.trim()  === '' };
            programarGuardado();
        }
        inpOper.addEventListener('change', recalc);
        inpAbs.addEventListener('change',  recalc);
        recalc();

        tbd.appendChild(tr);
    });
    tbl.appendChild(tbd);
    cuerpo.appendChild(tbl);

    var nota = document.createElement('div');
    nota.style.cssText = 'font-size:10px;color:var(--nb-text-light);margin-top:8px;';
    nota.textContent = 'Vacío = usa el valor del servicio (Panel A1). ' +
        'Factor neto = (1−PVD) × (1−Oper) × (1−Abs).';
    cuerpo.appendChild(nota);

    sec.appendChild(hdr);
    sec.appendChild(cuerpo);
    body.appendChild(sec);
}

function _pC_mkInput(val, placeholder) {
    var inp = document.createElement('input');
    inp.type = 'number'; inp.min = '0'; inp.max = '60'; inp.step = '0.5';
    inp.placeholder = placeholder;
    inp.value = val != null ? val : '';
    inp.style.cssText = 'width:74px;padding:3px 6px;font-size:11px;text-align:center;' +
        'border:1px solid var(--nb-border);border-radius:4px;font-family:inherit;';
    return inp;
}

function _pC_thSmallSt() {
    return 'padding:5px 10px;font-size:10px;font-weight:700;text-align:center;' +
        'text-transform:uppercase;letter-spacing:.04em;background:var(--nb-grey-bg);' +
        'border-bottom:2px solid var(--nb-border);';
}

function _pC_tdSmallSt() {
    return 'padding:5px 10px;border-bottom:1px solid var(--nb-border);font-size:12px;';
}

// ════════════════════════════════════════════════════════════════════════════
//  STUB — paneles de fases futuras
// ════════════════════════════════════════════════════════════════════════════

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

/**
 * Renderiza la fila de excepción "Días de trabajo" con toggle + botones L-M-X-J-V-S-D.
 * [] = sin override (trabaja todos los días definidos en su turno)
 */
function _rRegla_filaParamDiasTrabajo(regla) {
    var param = regla.parametros.diasTrabajo;

    var wrap = document.createElement('div');
    wrap.style.marginTop = '10px';

    var tit = document.createElement('div');
    tit.textContent = 'Excepciones · Días de trabajo';
    tit.style.cssText = 'font-size:10px;font-weight:700;color:var(--nb-text-light);' +
        'text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;';
    wrap.appendChild(tit);

    var fila = document.createElement('div');
    fila.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

    // Checkbox activar
    var chk = document.createElement('input');
    chk.type    = 'checkbox';
    chk.checked = !!param.activa;
    chk.style.cssText = 'width:14px;height:14px;cursor:pointer;accent-color:var(--nb-primary);flex-shrink:0;';

    var lbl = document.createElement('span');
    lbl.textContent = 'Días trabajados (excepción)';
    lbl.style.cssText = 'font-size:12px;color:' + (param.activa ? 'var(--nb-text)' : 'var(--nb-text-light)') + ';';

    // Contenedor de los botones de días
    var wrapDias = document.createElement('div');
    wrapDias.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-left:4px;' +
        (param.activa ? '' : 'opacity:0.3;pointer-events:none;');

    var DIAS = [
        { val: 1, label: 'L' }, { val: 2, label: 'M' }, { val: 3, label: 'X' },
        { val: 4, label: 'J' }, { val: 5, label: 'V' }, { val: 6, label: 'S' },
        { val: 0, label: 'D' }
    ];
    DIAS.forEach(function(d) {
        var activo = param.valor.indexOf(d.val) > -1;
        var btn = document.createElement('button');
        btn.textContent   = d.label;
        btn.dataset.dia   = d.val;
        btn.title         = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.val];
        btn.style.cssText = 'width:26px;height:26px;border-radius:50%;font-size:11px;font-weight:700;' +
            'cursor:pointer;transition:all 0.15s;border:1px solid ' +
            (activo ? 'var(--nb-primary)' : 'var(--nb-border)') + ';' +
            'background:' + (activo ? 'var(--nb-primary)' : '#fff') + ';' +
            'color:'       + (activo ? '#fff'              : 'var(--nb-text-light)') + ';';
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = param.valor.indexOf(d.val);
            if (idx > -1) {
                param.valor.splice(idx, 1);
                btn.style.background  = '#fff';
                btn.style.borderColor = 'var(--nb-border)';
                btn.style.color       = 'var(--nb-text-light)';
            } else {
                param.valor.push(d.val);
                btn.style.background  = 'var(--nb-primary)';
                btn.style.borderColor = 'var(--nb-primary)';
                btn.style.color       = '#fff';
            }
            programarGuardado();
        });
        wrapDias.appendChild(btn);
    });

    // Accesos rápidos
    var estiloQ = 'padding:2px 7px;font-size:10px;border:1px solid var(--nb-border);' +
        'border-radius:4px;background:#fff;cursor:pointer;margin-left:4px;color:var(--nb-text-light);';
    [['L–V',[1,2,3,4,5]],['FDS',[6,0]],['Todos',[]]].forEach(function(par) {
        var b = document.createElement('button');
        b.textContent = par[0];
        b.title       = par[0] === 'Todos' ? 'Sin restricción de días' : 'Seleccionar ' + par[0];
        b.style.cssText = estiloQ;
        b.addEventListener('click', function(e) {
            e.stopPropagation();
            param.valor = par[1].slice();
            _rRegla_refrescarDias(wrapDias, param.valor);
            programarGuardado();
        });
        wrapDias.appendChild(b);
    });

    // Toggle activa
    chk.addEventListener('change', function() {
        param.activa          = chk.checked;
        lbl.style.color       = param.activa ? 'var(--nb-text)' : 'var(--nb-text-light)';
        wrapDias.style.opacity       = param.activa ? '' : '0.3';
        wrapDias.style.pointerEvents = param.activa ? '' : 'none';
        programarGuardado();
    });

    fila.appendChild(chk);
    fila.appendChild(lbl);
    fila.appendChild(wrapDias);
    fila.appendChild(_rRegla_btnInfoParam(
        'Días de la semana en que trabaja el grupo (excepción al calendario estándar).\n' +
        'Ej: Sede Valladolid no trabaja viernes → selecciona L M X J → el dimensionamiento excluirá ese día para el grupo.\n' +
        'Vacío = sin restricción (trabaja los días definidos por su turno).'
    ));
    wrap.appendChild(fila);
    return wrap;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL INFO de excepción: abierto al pulsar ℹ️ en cada tarjeta
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MODAL INFO de excepción: abierto al pulsar ℹ️ en cada tarjeta
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea un botón ℹ pequeño que muestra un mini-popover con el texto dado.
 * El popover se cierra al hacer clic fuera, en el propio botón, o con Escape.
 */
function _rRegla_btnInfoParam(texto) {
    var btn = document.createElement('button');
    btn.textContent = 'ℹ';
    btn.title = 'Ver descripción';
    btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;' +
        'color:var(--nb-text-light);padding:0 2px;flex-shrink:0;opacity:0.55;line-height:1;';

    var popover = null;

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (popover) {
            document.body.removeChild(popover);
            popover = null;
            return;
        }
        popover = document.createElement('div');
        popover.style.cssText = 'position:fixed;z-index:9999;max-width:280px;' +
            'background:#1e2535;color:#e8ecf4;font-size:11.5px;line-height:1.6;' +
            'padding:9px 12px;border-radius:6px;' +
            'box-shadow:0 4px 18px rgba(0,0,0,0.4);' +
            'white-space:pre-wrap;word-break:break-word;' +
            'border-left:3px solid var(--nb-primary,#e8781a);';
        popover.textContent = texto;

        var r = btn.getBoundingClientRect();
        var left = r.right + 10;
        if (left + 290 > window.innerWidth) left = Math.max(6, r.left - 294);
        var top = r.top - 4;
        if (top + 120 > window.innerHeight) top = Math.max(6, window.innerHeight - 126);
        popover.style.left = left + 'px';
        popover.style.top  = top  + 'px';
        document.body.appendChild(popover);

        function cerrar() {
            if (!popover) return;
            document.body.removeChild(popover);
            popover = null;
            document.removeEventListener('click', cerrar);
            document.removeEventListener('keydown', esc);
        }
        function esc(ev) { if (ev.key === 'Escape') cerrar(); }
        setTimeout(function() {
            document.addEventListener('click', cerrar);
            document.addEventListener('keydown', esc);
        }, 0);
    });

    btn.addEventListener('mouseenter', function() { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', function() { btn.style.opacity = '0.55'; });
    return btn;
}

/** Construye el texto del modal a partir del objeto regla */
function _rRegla_generarTooltip(regla) {
    var lineas = [];
    var P = regla.parametros;

    // Estado
    lineas.push((regla.activa ? '✅ Regla activa' : '⏸ Regla inactiva') +
        '  ·  Prioridad ' + regla.prioridad);
    lineas.push('');

    // Filtros
    var filtros = [];
    var _NM = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    if (regla.filtro.servicios.length)  filtros.push('Servicio: ' + regla.filtro.servicios.join(', '));
    if (regla.filtro.tiposTurno.length) filtros.push('Turno: '    + regla.filtro.tiposTurno.join(', '));
    if (regla.filtro.estados.length)    filtros.push('Estado: '   + regla.filtro.estados.join(', '));
    if (regla.filtro.sedes.length)      filtros.push('Sede: '     + regla.filtro.sedes.join(', '));
    if (regla.filtro.agentes.length)    filtros.push(regla.filtro.agentes.length + ' agente(s) individual(es)');
    if (regla.filtro.meses && regla.filtro.meses.length)
        filtros.push('Meses: ' + regla.filtro.meses.map(function(m) { return _NM[m-1]; }).join(', '));
    if (regla.filtro.semanas && regla.filtro.semanas.length)
        filtros.push('Semanas ISO: ' + regla.filtro.semanas.map(function(s) { return 'S'+s; }).join(', '));
    lineas.push(filtros.length
        ? '🎯 Aplica a: ' + filtros.join(' | ')
        : '🌐 Aplica a todo el staff en toda la vigencia');
    lineas.push('');

    // Parámetros de cálculo base
    var efectos = [];
    var _fx = function(cond, txt) { if (cond) efectos.push(txt); };
    _fx(P.shrinkage.activa,
        'Shrinkage ' + P.shrinkage.valor + '% — ajusta el colchón de agentes no productivos');
    _fx(P.reduccionJornada.activa,
        'Reducción jornada ' + P.reduccionJornada.valor + '% — reduce horas efectivas por agente');
    _fx(P.ocupacionMax.activa,
        'Ocupación máx. ' + P.ocupacionMax.valor + '% — limita la carga por agente → +agentes necesarios');
    _fx(P.ahtOverride.activa,
        'AHT override ' + P.ahtOverride.valor + 's — sustituye el AHT del servicio en el cálculo Erlang');
    _fx(P.jornadaSemanal.activa,
        'Jornada semanal ' + P.jornadaSemanal.valor + 'h — cambia capacidad horaria por agente');
    _fx(P.vacaciones.activa,
        'Vacaciones ' + P.vacaciones.valor + ' días — reduce disponibilidad anual');

    // Días de trabajo
    if (P.diasTrabajo.activa && P.diasTrabajo.valor.length) {
        var NDIA = ['D','L','M','X','J','V','S'];
        var etiq = P.diasTrabajo.valor.map(function(d) { return NDIA[d]; }).join('');
        efectos.push('Días trabajados: ' + etiq + ' — restringe la planificación semanal');
    }

    // Rotación
    var R = P.rotacion || {};
    if (R.fdsAlMes           && R.fdsAlMes.activa)           efectos.push('FDS al mes: ' + R.fdsAlMes.valor + ' — condicion de descanso semanal');
    if (R.cambiosTurnoMes    && R.cambiosTurnoMes.activa)    efectos.push('Cambios turno/mes máx. ' + R.cambiosTurnoMes.valor);
    if (R.maxNochesConsec    && R.maxNochesConsec.activa)    efectos.push('Máx. noches consecutivas: ' + R.maxNochesConsec.valor);
    if (R.nochesAlMes        && R.nochesAlMes.activa)        efectos.push('Noches al mes máx. ' + R.nochesAlMes.valor);

    // Carga especial
    var C = P.carga || {};
    if (C.festivosObligAnio  && C.festivosObligAnio.activa)  efectos.push('Festivos obligatorios: ' + C.festivosObligAnio.valor + '/año');
    if (C.guardiasAlMes      && C.guardiasAlMes.activa)      efectos.push('Guardias al mes: '       + C.guardiasAlMes.valor);
    if (C.horasExtraAnio     && C.horasExtraAnio.activa)     efectos.push('Horas extra/año máx. '   + C.horasExtraAnio.valor + 'h');

    // Teletrabajo
    var T = P.teletrabajo || {};
    if (T.diasSemana && T.diasSemana.activa) efectos.push('Teletrabajo: ' + T.diasSemana.valor + ' días/semana');
    if (T.diasMes    && T.diasMes.activa)    efectos.push('Teletrabajo: ' + T.diasMes.valor + ' días/mes');

    if (efectos.length) {
        lineas.push('⚙️ Efecto en dimensionamiento:');
        efectos.forEach(function(e) { lineas.push('   · ' + e); });
    } else {
        lineas.push('⚙️ Sin parámetros de excepción activos todavía');
    }

    // Notas
    if (regla.notas && regla.notas.trim()) {
        lineas.push('');
        lineas.push('📝 ' + regla.notas.trim());
    }

    return lineas.join('\n');
}

/** Abre un modal centrado con el resumen de la regla */
function _rRegla_mostrarInfoModal(regla) {
    // Overlay
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,20,35,0.55);' +
        'z-index:9999;display:flex;align-items:center;justify-content:center;';

    // Caja del modal
    var box = document.createElement('div');
    box.style.cssText = 'background:#1e2535;color:#e8ecf4;border-radius:10px;' +
        'box-shadow:0 10px 40px rgba(0,0,0,0.5);max-width:420px;width:90%;' +
        'max-height:80vh;display:flex;flex-direction:column;overflow:hidden;' +
        'border-left:4px solid var(--nb-primary,#e8781a);';

    // Cabecera del modal
    var mHdr = document.createElement('div');
    mHdr.style.cssText = 'display:flex;align-items:center;gap:8px;padding:12px 16px;' +
        'border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;';
    var mTit = document.createElement('span');
    mTit.textContent = regla.nombre || 'Regla sin nombre';
    mTit.style.cssText = 'flex:1;font-weight:700;font-size:14px;';
    var btnCerrar = document.createElement('button');
    btnCerrar.textContent = '✕';
    btnCerrar.style.cssText = 'background:none;border:none;color:#aab;cursor:pointer;' +
        'font-size:16px;padding:0 2px;line-height:1;';
    mHdr.appendChild(mTit);
    mHdr.appendChild(btnCerrar);

    // Contenido
    var mBody = document.createElement('div');
    mBody.style.cssText = 'padding:14px 16px;overflow-y:auto;font-size:12px;' +
        'line-height:1.7;white-space:pre-wrap;word-break:break-word;';
    mBody.textContent = _rRegla_generarTooltip(regla);

    box.appendChild(mHdr);
    box.appendChild(mBody);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Cerrar
    function cerrar() { document.body.removeChild(overlay); }
    btnCerrar.addEventListener('click', cerrar);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) cerrar(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
    });
}

/** Metadatos param base (Fase 2) */
var _REG_PARAM_BASE_META = [
    { key: 'shrinkage',        label: 'Shrinkage adicional',  unidad: '%',    min: 0, max: 100,  step: 0.1,
      desc: 'Porcentaje de tiempo improductivo adicional (bajas, formación, pausas no planificadas…).\nAumenta el nº de agentes necesarios. Ej: 5 % → necesitas un 5 % más de agentes sobre el Erlang base.' },
    { key: 'reduccionJornada', label: 'Reducción de jornada', unidad: '%',    min: 0, max: 50,   step: 0.1,
      desc: 'Porcentaje de reducción sobre la jornada estándar del convenio (lactancia, reducción legal, parcial…).\nCada agente aporta menos horas → se necesitan más agentes para cubrir la misma carga.' },
    { key: 'ocupacionMax',     label: 'Ocupación máxima',     unidad: '%',    min: 1, max: 100,  step: 1,
      desc: 'Límite de ocupación permitido para el grupo (< 100 % deja margen de recuperación).\nUna ocupación más baja aumenta directamente el nº de agentes que devuelve Erlang C.' },
    { key: 'ahtOverride',      label: 'AHT override',         unidad: 'seg',  min: 1, max: 9999, step: 1,
      desc: 'Reemplaza el AHT del servicio por este valor en segundos al calcular Erlang para el grupo.\nÚtil cuando el grupo tarda sistemáticamente más o menos que la media del servicio.' },
    { key: 'jornadaSemanal',   label: 'Jornada semanal',      unidad: 'h',    min: 1, max: 60,   step: 0.5,
      desc: 'Horas semanales efectivas del grupo, si difieren del convenio general.\nAfecta directamente la capacidad semanal por agente y el cómputo de FTEs.' },
    { key: 'vacaciones',       label: 'Vacaciones',           unidad: 'días', min: 0, max: 60,   step: 1,
      desc: 'Días de vacaciones anuales del grupo.\nReduce los días disponibles al año → se necesitan más agentes en plantilla para mantener la cobertura.' }
];

/** Metadatos Rotación y turnos (Fase 4) */
var _REG_ROTACION_META = [
    { key: 'frecuencia',          label: 'Frecuencia rotación',    tipo: 'select',
      opciones: ['semanal','quincenal','mensual','trimestral','no_rota'],
      labels:   ['Semanal','Quincenal','Mensual','Trimestral','No rota'],
      desc: 'Con qué frecuencia rota el grupo entre turnos.\nMás rotación implica mayor complejidad en cuadrantes pero mejor reparto de carga nocturna/FDS.' },
    { key: 'patronFds',           label: 'Patrón FDS',             tipo: 'select',
      opciones: ['1_cada_2','1_cada_3','1_cada_4','libre','nunca'],
      labels:   ['1 de cada 2','1 de cada 3','1 de cada 4','Libre','Nunca'],
      desc: 'Cuántos fines de semana trabaja el grupo en promedio.\nCondiciona la disponibilidad en FDS y el cómputo mínimo de descanso semanal.' },
    { key: 'fdsAlMes',            label: 'FDS trabajados / mes',   unidad: 'FDS',  min: 0, max: 10,  step: 1,
      desc: 'Número máximo de fines de semana que puede trabajar cada agente al mes.\nLimita cuántos agentes están disponibles en sábado/domingo.' },
    { key: 'cambiosTurnoMes',     label: 'Cambios de turno / mes', unidad: '/mes', min: 0, max: 50,  step: 1,
      desc: 'Máximo de cambios de turno permitidos en un mes.\nRestricciones de convenio que acotan la flexibilidad de planificación.' },
    { key: 'cambiosTurnoAnio',    label: 'Cambios de turno / año', unidad: '/año', min: 0, max: 200, step: 1,
      desc: 'Tope anual de cambios de turno.\nUsado para validar la sostenibilidad de los cuadrantes anuales.' },
    { key: 'descansoCambioTurno', label: 'Descanso entre turnos',  unidad: 'h',    min: 0, max: 72,  step: 1,
      desc: 'Horas mínimas de descanso obligatorio entre el fin de un turno y el inicio del siguiente.\nEvita turnicidad abusiva y bloquea ciertas combinaciones de asignación.' },
    { key: 'maxNochesConsec',     label: 'Máx. noches consecutivas',unidad: 'n.',   min: 1, max: 20,  step: 1,
      desc: 'Número máximo de turnos de noche consecutivos permitidos.\nRequisito de salud laboral que limita la asignación continua de noches.' },
    { key: 'nochesAlMes',         label: 'Noches al mes',          unidad: 'n.',   min: 0, max: 31,  step: 1,
      desc: 'Tope de turnos de noche al mes para el grupo.\nAfecta la cantidad de agentes que deben cursar turno nocturno en cada periodo.' }
];

/** Metadatos Carga especial (Fase 4) */
var _REG_CARGA_META = [
    { key: 'festivosObligAnio',  label: 'Festivos oblig. / año',  unidad: 'días', min: 0,    max: 30,   step: 1,
      desc: 'Festivos anuales que el grupo debe cubrir obligatoriamente.\nReducen los días de baja actividad y aumentan la carga real del grupo.' },
    { key: 'guardiasAlMes',      label: 'Guardias / mes',          unidad: '/mes', min: 0,    max: 20,   step: 1,
      desc: 'Guardias de disponibilidad (presencia o localizable) al mes.\nAumenta la carga sin añadir servicio directo; consume disponibilidad del agente.' },
    { key: 'jornadaPartidaMes',  label: 'Jornada partida / mes',   unidad: '/mes', min: 0,    max: 31,   step: 1,
      desc: 'Días al mes en que el grupo trabaja en jornada partida (mañana + tarde).\nReduce la disponibilidad continua y puede incrementar la fatiga.' },
    { key: 'horasExtraMes',      label: 'Horas extra / mes',       unidad: 'h',    min: 0,    max: 200,  step: 1,
      desc: 'Horas extra permitidas al mes para cubrir picos de demanda.\nAmplía la capacidad del grupo sin incorporar nuevos agentes.' },
    { key: 'horasExtraAnio',     label: 'Horas extra / año',       unidad: 'h',    min: 0,    max: 1000, step: 1,
      desc: 'Tope anual de horas extra disponibles.\nLimita el recurso adicional; superado este tope no se pueden asignar más horas extra.' },
    { key: 'bolsaHoras',         label: 'Bolsa de horas',          unidad: 'h',    min: -500, max: 500,  step: 1,
      desc: 'Horas acumuladas (+) a favor del grupo o a compensar (−).\nModifica la capacidad efectiva disponible en el periodo de cálculo.' }
];

/** Metadatos Teletrabajo (Fase 4) */
var _REG_TELETRABAJO_META = [
    { key: 'diasSemana', label: 'Días teletrabajo / semana', unidad: 'días', min: 0, max: 7,  step: 1,
      desc: 'Días de teletrabajo por semana del grupo.\nNo afecta al cálculo Erlang, pero es relevante para la planificación de puestos físicos en sede.' },
    { key: 'diasMes',    label: 'Días teletrabajo / mes',    unidad: 'días', min: 0, max: 31, step: 1,
      desc: 'Días de teletrabajo por mes del grupo (alternativo al cómputo semanal).\nPermite fijar una bolsa mensual flexible en lugar de un patrón semanal fijo.' }
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
        if (meta.desc) fila.appendChild(_rRegla_btnInfoParam(meta.desc));
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

    // Botón info
    var btnInfo = document.createElement('button');
    btnInfo.textContent = 'ℹ️';
    btnInfo.title = 'Ver resumen de la regla y efecto en dimensionamiento';
    btnInfo.style.cssText = 'background:none;border:none;cursor:pointer;font-size:13px;padding:2px;flex-shrink:0;opacity:0.7;';
    btnInfo.addEventListener('click', function(e) {
        e.stopPropagation();
        _rRegla_mostrarInfoModal(regla);
    });
    btnInfo.addEventListener('mouseenter', function() { btnInfo.style.opacity = '1'; });
    btnInfo.addEventListener('mouseleave', function() { btnInfo.style.opacity = '0.7'; });

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
    hdr.appendChild(btnInfo);
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
    body.appendChild(_rRegla_filaParamDiasTrabajo(regla));
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
    if (meta.desc) fila.appendChild(_rRegla_btnInfoParam(meta.desc));
    return fila;
}

// ── A2: helpers filtros (Fase 3) ─────────────────────────────────────────────

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

    // ── Filtro por mes ─────────────────────────────────────────────────
    var NOMBRES_MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun',
                                'Jul','Ago','Sep','Oct','Nov','Dic'];
    var _filaMeses = document.createElement('div');
    _filaMeses.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;';
    var _lblMeses = document.createElement('span');
    _lblMeses.textContent = 'Mes';
    _lblMeses.style.cssText = 'font-size:11px;color:var(--nb-text-light);width:90px;flex-shrink:0;padding-top:4px;';
    var _wrapMeses = document.createElement('div');
    _wrapMeses.style.cssText = 'flex:1;display:flex;flex-wrap:wrap;gap:4px;';
    NOMBRES_MESES_CORTOS.forEach(function(nombre, i) {
        var num = i + 1;
        var btn = document.createElement('button');
        btn.textContent = nombre;
        btn.title = 'Mes ' + num;
        var activo = regla.filtro.meses.indexOf(num) > -1;
        btn.style.cssText = 'padding:2px 7px;font-size:10px;border-radius:12px;cursor:pointer;' +
            'border:1px solid ' + (activo ? 'var(--nb-primary)' : 'var(--nb-border)') + ';' +
            'background:' + (activo ? 'var(--nb-primary)' : '#fff') + ';' +
            'color:' + (activo ? '#fff' : 'var(--nb-text-light)') + ';font-weight:600;';
        btn.addEventListener('click', function() {
            var idx = regla.filtro.meses.indexOf(num);
            if (idx > -1) regla.filtro.meses.splice(idx, 1);
            else regla.filtro.meses.push(num);
            var a2 = regla.filtro.meses.indexOf(num) > -1;
            btn.style.background  = a2 ? 'var(--nb-primary)' : '#fff';
            btn.style.borderColor = a2 ? 'var(--nb-primary)' : 'var(--nb-border)';
            btn.style.color       = a2 ? '#fff'              : 'var(--nb-text-light)';
            programarGuardado();
        });
        _wrapMeses.appendChild(btn);
    });
    _filaMeses.appendChild(_lblMeses);
    _filaMeses.appendChild(_wrapMeses);
    sec.appendChild(_filaMeses);

    // ── Filtro por semana ISO ──────────────────────────────────────────
    var _filaSems = document.createElement('div');
    _filaSems.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;';
    var _lblSems = document.createElement('span');
    _lblSems.textContent = 'Semana ISO';
    _lblSems.style.cssText = 'font-size:11px;color:var(--nb-text-light);width:90px;flex-shrink:0;padding-top:4px;';
    var _wrapSems = document.createElement('div');
    _wrapSems.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;';

    // Subrow de controles rápidos
    var _semControls = document.createElement('div');
    _semControls.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';

    // Input numérico + botón Añadir
    var _inpSem = document.createElement('input');
    _inpSem.type = 'number'; _inpSem.min = '1'; _inpSem.max = '53';
    _inpSem.placeholder = 'Sem. 1-53';
    _inpSem.style.cssText = 'width:80px;padding:3px 6px;font-size:11px;border:1px solid var(--nb-border);border-radius:4px;';
    _semControls.appendChild(_inpSem);

    var _btnAddSem = document.createElement('button');
    _btnAddSem.textContent = '+ Añadir';
    _btnAddSem.style.cssText = 'padding:3px 8px;font-size:11px;border-radius:4px;cursor:pointer;' +
        'border:1px solid var(--nb-primary);background:var(--nb-primary);color:#fff;font-weight:600;';

    var _semChips; // referencia al contenedor de chips (definido más abajo)

    _btnAddSem.addEventListener('click', function() {
        var v = parseInt(_inpSem.value, 10);
        if (isNaN(v) || v < 1 || v > 53) return;
        if (regla.filtro.semanas.indexOf(v) === -1) {
            regla.filtro.semanas.push(v);
            regla.filtro.semanas.sort(function(a, b) { return a - b; });
            _refrescarSemChips();
            programarGuardado();
        }
        _inpSem.value = '';
    });
    _semControls.appendChild(_btnAddSem);

    // Botón "Todo el año" (semanas 1–52)
    var _btnTodoAnio = document.createElement('button');
    _btnTodoAnio.textContent = 'Limpiar';
    _btnTodoAnio.title = 'Quitar todas las semanas seleccionadas';
    _btnTodoAnio.style.cssText = 'padding:3px 8px;font-size:11px;border-radius:4px;cursor:pointer;' +
        'border:1px solid var(--nb-border);background:#fff;color:var(--nb-text-light);';
    _btnTodoAnio.addEventListener('click', function() {
        regla.filtro.semanas.length = 0;
        _refrescarSemChips();
        programarGuardado();
    });
    _semControls.appendChild(_btnTodoAnio);

    _wrapSems.appendChild(_semControls);

    // Chips de semanas seleccionadas
    _semChips = document.createElement('div');
    _semChips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;min-height:18px;';

    function _refrescarSemChips() {
        _semChips.innerHTML = '';
        if (regla.filtro.semanas.length === 0) {
            var vacio = document.createElement('span');
            vacio.textContent = '— toda la vigencia (sin filtro de semana)';
            vacio.style.cssText = 'font-size:10px;color:var(--nb-text-light);font-style:italic;line-height:22px;';
            _semChips.appendChild(vacio);
            return;
        }
        regla.filtro.semanas.forEach(function(sem) {
            var chip = document.createElement('span');
            chip.style.cssText = 'display:inline-flex;align-items:center;gap:3px;padding:2px 7px;' +
                'border-radius:12px;background:var(--nb-primary);color:#fff;font-size:10px;font-weight:600;cursor:default;';
            chip.innerHTML = 'S' + sem +
                '<button style="background:none;border:none;color:#fff;cursor:pointer;' +
                'font-size:11px;line-height:1;padding:0 0 0 2px;" title="Quitar semana ' + sem + '">×</button>';
            chip.querySelector('button').addEventListener('click', function() {
                var i = regla.filtro.semanas.indexOf(sem);
                if (i > -1) regla.filtro.semanas.splice(i, 1);
                _refrescarSemChips();
                programarGuardado();
            });
            _semChips.appendChild(chip);
        });
    }
    _refrescarSemChips();

    _wrapSems.appendChild(_semChips);
    _filaSems.appendChild(_lblSems);
    _filaSems.appendChild(_wrapSems);
    sec.appendChild(_filaSems);

    // ── Descripción de resumen ─────────────────────────────────────────
    var descripcion = document.createElement('div');
    var tieneFilOS = regla.filtro.servicios.length   ||
                     regla.filtro.tiposTurno.length  ||
                     regla.filtro.estados.length     ||
                     regla.filtro.sedes.length       ||
                     regla.filtro.agentes.length     ||
                     regla.filtro.meses.length        ||
                     regla.filtro.semanas.length;
    descripcion.textContent = tieneFilOS
        ? '⚡ La regla aplica solo cuando se cumplan los filtros anteriores.'
        : '🌐 Sin filtros — la regla aplica a todo el staff en toda la vigencia.';
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
