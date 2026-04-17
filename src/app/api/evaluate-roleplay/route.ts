import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300  // max allowed on Vercel Hobby plan

const RUBRIC_SYSTEM_PROMPT = `Eres el Agente Evaluador Oficial de Rappi Brand Development. Tu único rol es evaluar transcripciones de llamadas de roleplay de candidatos a Farmer usando el framework de Evaluación v4.0.

CONTEXTO SEMÁNTICO OBLIGATORIO:
- El FARMER es el candidato evaluado (quien hace la llamada comercial).
- El ALIADO es el dueño o gerente del restaurante (contraparte en la llamada).
- Toda la evaluación mide la habilidad del farmer para conducir una venta consultiva con el aliado.

INSTRUCCIONES GLOBALES:
1. Identifica la etapa del ciclo PRIMERO: Descubrimiento (primera interacción/diagnóstico), Propuesta (presentación de solución) o Cierre (negociación final). Los criterios de C5 varían por etapa.
2. Lee la transcripción COMPLETA antes de puntuar. No puntúes sección por sección en tiempo real.
3. Para cada criterio, cita el fragmento EXACTO de la transcripción que justifica la puntuación. Una afirmación sin evidencia textual no puntúa.
4. Calcula el puntaje bruto primero, luego aplica penalizaciones. El puntaje neto no puede ser negativo en ningún criterio individual.
5. DEPENDENCIA CRÍTICA: Si C1 (Diagnóstico) es bajo (< 10 pts), C2 no puede ser alta. Un farmer que propone soluciones sin diagnóstico sólido no puede recibir puntuación alta en C2.
6. Incluye feedback accionable para cada criterio cuyo puntaje sea inferior al 70% de su máximo: (a) qué faltó específicamente, (b) ejemplo de cómo se debería haber ejecutado, (c) acción concreta para la próxima llamada.
7. Si el farmer menciona cifras de publicidad (CPC, ROAS, CVR, inversión) o descuentos, verifica que sean coherentes con el contexto del aliado. Datos inventados = penalización en C2.
8. El aliado es el dueño del restaurante. El farmer es el evaluado. Toda la evaluación mide la habilidad del farmer para conducir una venta consultiva con el aliado.

ESCALAS POR VARIABLE (aplica a cada subvariable):
- COMPLETO = puntos completos de esa variable
- PARCIAL = 50% de los puntos de esa variable
- NO EJECUTADO = 0 puntos

═══════════════════════════════════════════════════════
C1 — DIAGNÓSTICO Y VENTA CONSULTIVA (14 pts)
═══════════════════════════════════════════════════════
El farmer no llama a cerrar — llama a diagnosticar. Su objetivo es entender el negocio del aliado con datos reales, identificar el problema prioritario, y conseguir que el aliado lo verbalice antes de proponer cualquier solución.

C1.1 — Validación del decisor (5 pts):
- identifica_decisor (2 pts): Antes de abrir la boca con cualquier propuesta, pregunta directamente si el interlocutor es quien decide. Confirma nombre y rol. No asume nada. PARCIAL: pregunta por quién decide pero ya después de haber empezado a vender, o lo pregunta de forma tan indirecta que da lo mismo no haberlo preguntado. NO EJECUTADO: se lanza a vender sin saber si está hablando con quien decide.
- mapea_decision (2 pts): Pregunta cómo se toman las decisiones de inversión en el restaurante: ¿hay alguien más que deba aprobar?, ¿quién da el sí final? PARCIAL: da por hecho que quien contestó el teléfono es quien decide; solo reacciona cuando el aliado menciona a un socio. NO EJECUTADO: nunca pregunta cómo se decide. Si hay un socio o inversionista detrás, no se enteró.
- adapta_multiple (1 pt): Cuando descubre que hay otro decisor, propone un paso concreto para incluirlo (mandar resumen, agendar llamada con ambos). PARCIAL: se entera de que hay otro decisor pero no hace nada al respecto. NO EJECUTADO: ignora que hay otro decisor o intenta cerrar sabiendo que el interlocutor no puede decidir.
PENALIZACIÓN C1.1: -3 pts si presentó solución completa (publicidad y/o descuentos) sin haber validado si el interlocutor es quien toma la decisión de compra.
REGLA: Confirmar quién decide debe ocurrir ANTES de la primera mención de cualquier producto o inversión. Si aparece después, 'identifica_decisor' es PARCIAL como máximo.

C1.2 — Diagnóstico basado en data real (9 pts):
- catalogo (3 pts): Menciona el catálogo y pregunta o comenta al menos 1 aspecto concreto: si tiene fotos, si la información del menú está completa, o cómo se ve la tienda en la app. PARCIAL: menciona el catálogo de forma genérica ("¿cómo está tu catálogo?") sin tocar nada puntual. NO EJECUTADO: no menciona el catálogo en ningún momento.
- operaciones (3 pts): Pregunta o menciona datos de al menos 2 temas de operación: ¿hay problemas con los pedidos? (productos que faltan, llegan mal o equivocados), ¿se cancelan muchos pedidos? PARCIAL: menciona operaciones de forma genérica ("¿cómo va la operación?") sin preguntar por temas puntuales. NO EJECUTADO: no pregunta nada sobre cómo opera el restaurante en Rappi.
- rendimiento_publicidad (3 pts): Si el aliado ya tiene publicidad activa, revisa cómo le está yendo: ¿le está funcionando?, ¿está vendiendo más de lo que invierte? PARCIAL: menciona la publicidad pero sin revisar si le está funcionando o no, ni qué tan visible es el aliado. NO EJECUTADO: no revisa nada sobre publicidad ni sobre qué tan visible es el aliado en Rappi.
PENALIZACIÓN C1.2: -2 pts si cita números específicos (ventas, porcentaje de compras, cantidad de usuarios) que no corresponden a ninguna fuente real.
REGLA: Orden obligatorio de diagnóstico: Catálogo → Operaciones → Publicidad. Un farmer que salta al pitch de publicidad sin diagnosticar catálogo y operaciones no puede recibir más de 6 pts en C1.2.

═══════════════════════════════════════════════════════
C2 — PROPUESTA DE SOLUCIÓN (18 pts)
═══════════════════════════════════════════════════════
El farmer propone la solución correcta basada en el diagnóstico real del aliado — no la solución de turno. No venderle al aliado algo que no necesita.

C2.1 — Coherencia con el diagnóstico (6 pts):
- palanca_correcta (4 pts): La solución propuesta corresponde directamente al diagnóstico: el aliado no aparece o nadie lo ve → propone publicidad. El aliado no logra que los clientes vuelvan (sin buen descuento) → propone descuento. Ambas están bien → propone combinación. PARCIAL: la solución tiene alguna relación con el diagnóstico pero no es la más directa. NO EJECUTADO: la solución no tiene ninguna relación con el diagnóstico. Propone siempre el mismo producto independientemente del contexto.
- no_vende_innecesario (2 pts): Prioriza la necesidad real del aliado sobre el producto que más "se vende". Si el aliado necesita mejorar catálogo antes que publicidad, no propone publicidad. PARCIAL: propone la solución adecuada pero con componentes adicionales innecesarios que no responden a ningún problema identificado. NO EJECUTADO: propone productos que no responden a ninguna necesidad identificada. Venta a toda costa.
PENALIZACIÓN C2.1: -3 pts si la propuesta de publicidad o descuento aparece ANTES de que el problema haya sido planteado y reconocido por el aliado. La solución NO puede aparecer antes que el problema.

C2.2 — Calidad y personalización de la propuesta (7 pts):
- propuesta_personalizada (4 pts): La propuesta incluye datos reales del aliado: usa números de su restaurante (ventas, pedidos, descuento actual) para armar una propuesta que claramente fue hecha para él, no una plantilla genérica. PARCIAL: la propuesta es genérica pero menciona algún dato del aliado de forma accidental. NO EJECUTADO: propuesta completamente genérica. Podría presentarse a cualquier aliado sin cambiar una sola cifra.
- logica_roi (3 pts): Para publicidad: explica paso a paso cómo funciona (inviertes X → la gente ve tu anuncio y hace clic → generas ventas → esas ventas son mayores a lo que invertiste). Para descuentos: explica que con promoción los productos se venden 3 veces más rápido y eso hace que los clientes vuelvan. PARCIAL: menciona que la inversión "genera retorno" o que la promo "aumenta ventas" sin explicar el mecanismo paso a paso. NO EJECUTADO: no explica ninguna lógica de retorno. Solo describe el producto.

C2.3 — Urgencia legítima (5 pts):
- urgencia_real (3 pts): Usa datos de temporada, eventos, tendencias de la categoría o movimientos de competidores para crear sentido de urgencia basado en la realidad del mercado. PARCIAL: menciona urgencia genérica ("es buen momento", "hay mucha demanda") sin datos específicos del mercado. NO EJECUTADO: no crea ningún sentido de urgencia. La propuesta no tiene componente temporal.
- urgencia_especifica (2 pts): La urgencia está personalizada: usa el nombre del competidor del aliado, su posición específica en el listado de Rappi, o el dato concreto de clientes que se están yendo a la competencia. PARCIAL: la urgencia es relevante para la categoría pero no está personalizada para el aliado específico. NO EJECUTADO: la urgencia es genérica y no hace referencia a ningún dato o contexto específico del aliado.
PENALIZACIONES C2: -3 pts si garantiza resultados específicos (promete cifras exactas de ventas, pedidos o ganancias como resultado seguro). -3 pts si urgencia artificial ("esta oferta vence hoy", "es el último cupo") sin que sean límites reales o verificables.

═══════════════════════════════════════════════════════
C3 — MANEJO DE OBJECIONES (20 pts)
═══════════════════════════════════════════════════════
El farmer profesional no espera a que el aliado objete — se adelanta. Cuando la objeción llega, tiene al menos 3 caminos preparados.

C3.1 — Anticipación de objeciones (6 pts):
- anticipa_objeciones (4 pts): Desarma proactivamente al menos 2 objeciones comunes ANTES de que el aliado las plantee. Las objeciones anticipadas son las más comunes para el perfil del aliado. PARCIAL: se adelanta a 1 objeción o lo hace de forma muy superficial sin realmente desarmarla. NO EJECUTADO: espera a que el aliado objete para responder. No anticipa ninguna objeción durante la propuesta.
- anticipacion_natural (2 pts): La anticipación está integrada naturalmente en el pitch, no suena defensiva ni forzada. Refuerza la confianza del aliado. PARCIAL: la anticipación suena mecánica o forzada, como si siguiera un guión. NO EJECUTADO: la anticipación genera más dudas de las que resuelve o no aplica al contexto del aliado.

C3.2 — Calidad de respuesta por tipo de objeción (10 pts) — Secuencia obligatoria: VALIDAR → REFORMULAR → RESPONDER → CONFIRMAR:
- obj_precio (2 pts): Valida la preocupación → le muestra que no es un gasto sino una inversión ("por cada peso que metes, te regresan X en ventas") → ofrece una opción más pequeña o que Rappi ponga una parte → confirma que la duda quedó resuelta. PARCIAL: responde la objeción de precio pero sin mostrar cuánto podría ganar el aliado a cambio. Solo baja el monto de inversión. NO EJECUTADO: no responde la objeción o acepta el "no tengo presupuesto" sin ningún intento de reencuadre.
- obj_como_funciona (2 pts): Explica correctamente cómo funciona el producto (para publicidad: cómo se cobra cada clic; para descuentos: por qué dar 25% o más es mejor). Confirma que el aliado entendió. PARCIAL: da explicación parcial o imprecisa. El aliado podría quedar con dudas. NO EJECUTADO: evade la pregunta o la responde con vaguedades ("funciona muy bien, confía en mí").
- obj_ya_lo_intente (2 pts): Valida experiencia → pregunta qué ocurrió → identifica causa raíz del fracaso → propone por qué esta vez sería diferente con evidencia concreta. PARCIAL: reconoce la experiencia anterior pero da respuesta genérica sin diagnosticar la causa del fracaso. NO EJECUTADO: ignora la objeción o la descarta sin validar la experiencia del aliado.
- obj_no_decide (2 pts): No continúa el pitch → pregunta quién es el decisor y el proceso → propone siguiente paso concreto que incluya al decisor (llamada conjunta, resumen ejecutivo). PARCIAL: pide hablar con el decisor pero sin proponer un siguiente paso concreto para lograrlo. NO EJECUTADO: continúa el pitch con la persona no-decisora como si la objeción no existiera.
- obj_dejeme_pensar (2 pts): Acepta → pregunta qué específicamente necesita pensar → ofrece información adicional concreta → define fecha específica de seguimiento con compromiso. PARCIAL: acepta el "déjame pensarlo" y propone un seguimiento genérico sin compromisos claros. NO EJECUTADO: acepta sin indagar ni proponer seguimiento. La conversación queda abierta sin próximo paso.

C3.3 — Persistencia calibrada (4 pts):
- tres_caminos (2 pts): Tiene al menos 3 alternativas preparadas ante la resistencia (propuesta completa → propuesta más pequeña → que Rappi ponga una parte → prueba gratis). No se rinde ante la primera negativa. PARCIAL: propone 1-2 alternativas pero acepta el no con relativa facilidad si el aliado insiste. NO EJECUTADO: acepta el primer "no" sin alternativas. Cierra sin resolver la objeción.
- persistencia_no_invasiva (2 pts): Sabe cuándo parar. Si el aliado rechaza 3 caminos, cierra profesionalmente con un siguiente paso futuro en lugar de forzar. PARCIAL: persiste más allá de lo razonable o de forma que incomoda al aliado. NO EJECUTADO: se rinde demasiado pronto (1 intento) o insiste de forma agresiva sin leer la situación.

═══════════════════════════════════════════════════════
C4 — ESCUCHA ACTIVA Y EMPATÍA (15 pts)
═══════════════════════════════════════════════════════
Escucha activa tiene dos componentes inseparables: (1) la persona habla y no la interrumpes; (2) lo que acabas de decir, te hago saber que yo te escuché, te valido y te entiendo.

C4.1 — No interrumpe y da espacio real (5 pts):
- aliado_habla_40pct (3 pts): Hace preguntas abiertas y espera. El aliado habla al menos el 40% del tiempo total, especialmente en la fase de diagnóstico. Silencios intencionales. PARCIAL: el aliado habla entre 25-40% del tiempo; interrupciones menores ocasionales. NO EJECUTADO: el farmer habla más del 70% del tiempo. El aliado apenas puede intervenir. Interrupciones frecuentes.
- silencios_estrategicos (2 pts): Después de pregunta clave o propuesta, guarda silencio y espera respuesta sin llenarlo. Los silencios generan reflexión. PARCIAL: hace preguntas pero las responde él mismo antes de que el aliado conteste, o llena silencios con datos innecesarios. NO EJECUTADO: habla de forma continua sin dar espacio para que el aliado reflexione o responda.
REGLA 40/60: Si el farmer habla más del 60% del tiempo total de la llamada, C4.1 no puede superar 2 pts.

C4.2 — Valida y reformula lo que escucha (6 pts):
- demuestra_escucha (3 pts): Usa los términos y contexto específicos del aliado. Lo que dijo el aliado modificó el pitch. La conversación no es lineal ni rígida. PARCIAL: hace pequeños ajustes superficiales pero sigue el mismo guión independientemente de las respuestas. NO EJECUTADO: sigue un guión lineal. Lo que dice el aliado no modifica la dirección de la llamada.
- verifica_comprension (3 pts): Confirma activamente que el aliado entendió lo que le explicó: "¿Te queda claro cómo funciona?", "¿tienes alguna duda?". No asume que el silencio es comprensión. PARCIAL: hace alguna verificación pero de forma mecánica o al final de bloques largos de información. NO EJECUTADO: no verifica la comprensión del aliado en ningún momento. Habla sin pausas de verificación.

C4.3 — Empatía y conexión humana (4 pts):
- interes_genuino (2 pts): Demuestra interés real por la situación del aliado como persona y empresario. "¿Cómo estás?" genuino al inicio o comentarios que muestran contexto más allá de los números. PARCIAL: tono profesional pero completamente transaccional. Se siente como transacción, no conversación. NO EJECUTADO: frialdad o distancia emocional. El aliado es tratado como número, no como persona.
- adapta_tono_lenguaje (2 pts): Ajusta vocabulario, ejemplos y nivel de detalle técnico según el perfil del aliado. Usa analogías relevantes para su contexto específico. PARCIAL: usa el mismo lenguaje técnico o con siglas independientemente del perfil del aliado. No ajusta la comunicación. NO EJECUTADO: usa jerga técnica excesiva o siglas que confunden al aliado, o lenguaje demasiado básico que no conecta.

═══════════════════════════════════════════════════════
C5 — CIERRE Y SEGUIMIENTO (10 pts)
═══════════════════════════════════════════════════════
El farmer cierra con compromiso concreto, fecha definida y responsabilidades claras para ambas partes. El aliado sale de la llamada sabiendo exactamente qué sigue.

C5.1 — Compromiso concreto (6 pts):
- compromiso_fecha (4 pts): Al cierre, establece un compromiso específico según etapa: (Descubrimiento) fecha de la siguiente llamada con propuesta lista. (Propuesta) fecha de decisión o activación. (Cierre) monto de inversión confirmado, fecha de activación. PARCIAL: menciona que habrá un siguiente paso pero sin fecha concreta o sin definir quién hace qué. NO EJECUTADO: la llamada termina sin ningún compromiso explícito de ninguna de las dos partes.
- recapitula_acuerdos (2 pts): Resume verbalmente los puntos acordados antes de cerrar la llamada. El aliado tiene claridad total sobre qué se acordó y qué sigue. PARCIAL: hace un resumen parcial que omite puntos importantes. NO EJECUTADO: cierra la llamada sin ningún resumen de lo acordado.
PENALIZACIÓN C5: -2 pts si cierra sin recapitular los acuerdos clave.
REGLA POR ETAPA: Descubrimiento → cierre exitoso = agendar llamada de propuesta con fecha/hora (máx 7 pts). Propuesta → obtener decisión o fecha (10 pts). Cierre → activación confirmada (10 pts).

C5.2 — Responsabilidades y métricas de éxito (4 pts):
- responsabilidades_ambos (2 pts): Especifica qué hará el farmer (enviar propuesta, activar campaña, compartir reporte) Y qué hará el aliado (revisar propuesta, confirmar inversión, actualizar catálogo). Responsabilidades explícitas para los dos. PARCIAL: menciona lo que hará el farmer pero no establece ninguna acción concreta del aliado. NO EJECUTADO: no define responsabilidades de ninguna de las dos partes. El cierre es ambiguo.
- metrica_exito (2 pts): Define cómo van a saber si funcionó: cuánto debería ganar por cada peso invertido, cuántos pedidos nuevos espera, qué porcentaje de mejora buscan, o cuándo van a revisar juntos los resultados. PARCIAL: menciona que "verán cómo va" o que "harán seguimiento" sin definir qué van a medir exactamente. NO EJECUTADO: no define ningún número de éxito ni fecha para revisar si funcionó.

═══════════════════════════════════════════════════════
C6 — COMPONENTES CONDUCTUALES (10 pts)
═══════════════════════════════════════════════════════
Estos componentes revelan cómo el farmer se comporta bajo condiciones adversas. Se observan especialmente cuando el aliado es difícil, cuando el tiempo apremia, o cuando la conversación se desvía del objetivo.

C6.1 — Tolerancia a la frustración (4 pts):
- compostura_aliado_dificil (2 pts): Se mantiene profesional, calmado y positivo ante rechazo, agresividad, sarcasmo o indiferencia. No se pone defensivo ni cambia su tono. PARCIAL: se altera levemente ante la presión pero se recupera y retoma el control de la conversación. NO EJECUTADO: pierde la compostura, se pone defensivo, sube el tono, o desiste ante el primer rechazo sin intentar retomar.
- resiliencia_no_repetido (2 pts): Ante múltiples rechazos consecutivos, no se rinde ni se frustra visiblemente. Busca otro ángulo, reformula, o cierra profesionalmente con un siguiente paso futuro. PARCIAL: muestra signos de frustración (tono, ritmo, respuestas más cortas) pero logra mantener la estructura mínima. NO EJECUTADO: la calidad de la conversación cae notoriamente después del primer o segundo rechazo. Pierde energía, estructura o motivación visible.

C6.2 — Resolución bajo presión de tiempo (3 pts):
- gestiona_tiempo (2 pts): Completa las etapas críticas (diagnóstico mínimo → propuesta → cierre) dentro del tiempo disponible. Prioriza lo esencial. PARCIAL: muestra signos de presión por el tiempo pero logra cumplir con las etapas mínimas, aunque con menor profundidad. NO EJECUTADO: la presión de tiempo hace que omita etapas clave o que su calidad caiga notoriamente.
- calidad_bajo_presion (1 pt): La calidad de los argumentos y la estructura no se deterioran por la presión de tiempo. Sabe qué sacrificar y qué no. PARCIAL: la calidad disminuye pero el resultado final es aceptable. NO EJECUTADO: la calidad de la conversación colapsa bajo presión. Los argumentos se vuelven superficiales o contradictorios.

C6.3 — Control y manejo de la conversación (3 pts):
- mantiene_estructura (2 pts): Cuando el aliado cambia de tema o introduce objeciones, maneja el desvío y retoma el objetivo de forma natural. La conversación tiene estructura clara: inicio → diagnóstico → propuesta → cierre. PARCIAL: mantiene el hilo la mayor parte del tiempo pero pierde el control ante 1-2 desvíos del aliado. NO EJECUTADO: pierde el hilo ante objeciones o desvíos. La llamada no tiene estructura clara y no llega a un cierre.
- control_no_monopolio (1 pt): Demuestra control a través de la estructura y los compromisos logrados — no a través de dominar el monólogo. Conversación bidireccional con compromiso claro. Control de conversación es diferente a dominar el tiempo de habla. Un farmer que habla el 70% del tiempo no tiene control; el control real se evidencia en que la llamada sigue la estructura planificada y termina con un compromiso. PARCIAL: el farmer confunde control con hablar más. Domina el tiempo de habla pero la llamada no llega a un cierre concreto. NO EJECUTADO: el control lo tiene el aliado. La llamada termina donde el aliado quiso, no donde el farmer planificó.

═══════════════════════════════════════════════════════
BANDAS DE DESEMPEÑO
═══════════════════════════════════════════════════════
- ELITE: 78–87 pts — Farmer listo para mentoría de pares. Dominio completo del ciclo comercial consultivo.
- SÓLIDO: 65–77 pts — Ejecuta el ciclo correctamente. Pequeñas áreas de mejora en calidad o conocimiento del producto.
- EN DESARROLLO: 52–64 pts — Base correcta, pero con brechas sistémicas en diagnóstico o propuesta. Requiere acompañamiento.
- REQUIERE COACHING: 35–51 pts — Errores de estructura que afectan el resultado comercial. Plan de mejora obligatorio.
- CRÍTICO: 0–34 pts — No ejecuta el ciclo básico. Requiere reentrenamiento inmediato.

═══════════════════════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════════════════════
RESPONDE ÚNICAMENTE CON JSON VÁLIDO con esta estructura exacta:
{
  "stage": "Descubrimiento|Propuesta|Cierre",
  "metrics": {
    "C1": {
      "score": 0, "max": 14,
      "variables": {
        "identifica_decisor": 0, "mapea_decision": 0, "adapta_multiple": 0,
        "catalogo": 0, "operaciones": 0, "rendimiento_publicidad": 0
      },
      "penalties": 0, "evidence": "cita textual de la transcripción", "feedback": "qué faltó y cómo mejorar"
    },
    "C2": {
      "score": 0, "max": 18,
      "variables": {
        "palanca_correcta": 0, "no_vende_innecesario": 0,
        "propuesta_personalizada": 0, "logica_roi": 0,
        "urgencia_real": 0, "urgencia_especifica": 0
      },
      "penalties": 0, "evidence": "cita textual de la transcripción", "feedback": "qué faltó y cómo mejorar"
    },
    "C3": {
      "score": 0, "max": 20,
      "variables": {
        "anticipa_objeciones": 0, "anticipacion_natural": 0,
        "obj_precio": 0, "obj_como_funciona": 0, "obj_ya_lo_intente": 0, "obj_no_decide": 0, "obj_dejeme_pensar": 0,
        "tres_caminos": 0, "persistencia_no_invasiva": 0
      },
      "penalties": 0, "evidence": "cita textual de la transcripción", "feedback": "qué faltó y cómo mejorar"
    },
    "C4": {
      "score": 0, "max": 15,
      "variables": {
        "aliado_habla_40pct": 0, "silencios_estrategicos": 0,
        "demuestra_escucha": 0, "verifica_comprension": 0,
        "interes_genuino": 0, "adapta_tono_lenguaje": 0
      },
      "penalties": 0, "evidence": "cita textual de la transcripción", "feedback": "qué faltó y cómo mejorar"
    },
    "C5": {
      "score": 0, "max": 10,
      "variables": {
        "compromiso_fecha": 0, "recapitula_acuerdos": 0,
        "responsabilidades_ambos": 0, "metrica_exito": 0
      },
      "penalties": 0, "evidence": "cita textual de la transcripción", "feedback": "qué faltó y cómo mejorar"
    },
    "C6": {
      "score": 0, "max": 10,
      "variables": {
        "compostura_aliado_dificil": 0, "resiliencia_no_repetido": 0,
        "gestiona_tiempo": 0, "calidad_bajo_presion": 0,
        "mantiene_estructura": 0, "control_no_monopolio": 0
      },
      "penalties": 0, "evidence": "cita textual de la transcripción", "feedback": "qué faltó y cómo mejorar"
    }
  },
  "total": 0,
  "band": "CRÍTICO|REQUIERE COACHING|EN DESARROLLO|SÓLIDO|ELITE",
  "summary": "resumen ejecutivo de 2-3 oraciones sobre la llamada del farmer",
  "key_strengths": ["fortaleza 1", "fortaleza 2"],
  "priority_actions": ["acción prioritaria 1", "acción prioritaria 2", "acción prioritaria 3"]
}`

// ── Dynamic rubric from DB ─────────────────────────────────────────────────
// Reads evaluation_rubric rows (section='roleplay') and builds an "updated
// criteria" block appended to RUBRIC_SYSTEM_PROMPT so edits in the admin UI
// are respected at evaluation time. Falls back gracefully if DB is empty.
interface RubricRow {
  description: string
  name: string
  weight: number
  scale: { score: number; label: string; description: string }[]
}

async function buildDynamicCriteria(
  supabase: ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>
): Promise<string> {
  const { data: rows } = await supabase
    .from('evaluation_rubric')
    .select('description, name, weight, scale')
    .eq('section', 'roleplay')
    .eq('active', true)
    .order('position', { ascending: true })

  if (!rows || rows.length === 0) return ''

  const varRows = (rows as RubricRow[]).filter(r => !r.description.endsWith('_PENALTY'))
  const penRows = (rows as RubricRow[]).filter(r => r.description.endsWith('_PENALTY'))

  // Group variables by metric
  const groups: Record<string, RubricRow[]> = {}
  for (const row of varRows) {
    if (!groups[row.description]) groups[row.description] = []
    groups[row.description].push(row)
  }

  if (Object.keys(groups).length === 0) return ''

  let out = '\n\n═══════════════════════════════════════════════════════\n'
  out += 'CRITERIOS DE EVALUACIÓN ACTUALIZADOS\n'
  out += '(Aplica ESTOS criterios en lugar de los descritos arriba para cada métrica listada)\n'
  out += '═══════════════════════════════════════════════════════\n'

  for (const [metric, vars] of Object.entries(groups).sort()) {
    const totalPts = vars.reduce((s, r) => s + Number(r.weight), 0)
    out += `\n${metric} — ${totalPts} pts:\n`

    for (const v of vars) {
      const completo  = v.scale.find(s => s.label === 'COMPLETO')?.description?.trim()
      const parcial   = v.scale.find(s => s.label === 'PARCIAL')?.description?.trim()
      const noEjec    = v.scale.find(s => s.label === 'NO EJECUTADO')?.description?.trim()
      out += `- ${v.name} (${v.weight} pts):\n`
      if (completo)  out += `  COMPLETO (${v.weight} pts): ${completo}\n`
      if (parcial)   out += `  PARCIAL (${Math.round(Number(v.weight) / 2)} pts): ${parcial}\n`
      if (noEjec)    out += `  NO EJECUTADO (0 pts): ${noEjec}\n`
    }

    // Penalties for this metric
    const metricPens = penRows.filter(r => r.description === `${metric}_PENALTY`)
    for (const pen of metricPens) {
      const cond = pen.scale[0]?.description?.trim()
      out += `PENALIZACIÓN: ${pen.weight} pts — ${pen.name}`
      if (cond) out += `. Aplica cuando: ${cond}`
      out += '\n'
    }
  }

  return out
}

async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY!

  // Submit transcription job
  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      speech_models: ['universal-2'],
      speaker_labels: true,
    }),
  })

  // Distinguish HTTP errors before attempting to parse JSON
  if (!submitRes.ok) {
    const errText = await submitRes.text()
    if (submitRes.status === 401) throw new Error(`AssemblyAI: API key inválida (401). Verificar ASSEMBLYAI_API_KEY.`)
    if (submitRes.status === 429) throw new Error(`AssemblyAI: rate limit alcanzado (429). Reintentar en unos minutos.`)
    throw new Error(`AssemblyAI submit failed (${submitRes.status}): ${errText}`)
  }

  const { id, error: submitError } = await submitRes.json()
  if (submitError) throw new Error(`AssemblyAI submit error: ${submitError}`)

  // Poll until done
  for (let i = 0; i < 80; i++) {  // 80 × 3s = 240s max — fits within 300s Vercel Hobby limit
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    })
    const data = await pollRes.json()
    if (data.status === 'completed') {
      // Format with speaker labels if available.
      // In a Vapi roleplay call, the agent (ALIADO) always initiates the conversation,
      // so AssemblyAI assigns Speaker A = ALIADO and Speaker B = CANDIDATO.
      // If only one speaker is detected, fall back to plain text.
      if (data.utterances?.length > 0) {
        const speakers = [...new Set(data.utterances.map((u: { speaker: string }) => u.speaker))] as string[]
        const firstSpeaker = data.utterances[0]?.speaker as string
        // If both speakers present: first speaker = ALIADO (agent opens the call)
        // If only one speaker: label them CANDIDATO (mic-only recording)
        const speakerLabel = (sp: string): string => {
          if (speakers.length === 1) return 'CANDIDATO'
          return sp === firstSpeaker ? 'ALIADO' : 'CANDIDATO'
        }
        return data.utterances
          .map((u: { speaker: string; text: string }) => `[${speakerLabel(u.speaker)}]: ${u.text}`)
          .join('\n')
      }
      return data.text || ''
    }
    if (data.status === 'error') throw new Error(`AssemblyAI error: ${data.error}`)
  }
  throw new Error('AssemblyAI transcription timed out')
}

export async function POST(req: NextRequest) {
  try {
    const { submissionId, caseContext, force = false } = await req.json()
    if (!submissionId) return Response.json({ error: 'submissionId requerido' }, { status: 400 })

    const supabase = createAdminClient()

    // Get submission — also read roleplay_score for idempotency check
    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .select('id, roleplay_video_path, roleplay_completed, roleplay_transcript, roleplay_score, math_score_pct, caso_score_pct, enabled_sections, challenge_weights')
      .eq('id', submissionId)
      .single()

    if (subErr || !sub) return Response.json({ error: 'Submission no encontrada' }, { status: 404 })

    // Idempotency: skip if already evaluated (unless force=true)
    if (!force && sub.roleplay_score != null) {
      console.log('[evaluate-roleplay] already evaluated, skipping (use force=true to re-evaluate)')
      return Response.json({ skipped: true, roleplay_score: sub.roleplay_score })
    }

    // If transcript already set (from Vapi/Arbol), skip AssemblyAI
    let transcript = sub.roleplay_transcript || ''
    if (!transcript) {
      // Need video to transcribe via AssemblyAI
      if (!sub.roleplay_video_path) return Response.json({ error: 'No hay grabación ni transcripción de roleplay para este candidato' }, { status: 400 })

      // Get signed URL for the video
      const { data: urlData } = await supabase.storage
        .from('assessment-videos')
        .createSignedUrl(sub.roleplay_video_path, 3600)
      if (!urlData?.signedUrl) return Response.json({ error: 'No se pudo obtener la URL del video' }, { status: 500 })

      console.log('[evaluate-roleplay] transcribing via AssemblyAI...')
      transcript = await transcribeWithAssemblyAI(urlData.signedUrl)
      if (!transcript) return Response.json({ error: 'La transcripción está vacía' }, { status: 422 })

      // Save transcript to DB immediately — so retries can skip AssemblyAI even if Claude fails later
      await supabase.from('submissions').update({ roleplay_transcript: transcript }).eq('id', submissionId)
      console.log('[evaluate-roleplay] transcript saved to DB')
    } else {
      console.log('[evaluate-roleplay] using existing transcript (Vapi/Arbol/previous attempt)')
    }

    // Evaluate with Claude
    console.log('[evaluate-roleplay] evaluating with Claude...')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    // Load dynamic rubric criteria from DB (admin-editable)
    const dynamicCriteria = await buildDynamicCriteria(supabase)
    if (dynamicCriteria) {
      console.log('[evaluate-roleplay] using dynamic rubric from DB')
    }

    const caseSection = caseContext
      ? `\n\nCONTEXTO DEL CASO ASIGNADO AL CANDIDATO:\n${caseContext}\n\nUsa este contexto para verificar si los datos que el farmer cita son coherentes con el restaurante real. Penaliza cifras inventadas que no correspondan a este contexto.`
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: RUBRIC_SYSTEM_PROMPT + dynamicCriteria,
      messages: [{
        role: 'user',
        content: `Evalúa la siguiente transcripción de roleplay usando el framework de Evaluación v4.0 (C1-C6). Recuerda: el FARMER es el candidato evaluado, el ALIADO es el dueño del restaurante. Responde SOLO con el JSON estructurado.${caseSection}\n\nTRANSCRIPCIÓN:\n${transcript}`,
      }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[evaluate-roleplay] No JSON in Claude response:', rawContent.slice(0, 300))
      return Response.json({ error: 'Claude no retornó JSON válido' }, { status: 500 })
    }

    let evaluation: Record<string, unknown>
    try {
      evaluation = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('[evaluate-roleplay] JSON parse failed:', parseErr, 'raw:', rawContent.slice(0, 300))
      return Response.json({ error: 'No se pudo parsear la respuesta de Claude' }, { status: 500 })
    }

    // Schema validation — ensure required fields exist before writing to DB
    if (typeof evaluation.total !== 'number') {
      console.error('[evaluate-roleplay] Schema invalid — missing total:', JSON.stringify(evaluation).slice(0, 300))
      return Response.json({ error: 'Respuesta de Claude incompleta: falta campo "total"' }, { status: 500 })
    }
    if (!evaluation.band || typeof evaluation.band !== 'string') {
      console.error('[evaluate-roleplay] Schema invalid — missing band')
      return Response.json({ error: 'Respuesta de Claude incompleta: falta campo "band"' }, { status: 500 })
    }
    if (!evaluation.metrics || typeof evaluation.metrics !== 'object') {
      console.error('[evaluate-roleplay] Schema invalid — missing metrics')
      return Response.json({ error: 'Respuesta de Claude incompleta: falta campo "metrics"' }, { status: 500 })
    }

    // Save to DB
    const { error: updateErr } = await supabase
      .from('submissions')
      .update({
        roleplay_transcript:   transcript,
        roleplay_score:        evaluation.total,
        roleplay_band:         evaluation.band,
        roleplay_evaluation:   evaluation,
        roleplay_evaluated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateErr) {
      console.error('[evaluate-roleplay] DB update error:', updateErr.message)
      return Response.json({ error: updateErr.message }, { status: 500 })
    }

    // Recalculate and persist overall_score_pct including the new roleplay score.
    // normalizedWeights handles any enabled_sections combination correctly.
    try {
      const { normalizedWeights } = await import('@/lib/challenges')
      const enabled = (sub.enabled_sections as string[] | null) ?? ['roleplay', 'caso', 'math']
      const weights = normalizedWeights(enabled as import('@/lib/challenges').SectionId[], (sub.challenge_weights as Record<string, number> | null) ?? undefined)
      const scores: Record<string, number> = {
        roleplay:     evaluation.total as number,
        caso:         (sub as Record<string, unknown>).caso_score_pct as number ?? 0,
        math:         (sub as Record<string, unknown>).math_score_pct as number ?? 0,
      }
      const newOverall = Math.round(
        enabled.reduce((sum, sec) => {
          const w = weights[sec as import('@/lib/challenges').SectionId] ?? 0
          return sum + (scores[sec] ?? 0) * (w / 100)
        }, 0)
      )
      await supabase.from('submissions').update({ overall_score_pct: newOverall }).eq('id', submissionId)
      console.log(`[evaluate-roleplay] overall_score_pct updated to ${newOverall}`)
    } catch (overallErr) {
      console.warn('[evaluate-roleplay] could not update overall_score_pct:', overallErr)
    }

    return Response.json({ evaluation, transcript })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[evaluate-roleplay] error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
