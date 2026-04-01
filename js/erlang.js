/**
 * erlang.js — Motor Erlang C + utilidades de dimensionamiento
 * PAX Servinform · 2026
 *
 * Funciones públicas:
 *   erlangC(llamadasPorHora, ahtSegundos, agentes) → probEspera [0-1]
 *   slaReal(probEspera, agentes, trafico, ahtSegundos, tiempoSlaSegundos) → sla [0-1]
 *   calcularAgentesNecesarios(cfg) → { agentes, slaAlcanzado, trafico, ocupacion, pw }
 *   dimensionarTodo(opciones) → { filas[], resumen{} }
 *
 * Correcciones técnicas (v1.7):
 *   - Abandono pre-Erlang: llamadas × (1 − tasaAbandono/100) antes de Erlang C
 *   - Shrinkage como PRODUCTO: (1−pvd)(1−oper)(1−abs) via getFactorNetoDimensionamiento()
 *   - Shrinkage mensual diferenciado: lee State.dimensionamiento.shrinkageMensual via getter
 */

'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// Núcleo matemático
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Probabilidad de espera Erlang C (logarítmica para evitar overflow).
 * @param {number} llamadasPorHora
 * @param {number} ahtSegundos     Tiempo medio de operación (AHT)
 * @param {number} agentes         Número de agentes en paralelo
 * @returns {number} Probabilidad de espera [0, 1]
 */
function erlangC(llamadasPorHora, ahtSegundos, agentes) {
    if (agentes < 1 || llamadasPorHora <= 0) return 0;

    const A = (llamadasPorHora * ahtSegundos) / 3600;   // Intensidad Erlangs
    if (A >= agentes) return 1;                          // Sistema saturado

    const logA = Math.log(A);
    let logFactorial = 0;
    let sumatorio = 1;   // A^0/0! = 1

    for (let k = 1; k < agentes; k++) {
        logFactorial += Math.log(k);
        sumatorio += Math.exp(k * logA - logFactorial);
    }

    logFactorial += Math.log(agentes);  // log(n!)
    const logNum = agentes * logA - logFactorial;
    const numerador = Math.exp(logNum) * (agentes / (agentes - A));

    return numerador / (sumatorio + numerador);
}

/**
 * SLA real dado una probabilidad de espera ya calculada.
 * @param {number} probEspera    Resultado de erlangC()
 * @param {number} agentes
 * @param {number} trafico       Intensidad A = λ·AHT/3600
 * @param {number} ahtSegundos
 * @param {number} tiempoSla     Segundos de umbral SLA (ej: 20)
 * @returns {number} SLA como fracción [0, 1]
 */
function slaReal(probEspera, agentes, trafico, ahtSegundos, tiempoSla) {
    const mu = 1 / ahtSegundos;
    const C  = agentes - trafico;
    return 1 - probEspera * Math.exp(-C * mu * tiempoSla);
}

// ──────────────────────────────────────────────────────────────────────────────
// Búsqueda de agentes necesarios
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Calcula los agentes mínimos necesarios para cumplir el SLA.
 *
 * @param {object} cfg
 *   llamadas      {number}  Llamadas en la franja (granularidad configurable)
 *   granMinutos   {number}  Minutos de la franja (15 | 30 | 60)
 *   ahtSegundos   {number}  AHT medio del servicio
 *   slaObjetivo   {number}  SLA objetivo [0-100] (ej: 80)
 *   tiempoSla     {number}  Umbral en segundos (ej: 20)
 *   ocupacionMax  {number}  Ocupación máxima permitida [0-100] (ej: 85)
 *
 * @returns {{ agentes, slaAlcanzado, trafico, ocupacion, pw }}
 */
function calcularAgentesNecesarios(cfg) {
    var llamadas    = cfg.llamadas    || 0;
    var gran        = cfg.granMinutos || 30;
    var aht         = cfg.ahtSegundos || 180;
    var slaObj      = (cfg.slaObjetivo  || 80) / 100;
    var tSla        = cfg.tiempoSla   || 20;
    var ocupMax     = (cfg.ocupacionMax || 85) / 100;

    if (llamadas < 0.1) return { agentes: 0, slaAlcanzado: 1, trafico: 0, ocupacion: 0, pw: 0 };

    // Convertir llamadas de la franja a llamadas/hora
    var factor   = 60 / gran;
    var lambdaH  = llamadas * factor;
    var trafico  = (lambdaH * aht) / 3600;

    // Mínimo de agentes: ceil(tráfico), nunca 0
    var agentes = Math.max(1, Math.ceil(trafico));
    var maxIter = Math.max(Math.ceil(trafico * 4), 200);

    while (agentes <= maxIter) {
        var pw  = erlangC(lambdaH, aht, agentes);
        var sla = slaReal(pw, agentes, trafico, aht, tSla);
        var ocu = agentes > 0 ? trafico / agentes : 0;

        // Condición de parada: SLA cumplido Y ocupación dentro del límite
        if (sla >= slaObj && ocu <= ocupMax) {
            return {
                agentes:     agentes,
                slaAlcanzado: parseFloat((sla * 100).toFixed(2)),
                trafico:     parseFloat(trafico.toFixed(4)),
                ocupacion:   parseFloat((ocu * 100).toFixed(2)),
                pw:          parseFloat((pw  * 100).toFixed(2))
            };
        }
        agentes++;
    }

    // No convergió
    console.warn('[Erlang] No convergió: ' + llamadas + ' llam/' + gran + 'min, AHT ' + aht + 's');
    return {
        agentes:     agentes,
        slaAlcanzado: null,
        trafico:     parseFloat(trafico.toFixed(4)),
        ocupacion:   agentes > 0 ? parseFloat(((trafico / agentes) * 100).toFixed(2)) : 0,
        pw:          null
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Dimensionamiento completo
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Dimensiona todas las franjas de toda la previsión cargada para todos los servicios.
 *
 * @param {object} opciones
 *   fechaDesde   {string|null}  'YYYY-MM-DD'  null = todas
 *   fechaHasta   {string|null}  'YYYY-MM-DD'  null = todas
 *   soloServicio {string|null}  idServicio     null = todos
 *   shrinkageExtra {number}     % adicional global (encima del del servicio)
 *
 * @returns {{ filas: Array, resumen: object }}
 */
function dimensionarTodo(opciones) {
    opciones = opciones || {};

    var llamadasData = State.forecast.llamadas || {};
    var ahtData      = State.forecast.aht      || {};
    var servicios    = State.config.servicios  || [];
    var gran         = State.config.granularidadMin || 30;

    var filas   = [];
    var totales = {
        llamadas:   0,
        agentesMax: 0,
        agentesSuma: 0,
        franjas:    0
    };

    // Recopilar fechas dentro del rango
    var fechas = Object.keys(llamadasData).sort();
    if (opciones.fechaDesde) fechas = fechas.filter(function(f) { return f >= opciones.fechaDesde; });
    if (opciones.fechaHasta) fechas = fechas.filter(function(f) { return f <= opciones.fechaHasta; });

    fechas.forEach(function(fecha) {
        var franjas = llamadasData[fecha] || {};
        Object.keys(franjas).sort().forEach(function(franja) {
            var dataSvcs = franjas[franja] || {};

            servicios.forEach(function(svc) {
                if (opciones.soloServicio && svc.id !== opciones.soloServicio) return;

                var llamadasBrutas = (dataSvcs[svc.id] || 0);
                var ctx            = { fecha: fecha, franja: franja };
                var ahtFranja      = ((ahtData[fecha] || {})[franja] || {})[svc.id];

                // ── Capa 1: AHT efectivo (reglas de excepción > franja > global servicio)
                var aht = getAhtEfectivo(svc, ahtFranja != null ? ahtFranja : null, null, ctx);

                // ── Capa 2: Abandono pre-Erlang
                // Las llamadas que se dimensionan son solo las que no abandonarán
                var tasaAbandono      = getVal(svc.tasaAbandono) || 0;
                var llamadasEfectivas = tasaAbandono > 0
                    ? llamadasBrutas * (1 - tasaAbandono / 100)
                    : llamadasBrutas;

                // ── Capa 3: Parámetros Erlang C
                var ocupMax   = getOcupacionMaxEfectivo(svc, null, ctx);
                var slaObj    = getSlaObjetivo(svc);
                var tiempoSla = getTiempoSla(svc);

                // ── Capa 4: Factor neto de shrinkage (PRODUCTO, no suma)
                // Incluye: PVD convenio × oper × abs (con override mensual y de reglas)
                var factorBase  = getFactorNetoDimensionamiento(svc, null, ctx);
                var extraFactor = (opciones.shrinkageExtra || 0) > 0
                    ? (1 - (opciones.shrinkageExtra / 100))
                    : 1;
                var factorTotal = Math.max(0.01, factorBase * extraFactor);

                // ── Erlang C: agentes base sin shrinkage
                var res = calcularAgentesNecesarios({
                    llamadas:    llamadasEfectivas,
                    granMinutos: gran,
                    ahtSegundos: aht,
                    slaObjetivo: slaObj,
                    tiempoSla:   tiempoSla,
                    ocupacionMax: ocupMax
                });

                // ── Agentes de plantilla: base / factorNeto → cuántos contratar
                var agentesPlantilla = res.agentes > 0
                    ? Math.ceil(res.agentes / factorTotal)
                    : 0;

                var fila = {
                    fecha:             fecha,
                    franja:            franja,
                    servicioId:        svc.id,
                    servicio:          svc.nombre,
                    llamadas:          llamadasBrutas,
                    llamadasEfectivas: parseFloat(llamadasEfectivas.toFixed(1)),
                    tasaAbandono:      tasaAbandono,
                    aht:               aht,
                    trafico:           res.trafico,
                    agentesBase:       res.agentes,
                    agentes:           agentesPlantilla,
                    sla:               res.slaAlcanzado,
                    ocupacion:         res.ocupacion,
                    pw:                res.pw,
                    factorNeto:        parseFloat((factorTotal * 100).toFixed(1)),
                    shrinkage:         parseFloat(((1 - factorTotal) * 100).toFixed(1))
                };
                filas.push(fila);

                totales.llamadas    += llamadasBrutas;
                totales.agentesSuma += agentesPlantilla;
                totales.agentesMax   = Math.max(totales.agentesMax, agentesPlantilla);
                totales.franjas++;
            });
        });
    });

    var resumen = {
        totalLlamadas:     Math.round(totales.llamadas),
        agentesMax:        totales.agentesMax,
        agentesPromedio:   totales.franjas > 0
            ? parseFloat((totales.agentesSuma / totales.franjas).toFixed(1))
            : 0,
        totalFranjas:      totales.franjas,
        fechaDesde:        fechas[0]      || null,
        fechaHasta:        fechas[fechas.length - 1] || null
    };

    return { filas: filas, resumen: resumen };
}
