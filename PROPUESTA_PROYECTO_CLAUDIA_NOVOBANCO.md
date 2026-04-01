# Claudia novobanco — Propuesta de Proyecto
## Herramienta Universal de Dimensionamiento WFM con Erlang C
## Previsión de Llamadas + AHT → Agentes Necesarios

**Fecha:** 1 de abril de 2026  
**Versión:** 1.7  
**Autor:** PAX Servinform  

---

## 1. Resumen Ejecutivo

Claudia novobanco será una herramienta de **dimensionamiento WFM basada en previsión de llamadas y AHT**, construida tomando lo mejor de **Claudia Orange** (motor Erlang C, análisis NDA/NDS, matriz de encaje staff vs FTE) y **Claudia Pepephone / svf_wfm** (arquitectura modular, estado centralizado, paneles de turnos, what-if, optimizador FDS, cuadrante anual, parámetros de convenio editables).

**Flujo principal:**
1. Se carga o introduce una **previsión de llamadas** (volumen por franja/día/servicio) y sus **AHT** (tiempo medio de operación) — mediante Excel o edición directa en UI.
2. El **motor Erlang C** calcula cuántos agentes se necesitan por franja para cumplir el SLA objetivo.
3. Se cruza contra el **staff disponible** para identificar gaps, NDA y NDS.
4. Se visualizan los resultados directamente en pantalla y se simulan escenarios (what-if) en el mismo contexto.
5. Se genera el cuadrante de planificación y se exporta todo en un único Excel.

> **Nota clave:** Esta herramienta dimensiona por **llamadas + AHT (Erlang C)**, no por horas requeridas. La entrada fundamental es el volumen de llamadas previsto y su duración media.

> **Principio de diseño central:** Todo campo editable ofrece la opción **"No aplica"** para desactivarlo sin necesidad de eliminar el parámetro, garantizando que la herramienta sea adaptable a cualquier servicio o convenio sin valores forzados.

El objetivo es crear una plataforma **sin parámetros hardcodeados**, adaptable a cualquier servicio de atención telefónica que funcione por previsión de llamadas y AHT con Erlang C, multi-servicio con parámetros individuales por servicio, y con convenio parametrizable con campos libres. Las configuraciones se guardan en local storage y se pueden gestionar múltiples perfiles.

---

### Diferencia conceptual: Claudia Orange/novobanco vs Claudia Pepephone

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLAUDIA ORANGE / NOVOBANCO  (Erlang C)                                    │
│                                                                             │
│  📞 Llamadas previstas ──┐                                                  │
│                          ├──▶  ERLANG C  ──▶  Agentes necesarios/franja    │
│  ⏱️  AHT (seg) ──────────┘       │                                         │
│  🎯  SLA objetivo ───────────────┘                                         │
│                                                                             │
│  Entrada:  VOLUMEN DE LLAMADAS + DURACIÓN MEDIA                             │
│  Salida:   AGENTES necesarios para cumplir SLA                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  CLAUDIA PEPEPHONE (svf_wfm) — Horas  [NO se usa este enfoque]             │
│                                                                             │
│  🕐 Horas requeridas ──▶  ÷ horas/agente  ──▶  FTE necesarios              │
│                                                                             │
│  Entrada:  HORAS DE TRABAJO NECESARIAS                                      │
│  Salida:   FTE para cubrir esas horas                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

> Claudia novobanco usa el enfoque de **llamadas + AHT** (Erlang C), tomando de Pepephone únicamente la arquitectura, el convenio editable, la lógica de cuadrante y las exportaciones.

---

## 2. Análisis Comparativo de las Herramientas Actuales

### 2.1. Claudia Orange — Fortalezas

| Característica | Detalle |
|---|---|
| **Motor Erlang C completo** | `erlangC()` con logaritmos para evitar overflow. Calcula probabilidad de espera, SLA real y agentes necesarios por franja de 30 min. |
| **Dimensionamiento por llamadas + AHT** | Usa llamadas reales por franja × TMO ponderado (AHT por servicio YG/MM). Soporta TMO diferenciado por día y franja. |
| **Matriz de Encaje Staff vs FTE** | Cruza staff real disponible día/franja contra FTE necesarios Erlang C. Muestra gaps, sobrecobertura y déficit. |
| **% NDA determinista** | Cálculo real de Nivel de Atención basado en staff disponible por arquetipo dinámico (hasta 10 arquetipos). |
| **% NDS** | Nivel de Servicio calculado con Erlang C inverso a partir del staff real. |
| **Análisis staff, turnos, arquetipos** | Clasifica automáticamente agentes en arquetipos (6h/NF/Mañana, 7-8h/7D/Tarde, etc.) con factores de libranza dinámicos. |
| **Gestión de disponibilidad** | IT, VAC (4 periodos), DLF (4 días), festivos personales, estados de ausencia (MAT, PAT, LACT, P.DTO, PR, EXC). |
| **Turnos rotativos avanzados** | ROTATIVO_2, ROTATIVO_3, ROTATIVO_4, FIJO, PARTIDO, IRR_25, IRR_28 con cálculo por ciclo semanal. |
| **Factor de abandono** | Reduce la demanda por tasa de abandono objetivo antes del cálculo Erlang C. |
| **Validación post-cálculo** | Sistema de aserciones con errores/warnings, resumen visual en UI. |

### 2.2. Claudia Orange — Debilidades

| Debilidad | Impacto |
|---|---|
| Archivo monolítico (1 HTML gigante) | +6500 líneas en un solo fichero. Difícil de mantener, depurar y escalar. |
| Parámetros de convenio hardcodeados | Constante `CONVENIO` con valores fijos del convenio de Orange. No reutilizable para otros servicios. |
| Servicios fijos (ATC, WS, COM) | Mapeos hardcoded. No adaptable a otros clientes ni a configuración multi-servicio real. |
| Sin panel de convenio editable | Los valores del convenio están enterrados en el código JavaScript. |
| Sin what-if de agentes virtuales | No permite simular escenarios añadiendo/quitando agentes. |
| Sin cuadrante completo exportable | Solo exporta la matriz de encaje, no genera cuadrante mensual con turnos asignados. |
| Sin persistencia de parámetros | Cada recarga pierde la configuración. |
| Sin optimizador de FDS | No tiene lógica para distribuir fines de semana equitativamente. |
| Falta gráficas por día, semana y mes | Los datos se muestran en tabla, sin visualización gráfica combinada. |
| Sin opción "No aplica" en campos | No es posible desactivar un parámetro sin modificar el código. |

### 2.3. Claudia Pepephone (svf_wfm) — Fortalezas

| Característica | Detalle |
|---|---|
| **Arquitectura modular** | 8 archivos JS separados: `state.js`, `config.js`, `utils.js`, `parser.js`, `engine.js`, `export.js`, `scheduler.js`, `ui.js` + CSS independiente. |
| **Estado centralizado (`State`)** | Objeto único `State` como fuente única de verdad. Inspectable en DevTools. |
| **Panel de convenio editable en UI** | Todos los parámetros del convenio editables desde el panel. Persistencia automática. |
| **Persistencia localStorage + IndexedDB** | Auto-guarda parámetros y el último archivo cargado. Reset con un botón. |
| **Panel What-If de agentes virtuales** | Permite añadir/eliminar agentes virtuales que se inyectan antes de calcular. |
| **Shrinkage mensual diferenciado** | Operativo + absentismo editables por mes con factor neto automático. |
| **Optimizador Adaptativo FDS** | Distribuye sábados y domingos respetando el convenio configurado. |
| **Cuadrante Anual** | Genera cuadrante 365 días × N agentes con turnos M/T/C, libranzas, VAC, IT, DLF, FEST. |
| **Exportación Excel multi-hoja** | ExcelJS con hoja Resumen + 12 hojas mensuales con colores, freeze panes. |
| **Herencia de mes anterior** | Parsea hojas "Horarios XXX" del Excel para heredar consecutivos y cierre. |
| **Overlay de progreso** | Barra de progreso visual durante generación del cuadrante. |
| **Datos de prueba (Demo)** | Botón para cargar datos sintéticos sin necesidad de Excel real. |

### 2.4. Claudia Pepephone — Debilidades

| Debilidad | Impacto |
|---|---|
| No usa Erlang C | Motor de capacidad basado en horas, no en llamadas + AHT + SLA. Enfoque incorrecto para novobanco. |
| Servicios fijos (ATC, WS, COM) | Mapeos hardcoded. No adaptable a otros clientes. |
| Sin % NDA / % NDS | No calcula indicadores de nivel de atención ni de servicio. |
| Sin gráficas combinadas | Solo tablas y barras estáticas, sin gráfico combinado de llamadas + indicadores. |
| Sin previsión de llamadas editable | No permite cargar/editar previsión de llamadas + AHT por franja/día desde UI. |
| Sin opción "No aplica" en campos | No se pueden desactivar parámetros sin modificar el código. |
| Sin multi-configuraciones guardadas | Solo guarda la última configuración, sin gestión de perfiles. |

---

## 3. Diseño de Claudia novobanco

### 3.1. Principios de Diseño

1. **Cero hardcoding** — Todo parametrizable desde la UI: servicios, franjas, convenio, SLA, turnos.
2. **"No aplica" universal** — **Todo campo editable tiene la opción "No aplica"** para desactivarlo sin eliminar el parámetro. Garantiza adaptabilidad a cualquier convenio o servicio.
3. **Erlang C como motor central** — Entrada: previsión de llamadas + AHT. Salida: agentes necesarios por franja para cumplir SLA. NO horas requeridas.
4. **Configuración dual (Excel + UI)** — Todo lo que se puede cargar desde Excel se puede también configurar y ajustar manualmente desde la interfaz.
5. **Multi-servicio con parámetros individuales** — Cada servicio tiene su propia configuración (SLA, AHT, abandono, shrinkage). Configuraciones guardables como perfiles nombrados.
6. **Visualización en UI sin descarga obligatoria** — Todos los datos de análisis son visibles en pantalla. El Excel se descarga como un único fichero completo bajo demanda.
7. **Gráficas combinadas** — Gráfico de barras (llamadas atendidas, abandonadas, fuera de NDS) + líneas (% NDA, % NDS) en el mismo panel donde está el what-if.
8. **Consistencia visual novobanco** — Paleta de colores, tipografía y componentes alineados con la identidad corporativa de novobanco.

### 3.2. Identidad Visual — novobanco

| Elemento | Valor |
|---|---|
| **Color primario** | `#E30613` — Rojo novobanco |
| **Color oscuro** | `#1C1C1C` — Texto principal |
| **Fondo** | `#F5F6F7` — Gris claro |
| **Superficie panel** | `#FFFFFF` — Blanco |
| **Borde** | `#E4E7EB` |
| **Acento éxito** | `#00873D` — Verde |
| **Acento alerta** | `#F5A623` — Naranja |
| **Acento error** | `#D0021B` — Rojo oscuro |
| **Tipografía** | `'Nunito Sans', 'Segoe UI', sans-serif` |
| **Radius** | `8px` paneles, `4px` inputs |
| **Logo/header** | Fondo `#1C1C1C` (oscuro) con logo novobanco rojo. Navbar lateral o top con rojo primario. |

Variables CSS en `styles.css`:
```css
:root {
  --nb-red:        #E30613;
  --nb-red-dark:   #B0000F;
  --nb-dark:       #1C1C1C;
  --nb-grey-bg:    #F5F6F7;
  --nb-white:      #FFFFFF;
  --nb-border:     #E4E7EB;
  --nb-green:      #00873D;
  --nb-orange:     #F5A623;
  --nb-text:       #333333;
  --nb-text-light: #6B7280;
  --radius-panel:  8px;
  --radius-input:  4px;
  --shadow-panel:  0 2px 8px rgba(0,0,0,0.08);
}
```

### 3.3. Arquitectura de Archivos

```
Claudia novobanco/
├── index.html                  # Shell HTML + layout de paneles
├── css/
│   └── styles.css              # Variables CSS novobanco + componentes
├── js/
│   ├── state.js                # Estado centralizado (State) + persistencia localStorage/IndexedDB
│   ├── config.js               # Configuración de convenio + perfiles + parámetros editables
│   ├── utils.js                # Utilidades: parseo fechas, tiempos, formateo, helpers
│   ├── erlang.js               # Motor Erlang C: erlangC(), calcularAgentesNecesarios()
│   ├── parser.js               # Parseo de Excel (STAFF + Previsión + Último Turno)
│   ├── engine.js               # Motor: NDA, NDS, gaps, cobertura, capacidad
│   ├── forecast.js             # Panel Previsión: editor de tabla interactivo
│   ├── whatif.js               # Simulador What-If: agentes virtuales + escenarios
│   ├── scheduler.js            # Planificador: turnos + optimizador FDS + cuadrante
│   ├── charts.js               # Gráfico combinado barras+líneas (llamadas + NDA/NDS)
│   ├── profiles.js             # Gestión de perfiles de configuración (guardar/cargar/borrar)
│   ├── export.js               # Exportación a un único Excel multi-hoja (ExcelJS)
│   └── ui.js                   # Renderizado de paneles, tabs, acordeones, progreso
└── libs/                       # Librerías locales (funcionamiento offline)
    ├── xlsx.full.min.js
    ├── exceljs.min.js
    ├── FileSaver.min.js
    └── chart.min.js
```

### 3.4. Layout y Flujo de Paneles

Los paneles siguen el flujo de trabajo natural: configurar → cargar datos → dimensionar → analizar → planificar → exportar. **Los resultados se muestran siempre en UI, sin obligar a descargar para ver los datos.**

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER novobanco  │  Claudia novobanco WFM  │  PAX Servinform   │
├──────┬───────────────────────────────────────────────────────────┤
│      │  Panel A: Configuración del Servicio + Convenio           │
│  NAV │  ─ ─ Sub-panel A1: Parámetros del Servicio (multi-svc)   │
│      │  ─ ─ Sub-panel A2: Convenio / Normativa Laboral          │
│  LAT │  ─ ─ Sub-panel A3: Perfiles guardados                    │
│  ER  ├────────────────────────────────────────────────────────── │
│  AL  │  Panel B: Carga de Datos (Excel + edición UI)             │
│      │  ─ ─ Subir Excel (STAFF + Previsión + Último Turno)      │
│      │  ─ ─ Editor de Previsión de Llamadas (tabla interactiva) │
│      │  ─ ─ Análisis de Plantilla (Staff)                       │
│      ├────────────────────────────────────────────────────────── │
│      │  Panel C: Dimensionamiento Erlang C                       │
│      │  ─ ─ Parámetros globales y por servicio                  │
│      │  ─ ─ Shrinkage mensual                                   │
│      │  ─ ─ Tabla de resultados (Llamadas + AHT + FTE) en UI    │
│      ├────────────────────────────────────────────────────────── │
│      │  Panel D: Análisis NDA / NDS + What-If  ← JUNTOS         │
│      │  ─ ─ [GRÁFICO COMBINADO: barras+líneas] ← en este panel │
│      │  ─ ─ Tabla NDA/NDS por franja y día   (visible en UI)   │
│      │  ─ ─ What-If: agentes virtuales + escenarios             │
│      │  ─ ─ Filtros: por servicio / semana / mes / día          │
│      ├────────────────────────────────────────────────────────── │
│      │  Panel E: Planificación (FDS + Cuadrante)                 │
│      │  ─ ─ Optimizador FDS                                     │
│      │  ─ ─ Cuadrante visual (tabla interactiva en UI)          │
│      ├────────────────────────────────────────────────────────── │
│      │  Panel F: Exportación                                     │
│      │  ─ ─ Vista previa de todas las hojas (sin descargar)     │
│      │  ─ ─ Botón: 📥 Descargar todo el Excel completo          │
└──────┴────────────────────────────────────────────────────────── ┘
```

### 3.5. Paneles Detallados

#### Panel A — Configuración del Servicio + Convenio

**A1. Parámetros por Servicio** (multi-servicio, parámetros individuales)

Cada servicio tiene su propia configuración independiente. Se puede añadir/eliminar servicios dinámicamente:

| Campo | Tipo | "No aplica" | Descripción |
|---|---|---|---|
| Nombre del servicio | Texto | — | Identificador libre (ej: "Atención al Cliente", "Soporte Técnico") |
| Color en gráficas | Color picker | — | Asignado automáticamente, personalizable |
| SLA objetivo (%) | Número | ✅ | Si no aplica, dimensiona sin objetivo de SLA |
| Tiempo SLA (seg) | Número | ✅ | Si no aplica, no se aplica umbral de tiempo |
| AHT global (seg) | Número | ✅ | Si no aplica, usa AHT de la previsión por franja |
| Tasa de abandono (%) | Número | ✅ | Si no aplica, no se reduce demanda por abandono |
| Shrinkage operativo (%) | Número | ✅ | Si no aplica, no se descuenta tiempo no productivo |
| Absentismo (%) | Número | ✅ | Si no aplica, no se descuenta absentismo |
| Disponibilidad horaria | Franjas | ✅ | Si no aplica, el servicio no tiene restricción horaria |
| Modalidad (inbound/outbound/blended) | Select | ✅ | Tipo de operación |

**A2. Convenio / Normativa Laboral** (campos españoles + campos libres)

Todos los campos tienen **"No aplica"** para adaptar la herramienta a cualquier convenio:

| Campo | Valor por defecto | "No aplica" | Artículo |
|---|---|---|---|
| Jornada anual (h) | 1764 | ✅ | Art. 22 |
| Jornada semanal (h) | 39 | ✅ | Art. 22 |
| Máx horas/semana irregular | 48 | ✅ | Art. 23 |
| Máx consecutivos 7D | 8 | ✅ | Art. 23 |
| Máx consecutivos NF | 5 | ✅ | Art. 23 |
| Descansos mín / 14 días | 3 | ✅ | Art. 23 |
| FDS libres mín / mes | 2 | ✅ | Art. 25 |
| Pausa 4-6h (min) | 10 | ✅ | Art. 24 |
| Pausa 6-8h (min) | 20 | ✅ | Art. 24 |
| Vacaciones (días lab.) | 23 | ✅ | Art. 29 |
| Shrinkage PVD (%) | 16.7 | ✅ | Art. 57 |
| Rotación FDS default (%) | 33 | ✅ | — |
| **Reglas de excepción** | — | — | Motor de reglas condicionales por segmento de staff: filtro (servicio, turno, estado, contrato, sede, antigüedad, franja) + parámetros de excepción (shrinkage, jornada, rotación, carga, teletrabajo). Ver §10 |

> **Nota (v1.4):** Los antiguos "campos libres" planos están rediseñados como **Reglas de Excepción por Segmento de Staff** (§10). La migración es automática y no destructiva: los campos libres existentes se convierten en reglas con filtro vacío (ámbito global).

**A3. Gestión de Perfiles**

- **Guardar perfil** con nombre libre (ej: "novobanco Atención", "novobanco Soporte")
- **Cargar perfil** desde lista desplegable
- **Borrar perfil**
- **Exportar perfil** como JSON (para compartir o hacer backup)
- **Importar perfil** desde JSON
- Último perfil usado se restaura automáticamente al recargar
- Almacenamiento: `localStorage` con clave `nb_profiles_v1`

---

#### Panel B — Carga de Datos

**B1. Subida de Excel (igual que Claudia Orange)**

El Excel tiene la misma estructura que Claudia Orange:
- Hoja **STAFF** — plantilla de agentes (código, servicio, turno, disponibilidad, estados, VAC/DLF/festivos)
- Hoja **Previsión** — volumen de llamadas previstas por franja/día/servicio + AHT
- Hoja **Último Turno** (opcional) — herencia del mes anterior

Todo lo que se carga desde Excel es **editable desde la UI** después de la carga. No hay datos "bloqueados".

**B2. Editor de Previsión de Llamadas (Panel Previsión — implementado)**

El Panel Previsión es un editor interactivo completo para introducir y visualizar la previsión de llamadas y AHT por servicio, franja horaria y día. Barra de herramientas con controles en este orden:

| Control | Opciones | Descripción |
|---|---|---|
| **📅 Vista** | Semana / Mes | Semana: tabla franjas × 7 días. Mes: tabla días × franjas |
| **Modo** | ⏱ Ver AHT / 📞 Ver llamadas | Toggle para cambiar el valor visualizado en celdas |
| **Horario** | Inicio 00:00–23:00 · Fin 01:00–24:00 | Configura el rango horario activo del servicio |
| **Granularidad** | 15 min / 30 min / 1 h | Tamaño de franja horaria |
| **📊 Gráfico** | Alterna tabla ↔ gráfico | Activa la vista gráfica combinada |
| **📂 Cargar Excel** | Drag & drop o clic | Carga previsión desde fichero XLSX |
| **🧪 Demo** | — | Genera datos sintéticos realistas (reactivo a horario y granularidad) |
| **📥 Ejemplo** | — | Descarga plantilla Excel de ejemplo |
| **🗑 Limpiar** | — | Elimina todos los datos de previsión |

**Vista Tabla:**
- **Vista Semana**: filas = franjas horarias, columnas = 7 días de la semana. Navegación ◀/▶ por semana, botón "Hoy".
- **Vista Mes**: filas = días del mes (con color de fondo verde claro en sábado/domingo), columnas = franjas horarias. Navegación ◀/▶ por mes.
- Cada celda muestra el valor activo (llamadas o AHT). Doble clic → edición inline.
- Totales por fila (suma diaria) y por columna (suma por franja) calculados automáticamente. Columna AHT promedio ponderado en el total.
- Indicador visual "⚠️ datos editados manualmente" cuando hay ediciones post-carga.

**Edición masiva con popover:**
- **Clic en cabecera de franja** (columna) → abre popover "⏱ Franja HH:MM" con dos bloques de checkboxes:
  - Bloque A — Franjas: franja clicada pre-marcada, resto desmarcadas.
  - Bloque B — Días: todos pre-marcados.
  - Botones "Todos" / "Ninguno" en cada bloque.
  - Campo de valor + botón "Aplicar a selección" → escribe el valor en el **producto cartesiano** franjas × días seleccionados.
- **Clic en cabecera de día** (fila en vista mes / columna en vista semana) → misma lógica con día pre-marcado y todas las franjas pre-marcadas.
- Checkboxes ordenados lexicográficamente.

**Navegación por teclado en modo edición:**
- `Tab` → avanza al día siguiente (misma franja)
- `Shift+Tab` → retrocede al día anterior
- `Enter` → avanza a la franja siguiente (mismo día)
- `Escape` → cancela la edición sin guardar

**Vista Gráfica (Chart.js):**
- Activada con el botón "📊 Gráfico". Tres submodos seleccionables con botones pill:
  - **Día**: eje X = franjas del día seleccionado. Navegación ◀/▶/Hoy por día.
  - **Semana**: eje X = franjas de los 7 días, valores agregados.
  - **Mes**: eje X = días del mes seleccionado.
- **Barras** (eje Y izquierdo): llamadas previstas.
- **Línea** (eje Y derecho): AHT promedio ponderado.
- Actualización instantánea al cambiar modo, navegar o modificar datos.

**Persistencia:**
- `State.forecast` (llamadas, AHT, flag editado) se guarda en `localStorage` con debounce 800 ms y se restaura automáticamente al recargar la página.

**B3. Análisis de Plantilla (Staff)**

- Resumen de agentes por servicio (dinámico, sin servicios fijos)
- Distribución por turno, disponibilidad (NF/7D), estado, cobertura horaria
- Tabla de cobertura hora a hora visible en UI
- Alerta de gaps de cobertura (horas sin agentes para franjas con demanda)

---

#### Panel C — Dimensionamiento Erlang C  *(rediseño v1.7)*

El panel de dimensionamiento es el **núcleo de la aplicación**. Se divide en dos vistas relacionadas que comparten los mismos datos calculados.

---

##### C1 — Tabla de Necesidad por Servicio

La vista principal es una **tabla de doble entrada**: días en filas (columna izquierda) y franjas horarias en columnas (cabecera superior). Para cada celda se muestran en apilado:

```
┌────────────┬─────────┬─────────┬─────────┬─────────┐
│  Fecha/Día │  08:00  │  08:30  │  09:00  │  09:30  │ …
├────────────┼─────────┼─────────┼─────────┼─────────┤
│ Lun 01/04  │  47 llam│  52 llam│  61 llam│  58 llam│
│            │ AHT 195s│ AHT 201s│ AHT 198s│ AHT 194s│
│            │  FTE  9 │  FTE 11 │  FTE 13 │  FTE 12 │
├────────────┼─────────┼─────────┼─────────┼─────────┤
│ Mar 02/04  │  44 llam│  50 llam│  63 llam│  55 llam│
│            │ AHT 193s│ AHT 207s│ AHT 196s│ AHT 200s│
│            │  FTE  9 │  FTE 10 │  FTE 13 │  FTE 11 │
└────────────┴─────────┴─────────┴─────────┴─────────┘
```

- El FTE de cada celda es el resultado de Erlang C con abandono ya aplicado
- Selector de servicio: per-servicio o vista aggregada (suma de FTEs)
- Selector de vista temporal: día concreto / semana / rango personalizado
- Coloreado condicional de FTEs: verde=holgura vs media, rojo=pico crítico
- Fila de totales/promedios al final

**Controles superiores al cálculo (parámetros globales del panel):**

| Parámetro | Fuente por defecto | "No aplica" |
|---|---|---|
| SLA objetivo (%) | Heredado del servicio (Panel A1) | ✅ → solo calcula tráfico |
| Tiempo SLA (seg) | Heredado del servicio | ✅ |
| Tasa de abandono (%) | Heredado del servicio | ✅ → no reduce demanda |
| AHT global (seg) | Previsión (por franja) | ✅ → usa AHT de Panel B |
| Shrinkage PVD (%) | Panel A2 (convenio) | ✅ |
| Shrinkage operativo (%) | Global o por mes | ✅ |
| Absentismo (%) | Global o por mes | ✅ |

**Tabla de shrinkage mensual** (inspirada en Pepephone, pero integrada en el State del servicio):
- Una fila por mes del periodo de la previsión
- Columnas: Mes | Shrink. Oper. (%) | Absentismo (%) | **Factor neto** (calculado)
- Factor neto = $(1 - pvd)(1 - oper)(1 - abs)$ — producto, no suma
- "No aplica" por mes → hereda valor global
- Si el factor neto < 65% se marca en rojo, 65–72% naranja, ≥72% verde

> ⚠️ **Decisión de diseño confirmada:** el shrinkage se calcula siempre como **producto encadenado**, no como suma de porcentajes.

**Fórmula de cálculo paso a paso:**

1. `llamadas_efectivas = llamadas_brutas × (1 − tasaAbandono/100)`
2. `λ_hora = llamadas_efectivas × (60 / granularidadMin)`
3. `A (Erlangs) = λ_hora × AHT / 3600`
4. Iterar `N = ⌈A⌉, ⌈A⌉+1, ...` hasta:
   - `SLA(N) = 1 − P_w · e^{−(N−A)·μ·t_{SLA}} ≥ slaObjetivo`
   - **Y** `A/N ≤ ocupacionMax`
5. `factorNeto = (1 − pvd)(1 − oper)(1 − abs)` — mensual diferenciado
6. `agentesPlantilla = ⌈N / factorNeto⌉` — cuántos contratar para tener N en puesto

**Tarjetas KPI** debajo de la tabla:
- FTE pico del periodo · FTE promedio · Total llamadas · Franjas calculadas · Factor neto por mes (rango)

---

##### C2 — Cuadrante de Planificación

La segunda vista del panel muestra el **cuadrante operativo**: quién trabaja qué día y en qué franja.

```
┌──────────────────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┐
│ Gestor           │ Lun   │ Mar   │ Mié   │ Jue   │ Vie   │ Sáb   │ Dom   │
│                  │ 01/04 │ 02/04 │ 03/04 │ 04/04 │ 05/04 │ 06/04 │ 07/04 │
├──────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│ García, Ana      │  M    │  M    │  M    │  M    │  M    │  L    │  L    │
│ López, Carlos    │  T    │  T    │  T    │  T    │  T    │  T    │  L    │
│ Martín, Eva      │  L    │  M    │  M    │  M    │  M    │  L    │  L    │
│ Ruiz, Pedro      │  M    │  M    │  T    │  T    │  T    │  L    │  L    │
└──────────────────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘
  Pies de col:       9 ag   10 ag  11 ag   11 ag   10 ag   3 ag   2 ag
                     ✅     ✅      ✅       ✅      ✅      🟡     🔴
```

Códigos de turno: `M` mañana · `T` tarde · `C` central · `N` noche · `L` libranza · `VAC` vacaciones · `IT` IT · `DLF` día libre festivo · `FEST` festivo trabajado

- Fila de **pie de columna** por día: agentes disponibles vs FTE necesario → semáforo
- Navegación por semana / mes con botones anterior/siguiente
- Filtro por servicio (solo muestra los gestores asignados a ese servicio)
- Cuadro de cobertura: verde si agentes_disponibles ≥ FTE_necesario, naranja si ±20%, rojo si déficit > 20%

**Rotación FDS como regla de excepción** (decisión de diseño v1.7):

> En lugar de un parámetro global "% de agentes que trabajan FDS", la cobertura de fines de semana **se modela mediante reglas de excepción** del motor F1–F6:
>
> - Se crea una regla con filtro `tiposTurno: ['fds']` o `filtro.agentes: [lista]`
> - El parámetro `patronFds` (ej. `1 cada 3`) define la frecuencia de trabajo en FDS
> - El parámetro `fdsAlMes` (ej. `2`) limita los FDS trabajados al mes
> - La lista de reglas determina exactamente qué grupo trabaja cuánto FDS
>
> Esto permite reglas diferenciadas: "los 5 agentes de guardia trabajan 1 de cada 2 FDS; los 10 agentes de turno estándar trabajan 1 de cada 3".

---

##### C3 — Parámetros de rotación FDS en la regla de excepción

Los parámetros que controlan la cobertura FDS ya existen en el modelo de regla (`parametros.rotacion`):

| Parámetro | Tipo | Ejemplo | Efecto en cuadrante |
|---|---|---|---|
| `patronFds` | Select | `1 cada 3` | El gestor trabaja 1 FDS de cada 3 disponibles |
| `fdsAlMes` | Número | `2` | Cap: máximo 2 FDS trabajados al mes |
| `diasTrabajo` | Toggle L–D | `[6, 0]` | Solo trabaja sábado y domingo (FDS puro) |

La combinación de estos tres parámetros en una regla filtrada por grupo define completamente el modelo de cobertura FDS sin necesidad de ningún parámetro global adicional.

---

Este panel combina tres elementos que se retroalimentan: la visualización del análisis, las gráficas y el simulador what-if.

**D1. Gráfico Combinado Barras + Líneas**

Un único gráfico Chart.js combinado muestra:

| Serie | Tipo | Color | Descripción |
|---|---|---|---|
| Llamadas atendidas | Barras apiladas | Verde `#00873D` | Llamadas respondidas dentro del SLA |
| Llamadas atendidas fuera NDS | Barras apiladas | Naranja `#F5A623` | Respondidas pero fuera del tiempo NDS |
| Llamadas abandonadas | Barras apiladas | Rojo `#E30613` | No atendidas |
| % NDA | Línea | Azul oscuro `#1C1C1C` | Nivel de Atención (eje Y derecho, 0-100%) |
| % NDS | Línea | Rojo `#E30613` | Nivel de Servicio dentro del umbral (eje Y derecho) |

Eje X: franjas horarias (o días, o semanas según filtro activo)  
Filtros: por servicio | por día concreto | por día de semana | por semana | por mes

Debajo del gráfico: **tabla de NDA/NDS por franja y por día**, visible en UI, con format condicional de colores (🟢 ≥ objetivo, 🟡 cerca, 🔴 por debajo).

**D2. What-If — Agentes Virtuales** *(en el mismo panel, en acordeón)*

- Añadir agentes virtuales: servicio (dinámico), turno, horas, disponibilidad
- Cada campo tiene opción "No aplica"
- Al añadir/eliminar un agente virtual → recalcula NDA, NDS y gráfico en tiempo real
- Comparativa visual: línea punteada "antes del what-if" vs línea sólida "después"
- Indicador del impacto: "Con este cambio el NDA mejora X puntos"
- Lista de agentes virtuales activos con chip de cada uno (color por servicio)
- Reset what-if con un clic

**D3. Estadísticas de Cobertura**

- Tarjetas: puntos con cobertura, sin cobertura, % cobertura global
- Déficit máximo por día y por franja
- Sobrecobertura máxima
- Estado de validación: 🟢🟡🔴

---

#### Panel E — Planificación

**E1. Optimizador FDS**

- Distribución equitativa de sábados/domingos entre agentes
- Respeta párametros configurados en el convenio (Panel A2), todos con "No aplica"
- Rotación calculada por servicio
- Visualización: tabla de agentes × FDS del periodo, visible en UI

**E2. Cuadrante Anual/Mensual**

- Cuadrante N días × M agentes con codificación: M, T, C, L, VAC, IT, DLF, FEST
- Filtros: por servicio, por mes
- Tabla interactiva visible en UI con colores por código
- Indicadores de cumplimiento de convenio por agente
- Overlay de progreso durante generación

---

#### Panel F — Exportación

**Filosofía: "Todo visible en UI, descarga bajo demanda"**

Todos los resultados están visibles en cada panel sin necesidad de descargar nada. El Panel F es el punto de descarga:

- **Vista previa de cada hoja** dentro del panel (tabs: Dimensionamiento / NDA-NDS / Cuadrante / Staff / Previsión / Config)
- **Un único botón:** `📥 Descargar Excel completo`
  - Genera un único fichero `.xlsx` con todas las hojas
  - Hojas incluidas: Resumen, Configuración, Previsión, Dimensionamiento, NDA-NDS, Cuadrante (1 por mes), Staff
  - Formato profesional: colores novobanco, freeze panes, formato condicional, anchos optimizados
- **Botón secundario:** `📤 Exportar configuración como JSON` (perfil reutilizable)

---

### 3.6. Modelo de Datos (State)

```javascript
const State = {

    // A1. Configuración del servicio (multi-servicio, sin hardcoding)
    config: {
        nombreProyecto: '',
        servicios: [
            // Cada servicio con sus propios parámetros
            {
                id: 'svc_1',
                nombre: '',
                color: '#E30613',
                // Todos los campos tienen un flag "noAplica" además del valor
                sla:           { valor: 80,   noAplica: false },
                tiempoSla:     { valor: 20,   noAplica: false },
                ahtGlobal:     { valor: 270,  noAplica: true  },  // usa AHT de prevision
                tasaAbandono:  { valor: 5,    noAplica: false },
                shrinkageOper: { valor: 5,    noAplica: false },
                absentismo:    { valor: 8,    noAplica: false },
                modalidad:     { valor: 'inbound', noAplica: false }
            }
        ],
        franjas: [],             // ['08:00', '08:30', ...] — configurables
        zonaHoraria: 'Europe/Lisbon'
    },

    // A2. Convenio (todos los campos con flag noAplica)
    convenio: {
        jornadaAnual:      { valor: 1764, noAplica: false },
        jornadaSemanal:    { valor: 39,   noAplica: false },
        maxIrregular:      { valor: 48,   noAplica: false },
        maxConsec7D:       { valor: 8,    noAplica: false },
        maxConsecNF:       { valor: 5,    noAplica: false },
        descanso14d:       { valor: 3,    noAplica: false },
        fdsLibresMin:      { valor: 2,    noAplica: false },
        pausa46:           { valor: 10,   noAplica: false },
        pausa68:           { valor: 20,   noAplica: false },
        vacaciones:        { valor: 23,   noAplica: false },
        pvdShrinkage:      { valor: 16.7, noAplica: false },
        rotacionFDS:       { valor: 33,   noAplica: false },
        camposLibres:      []   // [{ nombre, valor, noAplica }]
    },

    // A3. Perfiles guardados
    perfiles: {
        activo: '',
        lista: {}   // { 'nombre_perfil': { config, convenio, ... } }
    },

    // B2. Previsión de Llamadas + AHT
    forecast: {
        raw: null,
        llamadas: {},   // { fecha: { franja: { servicioId: numLlamadas } } }
        aht: {},        // { fecha: { franja: { servicioId: ahtSegundos } } }
        tmo: {},        // TMO ponderado calculado
        editado: false
    },

    // B3. Staff
    staff: { todos: [], activos: [] },

    // C. Dimensionamiento
    dimensionamiento: {
        shrinkageMensual: {},   // { mes: { operativo: {valor,noAplica}, absentismo: {valor,noAplica} } }
        resultado: null,
        matrizFTE: []
    },

    // D. Análisis NDA/NDS + What-If
    analisis: {
        matrizCobertura: null,
        ndaPorDia: {},
        ndsPorDia: {},
        gapsPorDia: {},
        llamadasAtendidas: {},        // por franja/día
        llamadasAbandonadas: {},      // por franja/día
        llamadasFueraNDS: {}          // atendidas fuera del umbral de tiempo
    },
    whatif: {
        agentesVirtuales: [],
        resultadoConWhatIf: null      // snapshot del análisis con agentes virtuales activos
    },

    // E. Planificación
    fase4: null,
    cuadrante: null,
    horariosPrevios: null
};
```

---

## 4. Funcionalidades Detalladas (Lo Mejor de Cada Una)

### 4.1. De Claudia Orange (herencia directa)

- **Motor Erlang C** con cálculo logarítmico para evitar overflow.
- `calcularAgentesNecesarios()` con SLA real: $SLA = 1 - P_w \cdot e^{-(N-A)/\mu \cdot t}$
- **TMO ponderado** por día y franja (soporte multi-servicio con AHT distintos).
- **Factor de abandono** como reductor de demanda.
- **Clasificación en arquetipos dinámicos** (hasta 10 arquetipos: 6h/NF/Mañana, 7-8h/7D/Tarde, etc.).
- **Factores de libranza por arquetipo** con pesos semanales según volumetría.
- **Verificación de disponibilidad** completa: IT con fecha fin, 4 VAC, 4 DLF, 4 festivos, MAT/PAT/LACT/P.DTO/PR/EXC.
- **Turnos rotativos** (ROTATIVO_2/3/4, FIJO, PARTIDO, IRR_25, IRR_28) con cálculo de ciclo semanal.
- **Sistema de validación post-cálculo** con aserciones y resumen visual 🟢🟡🔴.

### 4.2. De Claudia Pepephone (herencia de arquitectura)

- **Arquitectura modular** con ficheros JS separados por responsabilidad.
- **Estado centralizado** (`State`) como fuente única de verdad.
- **Persistencia localStorage + IndexedDB** (parámetros + último archivo).
- **Shrinkage mensual** diferenciado por mes.
- **Optimizador Adaptativo FDS** con equidad y validación de convenio.
- **Cuadrante Anual** con rotación de cierre por equidad entre servicios.
- **Exportación Excel multi-hoja** con ExcelJS, colores, freeze panes.
- **Herencia de mes anterior** desde hojas "Horarios XXX".
- **Overlay de progreso** con barra visual.
- **Datos de prueba (Demo)** para testing sin Excel.

### 4.3. Nuevas Funcionalidades (Claudia novobanco)

- **"No aplica" universal** — Todos los campos editables pueden desactivarse individualmente.
- **Multi-servicio con parámetros individuales** — SLA, AHT, abandono, shrinkage propios por servicio.
- **Gestión de perfiles** — Guardar/cargar/exportar/importar múltiples configuraciones nombradas.
- **Configuración dual** — Todo editable desde la UI Y cargable desde Excel (mismo fichero que Claudia Orange: STAFF + Previsión + Último Turno).
- **Gráfico combinado barras+líneas (Panel D)** — En el mismo panel que el what-if: barras de llamadas (atendidas / fuera NDS / abandonadas) + líneas NDA y NDS. Filtrable por servicio, agregación temporal y franja.
- **What-if integrado con análisis** — En el mismo panel D, con recálculo instantáneo del gráfico al añadir/quitar agentes virtuales.
- **Visualización completa en UI** — Todos los resultados visibles en pantalla sin descargar. Un único botón "Descargar Excel completo" para exportar todo.
- **Paleta y tipografía novobanco** — Rojo primario `#E30613`, oscuro `#1C1C1C`, variables CSS para re-theming.

**Panel Previsión — implementado en `js/forecast.js`:**

- **Horario de servicio configurable** — Selector inicio (00:00–23:00) y fin (01:00–24:00) en toolbar. El valor `24` se muestra como `00:00`. Genera franjas dinámicamente desde el rango definido.
- **Granularidad configurable** — 15 min / 30 min / 1 h, seleccionable en toolbar. Regenera franjas al cambiar.
- **Dual vista tabla** — Vista Semana (franjas × 7 días) y Vista Mes (días del mes × franjas), toggle en toolbar. Weeekends con fondo verde en la tabla mes.
- **Vista gráfica combinada (Chart.js)** — Barras = llamadas (eje Y izquierdo) + línea = AHT promedio ponderado (eje Y derecho). Tres modos: Día (franjas del día seleccionado), Semana (franjas 7 días), Mes (1 barra por día). Navegación ◀/▶/Hoy en modo Día. Actualización instantánea.
- **Edición masiva con popover** — Clic en cabecera de franja o día abre un popover con dos bloques de checkboxes (Franjas + Días), botones Todos/Ninguno en cada bloque y campo de valor. La aplicación afecta al **producto cartesiano** de franjas × días seleccionados.
- **Navegación por teclado** — `Tab` (día siguiente), `Shift+Tab` (día anterior), `Enter` (franja siguiente), `Escape` (cancelar edición).
- **Demo reactivo** — El botón 🧪 Demo genera datos sintéticos. Si hay datos demo activos, se regeneran automáticamente al cambiar granularidad u horario.
- **Persistencia de previsión** — `State.forecast.llamadas`, `.aht` y `.editado` se incluyen en `guardarEstado()` y se restauran en `restaurarEstado()` desde `localStorage`.

---

## 5. Fases de Construcción

### Fase 0 — Scaffolding + Identidad Visual novobanco
**Duración estimada: Sprint 1**

| Tarea | Detalle |
|---|---|
| Crear carpeta `Claudia novobanco/` | Estructura: `index.html`, `css/`, `js/` |
| `styles.css` | Variables CSS novobanco. Componentes base: panel, param-item, btn, stats-grid, table-container, progress-overlay |
| `state.js` | Estado centralizado `State` con modelo `{ valor, noAplica }` para todos los campos. Persistencia localStorage |
| `config.js` | Convenio defaults con flags `noAplica`. Función `getConvenio()` dinámica. Función `isActive(campo)` |
| `utils.js` | Parseo tiempos/fechas, formateo, helpers. Función `renderCampoEditable(campo)` que renderiza input + checkbox "No aplica" |
| `profiles.js` | CRUD de perfiles en localStorage. Exportación/importación JSON |
| `ui.js` | Layout de paneles A-F. Acordeones. Overlay de progreso. Navegación lateral |
| `index.html` | Shell HTML. CDN: XLSX, ExcelJS, FileSaver, Chart.js. `<script src>` de todos los módulos en orden |

**Entregable:** Aplicación con layout novobanco, paneles vacíos navegables, "No aplica" funcionando en todos los campos del convenio.

---

### Fase 1 — Configuración del Servicio + Perfiles
**Duración estimada: Sprint 2**

| Tarea | Detalle |
|---|---|
| Panel A1: Multi-servicio | Añadir/eliminar servicios. Cada servicio con su propio formulario (nombre, color, SLA, AHT, etc., todos con "No aplica"). Vista de accordeón por servicio |
| Panel A2: Convenio | Todos los campos con toggle "No aplica". Preset "Convenio Español CC". Reglas de excepción por segmento de staff (ver §10) |
| Panel A3: Perfiles | UI de guardar/cargar/borrar perfiles. Restore automático del último perfil |
| Sincronización | PVD del convenio → shrinkage de cada servicio si no tiene el suyo. Cambios en convenio → recalculo de factores |

**Entregable:** Configuración multi-servicio completa con "No aplica" y gestión de perfiles.

---

### Fase 2 — Carga de Datos (Excel + Editor UI)
**Duración estimada: Sprint 3**

| Tarea | Detalle |
|---|---|
| `parser.js` | Parseo flexible: STAFF, Previsión (llamadas + AHT por franja/día/servicio), Último Turno. Detección automática de hojas y columnas |
| Panel B1: Subida Excel | Zona de drop/clic. Last-file en IndexedDB. Banner de último archivo. Validación de hojas |
| Panel B2: Editor de Previsión | Tabla franjas × días (vista Semana) y días × franjas (vista Mes). Toggle Semana/Mes + toggle Llamadas/AHT. Horario configurable (selector inicio/fin 00–24h). Granularidad 15min/30min/1h. Edición inline doble clic. **Edición masiva con popover** (2 bloques checkbox Franjas+Días, producto cartesiano). **Navegación teclado** (Tab/Enter/Shift+Tab). **Vista gráfica** Chart.js (barras=llamadas, línea=AHT, modos Día/Semana/Mes). Totales automáticos. Demo reactivo. Persistencia `State.forecast` en localStorage. |
| Panel B3: Análisis Staff | Resumen agentes por servicio (dinámico). Cobertura horaria. Alertas. Todo visible en UI |
| Datos Demo | Generador sintético para todos los servicios configurados |

**Entregable:** Carga de datos completa, editor de previsión funcional y análisis de staff visible en UI.

---

### Fase 3 — Motor Erlang C + Dimensionamiento
**Duración estimada: Sprint 4**

| Tarea | Detalle |
|---|---|
| `erlang.js` | `erlangC()`, `calcularAgentesNecesarios()`. Soporte multi-servicio con AHT individuales. Respeta flags `noAplica` |
| Panel C: Dimensionamiento | Parámetros globales + override por servicio. Shrinkage mensual con "No aplica" por mes. Cálculo por servicio o consolidado |
| Tabla de resultados en UI | `fecha | franja | servicio | llamadas | abandono | AHT | FTE` — visible en pantalla con paginación/filtros |
| Tarjetas de resumen | FTE pico, FTE promedio, llamadas/día, total llamadas periodo |

**Entregable:** Dimensionamiento Erlang C con parámetros por servicio, todo visible en UI sin descargar.

---

### Fase 4 — Gráfico Combinado + NDA/NDS + What-If  *(en mismo panel)*
**Duración estimada: Sprint 5**

| Tarea | Detalle |
|---|---|
| `engine.js` | NDA determinista, NDS Erlang C inverso, gaps, llamadas atendidas/abandonadas/fueraNDS por franja/día |
| `charts.js` | **Gráfico combinado Chart.js:** barras apiladas (atendidas verde, fueraNDS naranja, abandonadas rojo) + líneas duales (NDA azul oscuro, NDS rojo). Eje Y izquierdo: llamadas. Eje Y derecho: % (0-100%). Filtros: servicio, agregación D/S/M, franja |
| `whatif.js` | Panel D integrado: agentes virtuales con campos con "No aplica". Recalculo instantáneo del gráfico. Línea punteada "escenario base" vs línea sólida "con what-if" |
| Tabla NDA/NDS en UI | Tabla franja × día sin descargar. Format condicional 🟢🟡🔴 por celda |
| Validación | Sistema 🟢🟡🔴 con detalle desplegable de errores/warnings |

**Entregable:** Panel D completo: gráfico combinado + tabla NDA/NDS + what-if, todo en un solo panel interactivo visible en UI.

---

### Fase 5 — Capacidad + Planificación
**Duración estimada: Sprints 6-7**

| Tarea | Detalle |
|---|---|
| Motor de Capacidad | Compara agentes Erlang C vs staff disponible por servicio. Shrinkage aplicado. Visible en UI |
| `scheduler.js` | Optimizador FDS con parámetros del convenio dinámicos (todos con "No aplica") |
| Panel E1: Optimizador FDS | Tabla de rotación visible en UI por servicio |
| Panel E2: Cuadrante | Tabla interactiva en UI con colores M/T/C/L/VAC/IT/DLF/FEST. Filtros por servicio y mes. Overlay de progreso |

**Entregable:** Planificación completa visible en UI, sin necesidad de descargar para revisar el cuadrante.

---

### Fase 6 — Exportación Unificada
**Duración estimada: Sprint 8**

| Tarea | Detalle |
|---|---|
| `export.js` | Un único Excel multi-hoja: Resumen + Config + Previsión + Dimensionamiento + NDA-NDS + Cuadrante (1/mes) + Staff |
| Panel F: Vista previa hojas | Tabs con preview de cada hoja dentro del panel, sin descargar |
| Botón único 📥 | "Descargar Excel completo" — genera y descarga el fichero completo |
| Botón 📤 JSON | "Exportar configuración" — perfil JSON para importar en otra instancia |
| Formato Excel | Colores novobanco, freeze panes, formato condicional en celdas de gap/NDA, anchos optimizados, hoja Resumen ejecutivo |

**Entregable:** Exportación unificada completa con vista previa en UI y descarga de un único fichero.

---

### Fase 7 — Pulido, Testing y Optimización
**Duración estimada: Sprint 9**

| Tarea | Detalle |
|---|---|
| Testing cruzado | Resultados Erlang C vs Claudia Orange con mismos datos. Cuadrante vs Pepephone |
| Testing multi-servicio | Escenarios con 1, 2, 3 y 4 servicios simultáneos. Todos los campos con "No aplica" |
| Testing "No aplica" | Verificar que todos los campos desactivados se excluyen correctamente del cálculo |
| Performance | Cálculos pesados con Web Workers si el cuadrante supera 300 agentes × 365 días |
| UX y responsive | Info-boxes contextuales en cada panel. Diseño adaptable. Tooltips en campos con "No aplica" |
| Datos demo ricos | Dataset demo que cubra: multi-servicio, distintos convenios, what-if con impacto visible |

**Entregable:** Herramienta lista para producción.

---

## 6. Resumen de Origen de Cada Funcionalidad

| Funcionalidad | Origen | Adaptación para novobanco |
|---|---|---|
| Motor Erlang C | Orange | Sin cambios en la lógica matemática |
| Arquetipos dinámicos | Orange | Servicios parametrizables (sin hardcoding) |
| NDA/NDS determinista | Orange | + Gráfico combinado barras+líneas con what-if |
| Matriz de encaje | Orange | Visible en UI (tabla no descargable) |
| Verificación disponibilidad | Orange | Flags `noAplica` en todos los estados |
| Arquitectura modular JS | Pepephone | + `profiles.js`, `charts.js`, `forecast.js` |
| Estado centralizado | Pepephone | Modelo `{ valor, noAplica }` para todos los campos |
| Panel de convenio editable | Pepephone | + Campos libres + "No aplica" + presets |
| Persistencia localStorage/IDB | Pepephone | + Gestión de múltiples perfiles |
| Shrinkage mensual | Pepephone | "No aplica" por mes |
| Optimizador FDS | Pepephone | Parámetros del convenio con "No aplica" |
| Cuadrante anual | Pepephone | Visible en UI, multi-servicio sin hardcoding |
| Exportación Excel | Pepephone | Un único fichero completo. Vista previa en UI |
| Herencia mes anterior | Pepephone | Sin cambios |
| Overlay de progreso | Pepephone | Sin cambios |
| "No aplica" universal | ★ NUEVO | Todos los campos. Patrón `{ valor, noAplica }` |
| Multi-servicio individual | ★ NUEVO | Parámetros SLA/AHT/abandono/shrinkage por servicio |
| Gestión de perfiles | ★ NUEVO | Guardar/cargar/exportar múltiples configuraciones |
| Gráfico combinado barras+líneas | ★ NUEVO | Llamadas (3 tipos) + NDA% + NDS% en un gráfico |
| What-If integrado en panel NDA/NDS | ★ NUEVO | Mismo panel. Recálculo instantáneo del gráfico |
| Visualización UI sin descargar | ★ NUEVO | Todos los datos visibles en pantalla |
| Config dual (Excel + UI) | ★ NUEVO | Todo editable desde UI tras cargar Excel |
| Perfil visual novobanco | ★ NUEVO | Rojo `#E30613`, variables CSS, Nunito Sans |
| Horario servicio configurable | ★ NUEVO (impl.) | Selector inicio/fin 00:00–24:00 en toolbar. Franjas dinámicas. |
| Granularidad configurable | ★ NUEVO (impl.) | 15 min / 30 min / 1 h. Regenera franjas al cambiar. |
| Vista Semana + Vista Mes | ★ NUEVO (impl.) | Toggle en toolbar. Mes: días × franjas, FDS en verde. |
| Vista gráfica previsión (Chart.js) | ★ NUEVO (impl.) | Barras=llamadas + línea=AHT. Modos Día/Semana/Mes. |
| Edición masiva con popover | ★ NUEVO (impl.) | Doble bloque checkbox (Franjas+Días). Producto cartesiano. |
| Navegación teclado en previsión | ★ NUEVO (impl.) | Tab/Enter/Shift+Tab/Escape en celdas de edición inline. |
| Demo reactivo a dimensiones | ★ NUEVO (impl.) | Regenera datos demo al cambiar granularidad u horario. |
| Persistencia `State.forecast` | ★ NUEVO (impl.) | llamadas, AHT y flag editado guardados en localStorage. |
| Reglas de excepción por segmento | ★ NUEVO (impl.) | Motor de reglas CRUD: filtro staff + parámetros de excepción. Sustituye campos libres planos. F1–F5 ✅ |
| Tooltip/info por parámetro | ★ NUEVO (impl.) | Botón ℹ en cada parámetro. Popover con descripción + efecto en dimensionamiento. |
| Modal resumen regla | ★ NUEVO (impl.) | Botón ℹ️ en header de tarjeta. Modal con estado, filtros activos y parámetros activos. |
| Motor de resolución de reglas | ★ NUEVO (impl.) | `resolverReglasParaAgente()` con prioridad, modo conflicto y vigencia temporal. Getters efectivos en config.js. F6 ✅ |
| ~~Campos libres (legacy)~~ | ~~ELIMINADO~~ | `camposLibres` borrado del modelo, UI y config.js. No hay perfiles legacy. |

---

## 7. Stack Tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| Lenguaje | JavaScript ES6+ vanilla | Sin dependencias de framework. HTML estático desde cualquier sitio |
| Estilos | CSS3 con variables custom | Tema novobanco re-themeable. Sin preprocesador |
| Parseo Excel | SheetJS (xlsx.js) | Lectura de .xlsx/.xls con detección automática de hojas |
| Generación Excel | ExcelJS | Exportación con formato, colores, freeze panes, formato condicional |
| Descarga archivos | FileSaver.js | Descarga de blobs multiplataforma |
| Gráficas | Chart.js 4.x | Gráfico combinado (bar+line) nativo, responsive, sin dependencias |
| Persistencia | localStorage + IndexedDB | Parámetros y perfiles en localStorage. Último archivo en IndexedDB |
| Hosting | HTML estático | Desplegable en cualquier servidor web o ejecutable en local |

---

## 8. Nomenclatura de Archivos

| Antes (incorrecto) | Ahora (correcto) |
|---|---|
| `Claudia Novo Bank/` | `Claudia novobanco/` |
| `Claudia Novo Bank.html` | `index.html` |
| `PROPUESTA_PROYECTO_CLAUDIA_NOVO_BANK.md` | `PROPUESTA_PROYECTO_CLAUDIA_NOVOBANCO.md` |
| `nova bank`, `Novo Bank`, `NovBank` | `novobanco` (todo minúsculas, sin espacio) |
| Referencias en código | `nb_` como prefijo de variables CSS y localStorage |

---

## 9. Riesgos y Mitigación

| Riesgo | Mitigación |
|---|---|
| Complejidad del "No aplica" en todos los campos | Patrón `{ valor, noAplica }` estandarizado en `State`. Función `isActive(campo)` centralizada |
| Rendimiento del gráfico combinado con muchos datos | Limitar a la franja/día visible + resampleo para vistas semanales/mensuales. Lazy render |
| Complejidad del motor Erlang C multi-servicio | `erlang.js` acepta configuración por servicio. Cada servicio se calcula de forma independiente |
| Rendimiento cuadrante para plantillas grandes | Web Workers para cálculos > 200 agentes × 365 días |
| Compatibilidad formatos Excel de entrada | Parser con detección automática de columnas y hojas, tolerante a variaciones |
| Perfiles con configuraciones incompatibles | Versión en cada perfil. Migración automática de estructura |
| Conflicto entre reglas de excepción activas | Modo de conflicto por regla: `sustituir` / `sumar` / `más restrictivo`. Prioridad numérica configurable |
| ~~Migración `camposLibres`~~ | Eliminado: `camposLibres` borrado del modelo. No existe código de migración ni legacy. |
| Reglas activas sin staff cargado | Si `State.staff` está vacío, las dimensiones de filtro basadas en agentes reales se ignoran sin error |

---

## 10. Reglas de Excepción por Segmento de Staff

> **Estado:** F1–F5 + UX (botones ℹ, modal resumen) implementados en v1.5.  
> Los "campos libres" planos han sido **eliminados completamente** del modelo, la UI y config.js. No existe código legacy.

### 10.1. Concepto

Sustitución del sistema de "campos libres" planos por un **motor de reglas condicionales**: cada regla define *a quién aplica* (filtro de staff) y *qué parámetros cambian* (excepción). Las reglas sin filtro son equivalentes a los actuales campos libres (ámbito global).

### 10.2. Modelo de datos

```js
// State.convenio.reglasExcepcion = []
{
    id:            'uuid',
    nombre:        'Reducción jornada agentes FDS',
    activa:        true,
    prioridad:     10,            // Mayor número = mayor prioridad en conflicto
    vigencia: {                   // null = sin restricción temporal
        desde: '2026-06-01',
        hasta: '2026-12-31'
    },
    modoConflicto: 'sustituir',   // 'sustituir' | 'sumar' | 'mas_restrictivo'
    notas:         '',            // Comentario libre para auditoría

    // ── BLOQUE 1: Filtro de staff ([] = todos / null = sin restricción) ──
    filtro: {
        servicios:       [],   // State.config.servicios (dinámico)
        tiposTurno:      [],   // mañana | tarde | noche | fds | partido | guardia
        estados:         [],   // fijo | temporal | excedencia | reduccion_activa
        tiposContrato:   [],   // completo | parcial_75 | parcial_50
        gruposPro:       [],   // teleoperador | especialista | supervisor
        sedes:           [],   // State.staff.todos (dinámico)
        antiguedadMin:   null, // años
        antiguedadMax:   null,
        franjas:         null  // null = sin restricción horaria
                               // { desde: '22:00', hasta: '06:00', dias: [6,0] }
    },

    // ── BLOQUE 2: Parámetros de excepción ────────────────────────────────
    parametros: {

        // — Cálculo base —
        shrinkage:           { activa: false, valor: null }, // %
        reduccionJornada:    { activa: false, valor: null }, // % reduce horas anuales
        ocupacionMax:        { activa: false, valor: null }, // % cap Erlang C
        ahtOverride:         { activa: false, valor: null }, // seg
        jornadaSemanal:      { activa: false, valor: null }, // horas
        vacaciones:          { activa: false, valor: null }, // días laborables

        // — Rotación y turnos —
        rotacion: {
            frecuencia:          { activa: false, valor: null },
            // semanal | quincenal | mensual | trimestral | no_rota
            patronFds:           { activa: false, valor: null },
            // 1_cada_2 | 1_cada_3 | 1_cada_4 | libre | nunca
            fdsAlMes:            { activa: false, valor: null },
            cambiosTurnoMes:     { activa: false, valor: null },
            cambiosTurnoAnio:    { activa: false, valor: null },
            descansoCambioTurno: { activa: false, valor: null }, // horas
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

        // — Campos extra libres (equivalente a los campos libres actuales) —
        extras: [] // [{ nombre, valor, noAplica, rol }]
    }
}
```

### 10.3. UI — Panel A2, sub-panel "Reglas de excepción"

```
┌─────────────────────────────────────────────────────────────────┐
│  ▼ Reglas de excepción de staff                  [+ Añadir]    │
├─────────────────────────────────────────────────────────────────┤
│  ▼ Reducción jornada agentes FDS                       ✅ ON   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ A QUIÉN APLICA (filtro)                                  │  │
│  │  Servicio:    [Atención ×] [Soporte ×]                    │  │
│  │  Tipo turno:  [FDS ×] [Nocturno ×]                        │  │
│  │  Estado:      [Fijo ×]                                     │  │
│  │  Franja:      22:00 → 06:00   días: [S][D]                │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ QUÉ CAMBIA (excepción)                                   │  │
│  │  ▼ Cálculo base                                           │  │
│  │      [✅] Shrinkage             22.5 %                    │  │
│  │      [✅] Ocupación máxima      80 %                      │  │
│  │  ▼ Rotación y turnos                                      │  │
│  │      [✅] Patrón FDS            1 de cada 3               │  │
│  │      [✅] FDS al mes            2                         │  │
│  │      [⬜] Frecuencia rotación   —                         │  │
│  │      [⬜] Descanso cambio turno —                         │  │
│  │  ▼ Carga especial              (todo desactivado)         │  │
│  │  ▼ Teletrabajo                 (todo desactivado)         │  │
│  │  ➕ Campo extra libre                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Prioridad: [10]  Conflicto: [sustituir ▾]                      │
│  Vigencia:  desde [          ]  hasta [          ]              │
│  Notas:     [                                              ]    │
│                                                [🗑 Eliminar]    │
├─────────────────────────────────────────────────────────────────┤
│  ▶ Agentes FDS turno tarde                             ⬜ OFF  │
└─────────────────────────────────────────────────────────────────┘
```

### 10.4. Dimensiones de filtro implementadas

| Dimensión | Tipo UI | Fuente de opciones |
|---|---|---|
| Servicio | Multi-chip | `State.config.servicios` (dinámico) |
| Tipo de turno | Multi-chip | Extraído de `State.staff.todos.tipoTurno` (con fallback a lista STAFF_TURNOS) |
| Estado del agente | Multi-chip | Extraído de `State.staff.todos.estado` (dinámico) |
| Sede / centro | Multi-chip | Extraído de `State.staff.todos.sede` (dinámico) |
| Agente individual | Autocomplete + paste | Búsqueda por código o nombre; pegado masivo desde Excel |
| Antigüedad mín./máx. | Número (años) | `null` = sin restricción |

> **Nota:** Tipo de contrato y grupo profesional (F7) pendientes hasta que el parser de STAFF lea esas columnas.

### 10.5. Parámetros de excepción implementados

> Cada parámetro incluye un botón **ℹ** que abre un popover con descripción y efecto en el dimensionamiento.

#### Grupo: Cálculo base

| Parámetro | Unidad | Efecto en cálculo |
|---|---|---|
| Shrinkage | % | Sustituye / suma al del convenio para este segmento |
| Reducción de jornada | % | Reduce horas anuales disponibles del agente |
| Ocupación máxima | % | Cap de Erlang C para este grupo |
| AHT override | seg | Sustituye el AHT del servicio para este grupo |
| Jornada semanal | horas | Override de `jornadaSemanal` del convenio |
| Vacaciones | días lab. | Override del campo `vacaciones` del convenio |
| **Días de trabajo** | L–D toggles | Restringe los días que trabaja el grupo. Vacío = sin restricción (todos los días del turno) |

> `diasTrabajo` es una **excepción** (define qué días trabaja el grupo), **no** un criterio de filtro.

#### Grupo: Rotación y turnos

| Parámetro | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| Frecuencia de rotación | Select | Mensual | Semanal / Quincenal / Mensual / Trimestral / No rota |
| Patrón FDS | Select | 1 cada 3 | 1 cada 2 / 1 cada 3 / 1 cada 4 / Libre / Nunca |
| FDS trabajados al mes | Número | 2 | Cuántos fines de semana computa en la distribución |
| Cambios de turno / mes | Número | 3 | Cap mensual de cambios de turno en el cuadrante |
| Cambios de turno / año | Número | 12 | Cap anual de cambios de turno |
| Descanso mín. entre turnos | Horas | 36 | Restricción al cambiar de turno (ej: mañana→noche) |
| Máx. noches consecutivas | Número | 5 | Override de `maxConsecNF` del convenio por perfil |
| Noches al mes | Número | 8 | Cap mensual de turnos nocturnos |

#### Grupo: Carga especial

| Parámetro | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| Festivos obligatorios / año | Número | 4 | Festivos que computa como trabajados en el cuadrante |
| Guardias / on-call al mes | Número | 2 | Disponibilidad de guardia fuera de turno habitual |
| Jornada partida / mes | Número | 3 | Máx. turnos partidos permitidos al mes |
| Horas extra / mes | Número | 40 | Cap mensual de prolongaciones de jornada |
| Horas extra / año | Número | 200 | Cap anual de prolongaciones de jornada |
| Bolsa de horas | Número | +80 | Saldo acumulable/descontable (positivo = crédito) |

#### Grupo: Teletrabajo

| Parámetro | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| Días teletrabajo / semana | Número | 2 | Modifica disponibilidad presencial semanal |
| Días teletrabajo / mes | Número | 8 | Alternativa mensual al parámetro semanal |

### 10.6. Propiedades de control de la regla

| Propiedad | Tipo | Descripción |
|---|---|---|
| **Activa** | Toggle | Desactiva la regla sin eliminarla ni perder su configuración |
| **Prioridad** | Número | Mayor número = mayor prioridad. Si dos reglas colisionan, gana la de mayor prioridad |
| **Modo de conflicto** | Select | `sustituir` — reemplaza el valor del convenio; `sumar` — acumula sobre el convenio; `más restrictivo` — aplica el valor más limitante |
| **Vigencia desde/hasta** | Fecha | Para excepciones temporales: maternidad, convenio nuevo, campaña estacional |
| **Notas** | Texto libre | Motivo de la excepción para auditoría interna |

### 10.7. Motor de resolución (`resolverReglasParaAgente`)

```
Entrada: agente  { svcId, tipoTurno, estado, contrato, grupoPro, sede, antiguedad }
         contexto { fecha, franja }

1. Filtrar reglasExcepcion donde regla.activa === true
2. Filtrar por vigencia (fecha actual dentro de desde..hasta si vigencia existe)
3. Para cada regla: evaluar filtro contra el agente
   → true sólo si TODAS las dimensiones configuradas pasan (AND implícito)
   → dimensión vacía/null = siempre pasa
4. Ordenar reglas que pasan por prioridad DESC
5. Fusionar parámetros según modoConflicto de cada regla:
   - sustituir:       el valor de mayor prioridad gana
   - sumar:           acumular todos los valores activos
   - mas_restrictivo: tomar el valor más limitante (mayor shrinkage, menor ocupacionMax, etc.)
6. Devolver objeto de parámetros resueltos para ese agente en ese contexto
```

### 10.8. ~~Compatibilidad hacia atrás con `camposLibres`~~

> **ELIMINADO en v1.5.** La aplicación está en desarrollo, sin perfiles guardados que migrar. `camposLibres` se ha borrado del modelo de datos, de la UI y de los getters en `config.js`.

### 10.9. Fases de implementación

| Fase | Descripción | Riesgo | Toca cálculos | Estado |
|---|---|---|---|---|
| **F1 — Modelo datos** | `State.convenio.reglasExcepcion = []`. `crearReglaExcepcion()`. `_normalizarRegla()` | Mínimo | No | ✅ |
| **F2 — CRUD base** | Sub-panel A2. Tarjeta acordeón. Grupo Cálculo base | Bajo | No | ✅ |
| **F3 — Filtros estáticos** | Chips: Servicio / Tipo turno / Estado | Bajo | No | ✅ |
| **F3b — Opciones dinámicas** | Opciones extraídas de `State.staff.todos`. Fallback | Bajo | No | ✅ |
| **F3c — Filtro agentes** | `filtro.agentes[]` + autocomplete + paste Excel | Bajo | No | ✅ |
| **F3d — Días como excepción** | `diasTrabajo` en `parametros` (no en filtro). Botones L–D + L–V/FDS/Todos | Bajo | No | ✅ |
| **F4 — Grupos rotación+carga+teletrabajo** | 16 parámetros en 3 grupos con select+number | Bajo | No | ✅ |
| **F5 — `camposLibres` eliminado** | Sub-panel, getters y modelo borrados completamente | Bajo | No | ✅ |
| **UX — Botones ℹ por parámetro** | Popover descripción + efecto en cada parámetro | Bajo | No | ✅ |
| **UX — Modal ℹ️ por regla** | Modal resumen al pulsar ℹ️ en header de tarjeta | Bajo | No | ✅ |
| **F6 — Motor resolución** | `resolverReglasParaAgente()`. Getters delegan. Modo conflicto. Vigencia | Alto | **Sí** | ✅ |
| **F7 — Filtros adicionales** | Tipo contrato / Grupo profesional / Antigüedad desde `State.staff` | Bajo | No | ⏳ pendiente |

---

## 11. Estado de Implementación (v1.5 — 1 abril 2026)

### Módulo A — Configuración

| Sub-módulo | Estado | Notas |
|---|---|---|
| A1 · Parámetros del servicio (multi-svc) | ✅ | CRUD servicios, color, SLA, AHT, shrinkage, abandono |
| A2 · Convenio (grid N/A + presets) | ✅ | Grid completo con N/A. Preset Convenio Español CC |
| A2 · Reglas de excepción F1–F5 + UX | ✅ | CRUD tarjetas, 4 grupos parámetros, filtros dinámicos, botones ℹ, modal resumen |
| A2 · Motor resolución reglas (F6) | ✅ | `resolverReglasParaAgente()`, `_filtrarReglaContraAgente()`, `_mergearParametros()` en state.js. Getters efectivos en config.js |}
| A3 · Perfiles | ✅ | Guardar / cargar / borrar / exportar JSON |

### Módulo B — Datos

| Sub-módulo | Estado |
|---|---|
| B1 · Subida Excel | ✅ |
| B2 · Editor Previsión (tabla + gráfico + edición masiva) | ✅ (ver §3.5.B2) |
| B3 · Análisis Staff | ✅ |

### Módulos C–F — En desarrollo

| Panel | Estado | Notas |
|---|---|---|
| C1 · Tabla necesidad (llamadas+AHT+FTE por día×franja) | ⏳ pendiente | Ver diseño §3.5.C1. Motor erlang.js listo pero con bugs pendientes |
| C2 · Cuadrante de planificación (gestor×día) | ⏳ pendiente | Ver diseño §3.5.C2 |
| C · Correcciones técnicas pendientes | ⏳ | Shrinkage como producto (no suma); abandono pre-Erlang; shrinkage mensual diferenciado |
| D · NDA/NDS + Gráfico + What-If | ⏳ pendiente | Requiere C completado |
| E · Capacidad + Cuadrante anual | ⏳ pendiente | Requiere D |
| F · Exportación Excel | ⏳ pendiente | Requiere C-E |

---

*Claudia novobanco · PAX Servinform · 2026*  
*Propuesta v1.7 — Diseño detallado Panel C (C1 tabla, C2 cuadrante, C3 reglas FDS). Correcciones técnicas pendientes documentadas.*
