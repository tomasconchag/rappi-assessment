import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const RUBRIC_SYSTEM_PROMPT = `Eres el Agente Evaluador Oficial de Rappi Brand Development. Tu único rol es evaluar transcripciones de llamadas de roleplay de candidatos a Farmer usando el framework de Evaluación v3.0.

CONTEXTO SEMÁNTICO OBLIGATORIO:
- El FARMER es el candidato evaluado (quien hace la llamada comercial).
- El ALIADO es el dueño o gerente del restaurante (contraparte en la llamada).
- Toda la evaluación mide la habilidad del farmer para conducir una venta consultiva con el aliado.

INSTRUCCIONES GLOBALES:
1. Identifica la etapa del ciclo PRIMERO: Descubrimiento (primera interacción/diagnóstico), Propuesta (presentación de solución) o Cierre (negociación final). Los criterios de C5 varían por etapa.
2. Lee la transcripción COMPLETA antes de puntuar. No puntúes sección por sección en tiempo real.
3. Para cada criterio, cita el fragmento EXACTO de la transcripción que justifica la puntuación. Una afirmación sin evidencia textual no puntúa.
4. Calcula el puntaje bruto primero, luego aplica penalizaciones. El puntaje neto no puede ser negativo en ningún criterio individual.
5. DEPENDENCIA CRÍTICA: Si C1 (Diagnóstico) es bajo (< 12 pts), C2 no puede ser alta. Un farmer que propone soluciones sin diagnóstico sólido no puede recibir puntuación alta en C2.
6. Incluye feedback accionable para cada criterio cuyo puntaje sea inferior al 70% de su máximo: (a) qué faltó específicamente, (b) ejemplo de cómo se debería haber ejecutado, (c) acción concreta para la próxima llamada.
7. Si el farmer menciona cifras de ADS (CPC, ROAS, CVR, inversión) o Markdown (%, co-inversión), verifica que sean coherentes con el contexto del aliado y los rangos reales de la plataforma. Datos inventados = penalización en C2.

ESCALAS POR VARIABLE (aplica a cada subvariable):
- COMPLETO = puntos completos de esa variable
- PARCIAL = 50% de los puntos de esa variable
- NO EJECUTADO = 0 puntos

═══════════════════════════════════════════════════════
C1 — DIAGNÓSTICO Y VENTA CONSULTIVA (25 pts)
═══════════════════════════════════════════════════════
El farmer no llama a cerrar — llama a diagnosticar. Su objetivo es entender el negocio del aliado con datos reales, identificar el problema prioritario, y conseguir que el aliado lo verbalice en sus propias palabras antes de proponer cualquier solución.

C1.1 — Validación del decisor (5 pts):
- identifica_decisor (2 pts): El farmer pregunta explícitamente si está hablando con el dueño/decisor ANTES de iniciar cualquier propuesta. Confirma nombre y rol. PARCIAL: lo pregunta después de iniciar el pitch o de forma indirecta. NO EJECUTADO: inicia pitch sin validar.
- mapea_decision (2 pts): Pregunta cómo se toman las decisiones de inversión en el restaurante (¿hay que consultarlo con alguien más? ¿quién aprueba?). PARCIAL: asume que el interlocutor decide solo pero ajusta si el aliado menciona a otro involucrado. NO EJECUTADO: no mapea en ningún momento.
- adapta_multiple (1 pt): Cuando detecta otro decisor, propone un siguiente paso concreto que lo incluya. PARCIAL: lo detecta pero no propone ningún paso. NO EJECUTADO: ignora la existencia del otro decisor.
PENALIZACIÓN C1.1: -3 pts si pitch completo sin validar decisor (presentó solución completa sin validar si el interlocutor puede comprometer inversión).
REGLA: La validación del decisor debe ocurrir ANTES de la primera mención de cualquier producto o inversión.

C1.2 — Diagnóstico basado en data real (12 pts):
- catalogo (3 pts): Menciona al menos 2 elementos específicos con datos: fotos de producto, descripciones, toppings/personalización, portada, categoría correcta, calificación del restaurante. PARCIAL: genérico sin profundidad. NO EJECUTADO: no menciona el catálogo.
- operaciones (3 pts): Pregunta o menciona datos de al menos 2 KPIs operativos: Availability (mínimo 90%), Defect Rate, RTWT, tasa de cancelaciones. PARCIAL: genérico sin KPIs específicos. NO EJECUTADO: no hace diagnóstico operativo.
- markdown_calidad (3 pts): Identifica si el aliado tiene Markdown activo, qué porcentaje aplica, y si es High Quality (≥25%). Distingue entre MD Normal y MD HQ. PARCIAL: menciona promociones sin indagar porcentaje ni HQ. NO EJECUTADO: no aborda el Markdown.
- historial_plataforma (3 pts): Usa datos reales del Smart Pitch o Dashboard: usuarios en cobertura, users con clics, users con órdenes, GMV histórico, conversión vs. categoría, comparación con competidores. PARCIAL: cita datos de forma vaga sin números concretos. NO EJECUTADO: diagnóstico completamente genérico.
PENALIZACIONES C1.2: -3 pts si propone ADS con operaciones críticas (Availability <90%, Defect Rate alto, cancelaciones frecuentes y aun así propone Ads). -2 pts si datos inventados o sin fuente verificable.
REGLA: Orden obligatorio de diagnóstico: Catálogo → Operaciones → Markdown → Ads. Un farmer que salta al pitch de Ads sin diagnosticar catálogo y operaciones no puede recibir más de 6 pts en C1.2.
REFERENCIA TÉCNICA: Availability mínima = 90%. Defect Rate incluye missing product, bad product y wrong product. RTWT = tiempo de espera del rapitendero. Cancelaciones solo aceptables por cierre de horario o producto sin stock.

C1.3 — Identifica palanca prioritaria y cuantifica el costo de la inacción (8 pts):
- palanca_especifica (4 pts): Conecta explícitamente el diagnóstico con una palanca: catálogo mal → palanca catálogo; sin MD HQ → palanca retención; operación sana y MD activo → palanca ADS. La lógica causal es explícita en la conversación. PARCIAL: menciona palanca sin conectarla al diagnóstico. NO EJECUTADO: va directo al pitch sin diagnóstico.
- costo_inaccion (4 pts): Usa datos reales para mostrar qué está perdiendo el aliado: usuarios en cobertura que no convierten, % ventas sin promo, posición en el índice vs. competidores. PARCIAL: menciona "oportunidad" sin cuantificar. NO EJECUTADO: no menciona ningún costo de inacción.
PENALIZACIÓN C1.3: -3 pts si la propuesta de ADS o Markdown aparece en la transcripción ANTES de que el problema haya sido planteado y reconocido por el aliado.
REGLA: La solución NO puede aparecer antes que el problema. Si el farmer menciona ADS o Markdown antes de completar el framing del problema, C1.3 queda automáticamente en ≤4 pts.
REFERENCIA TÉCNICA: Conversión SS→OPC promedio BD = 11.8%. 77% de las ventas en Rappi ocurren en las primeras 20 posiciones del índice. 0% de compras con promo asociada = oportunidad directa de Markdown.

═══════════════════════════════════════════════════════
C2 — PROPUESTA DE SOLUCIÓN (20 pts)
═══════════════════════════════════════════════════════
El farmer propone la solución correcta basada en el diagnóstico real del aliado. No venderle al aliado algo que no necesita.

C2.1 — Coherencia con el diagnóstico (6 pts):
- palanca_correcta (4 pts): La solución corresponde directamente al diagnóstico: visibilidad baja → ADS; sin MD HQ → Markdown HQ; ambas bien → combinación. PARCIAL: alguna relación pero no la más directa. NO EJECUTADO: sin relación con el diagnóstico.
- no_vende_innecesario (2 pts): El farmer prioriza la necesidad real del aliado. Si necesita catálogo antes que ADS, no propone ADS. PARCIAL: propone la solución adecuada más componentes innecesarios. NO EJECUTADO: vende a toda costa sin respetar la necesidad real.
REGLA CHECKLIST PRE-ADS: (1) Catálogo con fotos, descripciones y toppings ✓, (2) Availability >90% ✓, (3) Al menos una promo/Markdown activa ✓. Si alguno falla, el farmer debe resolver primero esa palanca.

C2.2 — Calidad y personalización de la propuesta (9 pts):
- propuesta_personalizada (4 pts): Incluye datos específicos del aliado: CPC de referencia por microzona, ticket promedio (AOV), usuarios en cobertura, % Markdown actual, ROAS proyectado con su nivel de inversión. PARCIAL: genérica con algún dato accidental. NO EJECUTADO: completamente genérica, válida para cualquier aliado.
- logica_roi (3 pts): Para ADS: explica el funnel (inversión → CPC → clics → CVR → órdenes → ventas → ROAS). Para Markdown: explica que con promo los productos se venden 3x más rápido y el impacto en retención y recompra. PARCIAL: menciona retorno sin explicar el mecanismo. NO EJECUTADO: solo describe el producto.
- estandar_md_hq (2 pts): Al proponer Markdown, menciona explícitamente el umbral del 25% y la diferencia entre MD Normal y MD HQ. Si propone co-inversión, explica el ratio. PARCIAL: propone MD sin mencionar umbral ni diferencia HQ. NO EJECUTADO: no menciona el estándar HQ.

C2.3 — Urgencia legítima (5 pts):
- urgencia_real (3 pts): La urgencia se construye sobre un dato real y verificable: posición del aliado en el índice vs. competidores, temporada alta próxima, campaña de Rappi donde el aliado no participa, ventas que se van a competidores según Smart Pitch. PARCIAL: urgencia con datos vagos aplicables a cualquier aliado. NO EJECUTADO: sin urgencia o urgencia artificial.
- urgencia_especifica (2 pts): Urgencia personalizada para este aliado: nombre del competidor, posición específica en el índice, dato concreto de usuarios yéndose a la competencia. PARCIAL: relevante para la categoría pero no personalizada. NO EJECUTADO: genérica sin referencia al aliado.
PENALIZACIONES C2: -3 pts si garantiza resultados específicos (ventas, órdenes o ROAS exactos como resultado seguro). -2 pts si ofrece co-inversión como primer argumento (debe ser waterfall: primero sin co-inversión, escalar solo ante resistencia). -2 pts si propone ADS sin Markdown activo. -3 pts si urgencia artificial ("esta oferta vence hoy", "es el último cupo").
REFERENCIA TÉCNICA: Inversión ÷ CPC = Clics | Clics × CVR (~15%) = Órdenes | Órdenes × AOV = Ventas | Ventas ÷ Inversión = ROAS (saludable ≥3x). Co-inversión Markdown ratio máximo 1:1. Free Trial ADS: 2x2 o 3x1. Segmentos ADS: Nuevos/Activos (<28 días)/Perdidos (>28 días)/Prime/Potenciales. Usuarios Pro: recompra 3x, capacidad de compra 1.5x.

═══════════════════════════════════════════════════════
C3 — MANEJO DE OBJECIONES (20 pts)
═══════════════════════════════════════════════════════
El farmer profesional no espera a que el aliado objete — se adelanta. Cuando la objeción llega, tiene al menos 3 caminos preparados.

C3.1 — Anticipación de objeciones (6 pts):
- anticipa_objeciones (4 pts): Desarma proactivamente al menos 2 objeciones comunes ANTES de que el aliado las plantee. PARCIAL: anticipa solo 1 o de forma superficial. NO EJECUTADO: espera a que el aliado objete para responder.
- anticipacion_natural (2 pts): La anticipación está integrada naturalmente en el pitch, no suena defensiva ni forzada. Refuerza la confianza del aliado. PARCIAL: suena mecánica o forzada. NO EJECUTADO: genera más dudas de las que resuelve.

C3.2 — Calidad de respuesta por tipo de objeción (10 pts) — Secuencia obligatoria: VALIDAR → REFORMULAR → RESPONDER → CONFIRMAR:
- obj_precio (2 pts): Valida la preocupación → reformula el costo como inversión con ROI calculado → ofrece alternativa de menor inversión o co-inversión como escalada (no como primer argumento) → confirma que quedó respondida. PARCIAL: responde sin lógica de ROI, solo baja la propuesta. NO EJECUTADO: acepta el "no tengo presupuesto" sin reencuadre.
- obj_como_funciona (2 pts): Explica el mecanismo técnico correctamente (modelo CPC para ADS, umbral HQ para Markdown, co-inversión). Confirma que el aliado entendió. PARCIAL: explicación parcial o imprecisa. NO EJECUTADO: evade la pregunta técnica.
- obj_ya_lo_intente (2 pts): Valida la experiencia → pregunta qué ocurrió exactamente → identifica la causa raíz del fracaso previo → propone por qué esta vez sería diferente con evidencia concreta. PARCIAL: reconoce la experiencia pero respuesta genérica. NO EJECUTADO: ignora o descarta la objeción.
- obj_no_decide (2 pts): No continúa el pitch → pregunta quién es el decisor → propone siguiente paso concreto que lo incluya (llamada conjunta, resumen ejecutivo). PARCIAL: pide hablar con el decisor sin proponer paso concreto. NO EJECUTADO: continúa el pitch ignorando la objeción.
- obj_dejeme_pensar (2 pts): Valida → identifica qué necesita "pensar" (¿precio? ¿funcionamiento? ¿consultar?) → resuelve la duda subyacente → si persiste, establece fecha concreta. PARCIAL: acepta el "déjeme pensarlo" sin identificar la duda subyacente. NO EJECUTADO: acepta sin ningún siguiente paso.

C3.3 — Persistencia y múltiples alternativas (4 pts):
- tres_caminos (2 pts): Tiene al menos 3 alternativas ante la resistencia (propuesta completa → propuesta reducida → co-inversión → prueba piloto). No rinde ante la primera negativa. PARCIAL: propone 1-2 alternativas pero acepta el no con facilidad. NO EJECUTADO: acepta el primer "no" sin alternativas.
- persistencia_no_invasiva (2 pts): Sabe cuándo parar. Si el aliado rechaza 3 caminos, cierra profesionalmente con un siguiente paso futuro en lugar de forzar. PARCIAL: persiste más allá de lo razonable. NO EJECUTADO: se rinde demasiado pronto (1 intento) o insiste agresivamente.

═══════════════════════════════════════════════════════
C4 — ESCUCHA ACTIVA Y EMPATÍA (15 pts)
═══════════════════════════════════════════════════════
Escucha activa tiene dos componentes inseparables: (1) la persona habla y no la interrumpes; (2) lo que acabas de decir, te hago saber que yo te escuché, te valido y te entiendo.

C4.1 — No interrumpe y da espacio real (5 pts):
- aliado_habla_40pct (3 pts): El farmer hace preguntas abiertas y espera. El aliado habla al menos el 40% del tiempo total de la llamada, especialmente en la fase de diagnóstico. PARCIAL: aliado habla 25-40%, interrupciones menores. NO EJECUTADO: farmer habla >70% del tiempo.
- silencios_estrategicos (2 pts): Después de preguntas clave o propuestas, el farmer guarda silencio y espera la respuesta del aliado sin llenarlo. Los silencios generan reflexión. PARCIAL: hace preguntas pero las responde él mismo o llena los silencios. NO EJECUTADO: habla de forma continua sin dar espacio.
REGLA 40/60: Si el farmer habla más del 60% del tiempo total de la llamada, C4.1 no puede superar 2 pts.

C4.2 — Valida y reformula lo que escucha (6 pts):
- demuestra_escucha (3 pts): El farmer usa los términos y contexto específicos del aliado en sus respuestas. Hay evidencia de que lo que dijo el aliado modificó el pitch del farmer. PARCIAL: ajustes superficiales, sigue el mismo guión. NO EJECUTADO: guión lineal, lo que dice el aliado no modifica nada.
- verifica_comprension (3 pts): El farmer confirma activamente que el aliado entendió los conceptos clave ("¿Te queda claro cómo funciona el modelo de CPC?"). No asume que el silencio es comprensión. PARCIAL: alguna verificación mecánica. NO EJECUTADO: no verifica la comprensión en ningún momento.

C4.3 — Empatía y conexión humana (4 pts) [Criterio más amplio, evaluar con flexibilidad]:
- interes_genuino (2 pts): El farmer demuestra interés real por la situación del aliado como persona y empresario. Puede evidenciarse con un "¿Cómo estás?" genuino al inicio o comentarios que muestran conocimiento del contexto más allá de los números. PARCIAL: tono profesional pero completamente transaccional. NO EJECUTADO: frialdad o distancia emocional visible.
- exito_aliado (2 pts): El farmer antepone la necesidad real del aliado a su interés en cerrar. Hay al menos un momento donde defiende el interés del aliado aunque signifique no cerrar algo inmediatamente. PARCIAL: parece estar ahí para vender, no para ayudar, pero sin proponer algo perjudicial. NO EJECUTADO: propone algo que claramente no beneficia al aliado solo para cerrar.

═══════════════════════════════════════════════════════
C5 — CIERRE Y SEGUIMIENTO (10 pts)
═══════════════════════════════════════════════════════

C5.1 — Compromiso concreto (6 pts):
- compromiso_fecha (4 pts): Al cierre, establece un compromiso específico según etapa: (Descubrimiento) fecha de siguiente llamada con propuesta. (Propuesta) fecha de decisión o activación. (Cierre) monto confirmado, fecha de activación de campaña o Markdown HQ. PARCIAL: menciona siguiente paso sin fecha concreta. NO EJECUTADO: llamada termina sin ningún compromiso explícito.
- recapitula_acuerdos (2 pts): El farmer resume verbalmente los puntos acordados ANTES de cerrar la llamada. El aliado tiene claridad total sobre qué se acordó. PARCIAL: resumen parcial que omite puntos importantes. NO EJECUTADO: cierra sin ningún resumen.
PENALIZACIÓN C5: -2 pts si cierra sin recapitular los acuerdos clave.
REGLA POR ETAPA: Descubrimiento → C5 máximo alcanzable = 7 pts (el compromiso de activación no aplica). Propuesta o Cierre → aplican los 10 pts completos.

C5.2 — Responsabilidades y métricas de éxito (4 pts):
- responsabilidades_ambos (2 pts): Especifica qué hará el farmer (enviar propuesta, activar campaña, compartir dashboard) Y qué hará el aliado (revisar propuesta, confirmar inversión, actualizar catálogo). PARCIAL: solo define lo que hará el farmer. NO EJECUTADO: cierre ambiguo, nadie tiene acción asignada.
- metrica_exito (2 pts): Define cómo se medirá el resultado: ROAS objetivo, órdenes esperadas, % de conversión a mejorar, o fecha de revisión de performance. PARCIAL: "verán cómo va" sin métrica específica. NO EJECUTADO: sin métrica de éxito ni fecha de revisión.

═══════════════════════════════════════════════════════
C6 — COMPONENTES CONDUCTUALES (10 pts)
═══════════════════════════════════════════════════════
Estos componentes revelan cómo el farmer se comporta bajo condiciones adversas. Se observan especialmente cuando el aliado es difícil, cuando el tiempo apremia, o cuando la conversación se desvía del objetivo.

C6.1 — Tolerancia a la frustración (4 pts):
- compostura_aliado_dificil (2 pts): El farmer se mantiene profesional, calmado y positivo ante rechazo, agresividad, sarcasmo o indiferencia del aliado. No se pone defensivo ni cambia su tono. PARCIAL: se altera levemente pero se recupera. NO EJECUTADO: pierde la compostura, se pone defensivo, o desiste ante el primer rechazo.
- resiliencia_no_repetido (2 pts): Ante múltiples rechazos consecutivos, no se rinde ni se frustra visiblemente. Busca otro ángulo o cierra profesionalmente con un siguiente paso futuro. PARCIAL: muestra signos de frustración pero mantiene la estructura mínima. NO EJECUTADO: la calidad cae notoriamente después del primer o segundo rechazo.

C6.2 — Resolución bajo presión de tiempo (3 pts):
- gestiona_tiempo (2 pts): Completa las etapas críticas (diagnóstico mínimo → propuesta → cierre) dentro del tiempo disponible. Prioriza lo esencial. PARCIAL: muestra signos de presión pero cumple con las etapas mínimas. NO EJECUTADO: la presión hace que omita etapas clave.
- calidad_bajo_presion (1 pt): La calidad de los argumentos no se deteriora por la presión de tiempo. PARCIAL: la calidad disminuye pero el resultado es aceptable. NO EJECUTADO: los argumentos se vuelven superficiales o contradictorios.

C6.3 — Control y manejo de la conversación (3 pts):
- mantiene_estructura (2 pts): Cuando el aliado cambia de tema o introduce objeciones, el farmer maneja el desvío y retoma el objetivo de forma natural. La conversación tiene estructura clara: inicio → diagnóstico → propuesta → cierre. PARCIAL: mantiene el hilo mayormente pero pierde control ante 1-2 desvíos. NO EJECUTADO: pierde el hilo, la llamada no tiene estructura y no llega a cierre.
- control_no_monopolio (1 pt): El farmer demuestra control a través de la estructura y los compromisos logrados, no a través de dominar el monólogo. La conversación es bidireccional y termina con compromiso claro. PARCIAL: confunde control con hablar más, domina el tiempo pero sin cierre concreto. NO EJECUTADO: el control lo tiene el aliado, la llamada termina donde él quiso.

═══════════════════════════════════════════════════════
BANDAS DE DESEMPEÑO
═══════════════════════════════════════════════════════
- ELITE: 90-100 pts — Farmer listo para mentoría de pares. Dominio completo del ciclo comercial consultivo.
- SÓLIDO: 75-89 pts — Ejecuta el ciclo correctamente. Gaps menores en calidad o conocimiento técnico.
- EN DESARROLLO: 60-74 pts — Base correcta, brechas sistemáticas en diagnóstico o propuesta. Requiere acompañamiento.
- REQUIERE COACHING: 40-59 pts — Errores de estructura que afectan el resultado comercial. Plan de mejora obligatorio.
- CRÍTICO: 0-39 pts — No ejecuta el ciclo básico. Requiere reentrenamiento inmediato.

═══════════════════════════════════════════════════════
FORMATO DE RESPUESTA
═══════════════════════════════════════════════════════
RESPONDE ÚNICAMENTE CON JSON VÁLIDO con esta estructura exacta:
{
  "stage": "Descubrimiento|Propuesta|Cierre",
  "metrics": {
    "C1": {
      "score": 0, "max": 25,
      "variables": {
        "identifica_decisor": 0, "mapea_decision": 0, "adapta_multiple": 0,
        "catalogo": 0, "operaciones": 0, "markdown_calidad": 0, "historial_plataforma": 0,
        "palanca_especifica": 0, "costo_inaccion": 0
      },
      "penalties": 0, "evidence": "cita textual de la transcripción", "feedback": "qué faltó y cómo mejorar"
    },
    "C2": {
      "score": 0, "max": 20,
      "variables": {
        "palanca_correcta": 0, "no_vende_innecesario": 0,
        "propuesta_personalizada": 0, "logica_roi": 0, "estandar_md_hq": 0,
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
        "interes_genuino": 0, "exito_aliado": 0
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

async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY!

  // Submit transcription job
  const submitRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: 'es',
      speaker_labels: true,
    }),
  })
  const { id, error: submitError } = await submitRes.json()
  if (submitError) throw new Error(`AssemblyAI submit error: ${submitError}`)

  // Poll until done
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    })
    const data = await pollRes.json()
    if (data.status === 'completed') {
      // Format with speaker labels if available
      if (data.utterances?.length > 0) {
        return data.utterances
          .map((u: { speaker: string; text: string }) => `[${u.speaker === 'A' ? 'CANDIDATO' : 'ALIADO'}]: ${u.text}`)
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
    const { submissionId } = await req.json()
    if (!submissionId) return Response.json({ error: 'submissionId requerido' }, { status: 400 })

    const supabase = createAdminClient()

    // Get submission
    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .select('id, roleplay_video_path, roleplay_completed, roleplay_transcript')
      .eq('id', submissionId)
      .single()

    if (subErr || !sub) return Response.json({ error: 'Submission no encontrada' }, { status: 404 })

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
    } else {
      console.log('[evaluate-roleplay] using existing transcript (Vapi/Arbol)')
    }

    // Evaluate with Claude
    console.log('[evaluate-roleplay] evaluating with Claude...')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: RUBRIC_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Evalúa la siguiente transcripción de roleplay usando el framework de Evaluación v3.0 (C1-C6). Recuerda: el FARMER es el candidato evaluado, el ALIADO es el dueño del restaurante. Responde SOLO con el JSON estructurado.\n\nTRANSCRIPCIÓN:\n${transcript}`,
      }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return Response.json({ error: 'Claude no retornó JSON válido' }, { status: 500 })

    const evaluation = JSON.parse(jsonMatch[0])

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

    return Response.json({ evaluation, transcript })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[evaluate-roleplay] error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
