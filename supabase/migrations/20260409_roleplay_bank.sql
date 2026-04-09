-- ── Banco de casos para Role Play ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roleplay_bank (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  difficulty       TEXT NOT NULL,        -- 'Básica' | 'Básica-Media' | 'Media' | 'Media-Alta' | 'Alta' | 'Muy Alta'
  restaurant_name  TEXT NOT NULL,
  owner_name       TEXT NOT NULL,
  owner_gender     TEXT NOT NULL DEFAULT 'm',   -- 'm' | 'f'
  city             TEXT NOT NULL,
  category         TEXT NOT NULL,

  -- Lo que el farmer (tester) ve ANTES de la llamada
  farmer_briefing  TEXT NOT NULL,

  -- Personalidad e instrucciones para el avatar IA
  owner_profile    TEXT NOT NULL,        -- tono, reacciones, motivaciones
  character_brief  TEXT NOT NULL,        -- info oculta que el aliado sabe pero no revela fácilmente
  key_objections   TEXT NOT NULL,        -- objeciones que la IA debe lanzar (texto libre / JSON)

  -- Para la rúbrica de evaluación post-llamada
  trap             TEXT NOT NULL,        -- el error típico del candidato no preparado
  success_path     TEXT NOT NULL,        -- qué debe haber pasado para considerar la llamada exitosa

  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Columna en assessment_configs para seleccionar el caso activo
ALTER TABLE assessment_configs
  ADD COLUMN IF NOT EXISTS active_roleplay_case_id UUID REFERENCES roleplay_bank(id) ON DELETE SET NULL;

-- ── Seed: 6 casos ─────────────────────────────────────────────────────────────
INSERT INTO roleplay_bank (title, difficulty, restaurant_name, owner_name, owner_gender, city, category, farmer_briefing, owner_profile, character_brief, key_objections, trap, success_path, sort_order) VALUES

-- ── CASO 1: Básica ────────────────────────────────────────────────────────────
(
  'Arepería Horacio — La oportunidad que él mismo no ve',
  'Básica',
  'Arepería Horacio',
  'Horacio',
  'm',
  'Bucaramanga',
  'Comidas rápidas / Desayunos',
  'Horacio tiene una arepería que lleva 35 años en Bucaramanga. Montó Rappi hace 4 meses porque su hija lo convenció. Las ventas en plataforma son "decentes" según él, pero estás viendo que está captando menos del 10% de su potencial. Te llamó porque "quiere entender cómo funciona esto mejor."

MÉTRICAS DISPONIBLES:
- Ticket promedio: $16.800 COP
- Órdenes/semana: 48
- Horario en Rappi: Lunes a sábado, 11:00 am – 3:00 pm
- Availability: 97% · RTWT: 8 min · Defect Rate: 3% · Cancelaciones: 1%
- Calificación: 4.6 con 62 reseñas
- Promociones activas: Ninguna
- Ads activos: Ninguno
- Productos en menú: 14 (arepas, jugos, huevos, chocolate)',
  'Horacio, 45 años. Lleva toda la vida en esto — la arepería la fundó su papá y él la heredó. Trabaja desde las 5am, cierra a las 3pm para manejar sus otras cosas. No tiene mucho tiempo para tecnología — su hija le ayuda con el portal. Cuando habla de apps o plataformas dice "eso es muy complicado pa mí". No es desconfiado, es desinformado. Responde bien si lo tratas con respeto y paciencia. Lo que más le importa es que "la gente quede bien atendida." Si algo le implica cambiar su rutina de horarios reacciona con nerviosismo. Tono: cálido, directo, repite las preguntas antes de responder.',
  'El negocio real de Horacio son los desayunos y las onces — su local físico vende el 60% entre 6-10am y 3-5pm. En Rappi solo habilitó el horario de almuerzo porque "así lo configuró mi hija y ya." No sabe que puede cambiar el horario. Tampoco sabe que hay una demanda enorme de desayunos a domicilio en su zona (área universitaria). Nunca ha recibido una explicación de qué son los Ads ni por qué existirían.',
  '1. "Yo no puedo estar pendiente de pedidos a las 6 de la mañana" — responde bien si el farmer le explica que la tablet hace el trabajo automáticamente.
2. "Eso de la publicidad vale plata, ¿y si no funciona?" — necesita ver el ROI explicado en pesos, no en porcentajes.
3. "Mis arepas no necesitan descuento, son buenas" — acepta la idea si se le enmarca como "darles una probada a nuevos clientes", no como "bajar el precio".',
  'Ir directo a vender Ads sin haber diagnosticado el horario primero. Si el farmer propone pagar publicidad para un horario de 4 horas de almuerzo, está resolviendo el problema equivocado.',
  '1. Descubrir que el horario no cubre los momentos pico reales del negocio.
2. Proponer ampliar horario a 6am–5pm (o mínimo 7am–5pm).
3. Proponer una promoción de bienvenida simple (15% primer pedido) para generar reseñas en los nuevos horarios.
4. Los Ads solo como paso 2, una vez que el horario esté activo — no antes.',
  1
),

-- ── CASO 2: Básica-Media ──────────────────────────────────────────────────────
(
  'Fritanga El Gordo — El satisfecho que no sabe cuánto está dejando',
  'Básica-Media',
  'Fritanga El Gordo',
  'Horacio',
  'm',
  'Cali',
  'Fritanga / Comidas rápidas',
  'Horacio lleva 2 años en Rappi y está satisfecho. Vende bien, tiene buena calificación, nunca ha tenido problemas. Te recibió en reunión porque "la señorita de Rappi insistió mucho." Su actitud inicial es "yo estoy bien, no necesito nada."

MÉTRICAS DISPONIBLES:
- Ticket promedio: $28.500 COP
- Órdenes/semana: 140
- Ventas netas/semana: $3.990.000 COP
- Horario: Lunes a domingo, 11am – 10pm
- Availability: 94% · RTWT: 11 min · Defect Rate: 5% · Cancelaciones: 2%
- Calificación: 4.5 con 380 reseñas
- Promociones activas: 5% de descuento en toda la carta para todos los usuarios · Retorno: 6X
- Ads activos: Ninguno
- Productos en menú: 31

DATO ADICIONAL: Los competidores directos en su zona (2 fritangas similares) promedian 210–230 órdenes/semana.',
  'Horacio, 45 años. Montó la fritanga con su esposa hace 12 años. Le fue bien siempre con esfuerzo, no con estrategia. Tiene mentalidad de "si no está roto no lo toques." Cuando algo no funciona lo descarta definitivamente. En realidad sí probó descuentos pero mal calibrados (5%, que casi no mueve aguja). No lo sabe. Es agradable pero si siente que le estás perdiendo el tiempo se pone impaciente.',
  'Horacio no sabe que su descuento del 5% casi no mueve pedidos de usuarios normales (el umbral de conversión está alrededor del 15%). El retorno de 6X que ve en su dashboard se lo atribuye a su calidad, no al descuento. Tampoco sabe que tiene un déficit de ~70-90 órdenes/semana respecto a sus competidores — no tiene ese benchmark. Si se le muestra el comparativo, reacciona con sorpresa genuina y algo de defensiva ("eso no puede ser cierto").',
  '1. "Yo ya tengo descuento y funciona" — no sabe que el 5% no es suficiente; hay que mostrarle el mecanismo del umbral de conversión.
2. "¿Y si subo el descuento bajo el margen?" — necesita que el farmer le muestre la ecuación volumen × margen vs. volumen actual × margen actual.
3. "Nunca he pagado publicidad y estoy bien" — el contragolpe es: tu competencia tiene 70 órdenes más por semana que tú.',
  'Proponer Ads antes de arreglar la promoción. Si el farmer recomienda activar pauta sin haber diagnosticado que el descuento del 5% es subóptimo, va a amplificar una oferta poco atractiva.',
  '1. Mostrar benchmark: sus competidores hacen 70+ órdenes más por semana.
2. Diagnosticar que el descuento del 5% no es suficiente para convertir (umbral ~15%).
3. Proponer upgrade de promoción: 15% para todos + 20% para PRO.
4. Una vez calibrada la oferta, activar Ads con co-inversión de Rappi para amplificar.',
  2
),

-- ── CASO 3: Media ─────────────────────────────────────────────────────────────
(
  'Sushi Nikkei — El que invierte mal y culpa a la plataforma',
  'Media',
  'Sushi Nikkei',
  'Horacio',
  'm',
  'Bogotá',
  'Sushi / Japonesa',
  'Horacio abrió su restaurante hace 8 meses. Invirtió fuerte en Ads desde el principio. Las ventas arrancaron bien pero llevan 6 semanas cayendo. Está frustrado y en la llamada de hoy va a exigir explicaciones de por qué "el algoritmo lo bajó."

MÉTRICAS DISPONIBLES:
- Ticket promedio: $68.500 COP
- Órdenes/semana (últimas 6 semanas): 82, 75, 71, 64, 58, 53
- Ads activos: $1.200.000 COP/semana · Consumo: 91% · Retorno: 1.8X
- Descuento: 10% en rolls seleccionados para todos · Retorno: 12X
- Availability: 91% · RTWT: 27 minutos · Defect Rate: 14% · Cancelaciones: 4%
- Calificación: 3.9 con 95 reseñas (bajó de 4.3 hace 3 meses)
- Quejas frecuentes: "llegó sin la salsa", "arroz frío", "empaque aplastado"',
  'Horacio, 45 años. Emprendedor con Instagram de 18K seguidores, se considera experto en marketing digital. Cuando las cosas van mal culpa al algoritmo o a los domiciliarios. Nunca mira las reseñas en detalle porque "la gente siempre se queja de algo." Es inteligente pero tiene punto ciego en operación. Si le muestras datos con hechos concretos de las reseñas lo golpea, porque es detallista con su marca. No acepta crítica vaga pero sí acepta evidencia específica ("estas 17 reseñas dicen exactamente lo mismo").',
  'El problema real es que cambiaron el empaque hace 2 meses para ahorrar costos (de caja de cartón a bolsa biodegradable). El sushi no viaja bien en bolsa. Horacio lo sabe pero no quiere admitirlo porque tomó la decisión él mismo. Además el cocinero que armaba los pedidos renunció hace 6 semanas y lo reemplazó un ayudante sin entrenamiento (el RTWT subió de 14 a 27 min). Si el farmer le pregunta "¿cambió algo en tu operación en las últimas 8 semanas?" hay una pausa larga antes de responder.',
  '1. "El problema es el algoritmo de Rappi, me bajaron de posición" — el farmer tiene que contraargumentar con los datos de servicio como causa real.
2. "Mis clientes físicos están felices, el problema es el delivery" — separar experiencia física vs. delivery con datos.
3. "Si subo más el presupuesto de Ads vuelvo a aparecer arriba" — el error más peligroso: pagar más para amplificar una mala experiencia.',
  'Recomendar aumentar el presupuesto de Ads. Un farmer no preparado ve caída de ventas + Ads activos y piensa "necesita más pauta." Pero la calificación en caída con RTWT de 27 min es la causa raíz — más Ads solo aceleran la destrucción de la marca.',
  '1. Leer las reseñas en detalle y presentarlas como evidencia, no como opinión propia.
2. Hacer las preguntas correctas: "¿Cambió algo en el empaque o en el equipo en las últimas semanas?"
3. Proponer pausar los Ads hasta que RTWT baje a ≤15 min y calificación vuelva a ≥4.2.
4. Plan de acción: empaque correcto + entrenamiento del reemplazo.
5. Solo después de sanear la operación: reactivar Ads con el descuento del 10% como gancho.',
  3
),

-- ── CASO 4: Media-Alta ────────────────────────────────────────────────────────
(
  'Parrilla Noche y Día — El analítico que quiere crecer sin conceder margen',
  'Media-Alta',
  'Parrilla Noche y Día',
  'Horacio',
  'm',
  'Medellín',
  'Carnes / Parrilla',
  'Horacio tiene un restaurante de parrilla que en fin de semana es un éxito. Quiere crecer en semana pero su condición es no bajar precios. "No me vengas con descuentos, eso destruye el margen." La reunión es para que le presentes opciones.

MÉTRICAS DISPONIBLES:
- Ticket promedio general: $52.400 COP
- Horario: Lunes a domingo, 12pm – 11pm
- Órdenes por día (promedio últimas 4 semanas):
  · Lunes–Jueves: 18 órdenes/día · Ventas: $943.200/día
  · Viernes–Domingo: 87 órdenes/día · Ventas: $4.558.800/día
- Availability: 96% · RTWT: 9 min · Defect Rate: 3% · Cancelaciones: 1%
- Calificación: 4.6 con 520 reseñas
- Promociones: 15% descuento para usuarios PRO (todos los días) · Retorno: 22X
- Ads: $600.000/semana (sin segmentación horaria) · Consumo: 88% · Retorno: 6.1X
- Pedido mínimo: $45.000 COP',
  'Horacio, 45 años. Exitoso, tiene otros 2 negocios. Piensa en unidades económicas — lo que le importa es el margen por transacción y el EBITDA mensual, no el volumen bruto. Cuando escucha "descuento" cierra mentalmente. Pero cuando escucha "retorno de inversión" o "costo por orden incremental" abre los oídos. Lo que quiere no es más órdenes a cualquier costo — quiere más órdenes que sean rentables.',
  'Horacio no sabe que puede segmentar los Ads por horario y día de la semana. Toda su pauta está corriendo 7 días iguales, cuando en fin de semana tiene cola de espera natural y el gasto en Ads ahí es desperdicio. Tampoco sabe que bajar el pedido mínimo de $45.000 a $28.000 solo los días de semana podría abrir un segmento de almuerzo ejecutivo que hoy no lo alcanza.',
  '1. "No voy a bajar el pedido mínimo, el que quiera comer acá que pida bien" — el frame correcto es "hoy tienes un segmento bloqueado que podría pagarte $28K en semana, que es mejor que $0".
2. "Ya tengo Ads y retorno decente, ¿para qué cambiar?" — mostrar que está pagando Ads en días donde no los necesita = ineficiencia de presupuesto.
3. "¿Y la promoción PRO no me está comiendo el margen?" — mostrar que el retorno 22X justifica el costo; el análisis correcto es por orden incremental, no por margen bruto.',
  'Proponer simplemente "aumentar el presupuesto de Ads." El farmer ve buen retorno en Ads y escala. El insight real es redirigir el presupuesto existente de fin de semana (donde no necesita Ads) a entre semana (donde sí los necesita), sin gastar más.',
  '1. Mostrar la asimetría: 18 órdenes/día entre semana vs. 87 en fin de semana — la capacidad existe, falta demanda.
2. Identificar que los Ads están mal distribuidos: mismo presupuesto viernes y martes.
3. Proponer redirigir Ads a Lun–Jue sin aumentar presupuesto total.
4. Proponer pedido mínimo diferenciado por día (no cambiar precios del menú).
5. No tocar la promoción PRO — está funcionando.',
  4
),

-- ── CASO 5: Alta ──────────────────────────────────────────────────────────────
(
  'La Candelaria Gourmet — La marca que no quiere ser plataforma',
  'Alta',
  'La Candelaria Gourmet',
  'Horacio',
  'm',
  'Bogotá',
  'Gastronomía / Menú ejecutivo fine dining',
  'Horacio es chef y dueño de un restaurante gourmet en La Candelaria. Entró a Rappi hace 3 meses porque "un amigo me convenció." Tiene ventas muy bajas, no ha activado nada, y en la llamada de hoy hay riesgo real de que decida salirse de la plataforma. Su objeción principal: "Rappi es para comida rápida, no para lo que yo hago."

MÉTRICAS DISPONIBLES:
- Ticket promedio: $94.000 COP
- Órdenes/semana: 19
- Ventas netas/semana: $1.786.000 COP
- Horario: Martes a sábado, 12:00 pm – 4:00 pm solamente
- Availability: 98% · RTWT: 18 min · Defect Rate: 5% · Cancelaciones: 2%
- Calificación: 4.4 con 31 reseñas
- Promociones activas: Ninguna
- Ads activos: Ninguno
- Productos en menú: 8 (menú del día, 2 entradas, 3 platos fuertes, 2 postres)',
  'Horacio, 45 años. Chef formado en Bogotá con stage en España. Para él la comida es arte. Tiene horror a los descuentos porque "mis precios ya están calculados para lo que vale el trabajo." Desconfía de los datos de Rappi porque "no me parecen confiables." Si el farmer usa lenguaje de marketing convencional ("visibilidad", "conversión") lo pierde. Responde bien a conceptos como "experiencia del cliente", "curaduría", "posicionamiento de marca." Lo que no va a aceptar es que Rappi lo trate como a una hamburguesería.',
  'Horacio no sabe que hay restaurantes fine dining en Bogotá haciendo 80-120 órdenes/semana en Rappi con ticket promedio similar al suyo — con estrategias distintas a las de comida rápida. Tampoco sabe que el horario 12-4pm es su peor ventana para Rappi (coincide con la hora de almuerzo in-situ de sus propios clientes). Sus mejores oportunidades serían cenas de trabajo (6-9pm) y almuerzos ejecutivos en zonas de oficinas. Su menú de 8 productos es en realidad una fortaleza (claridad de elección), no una debilidad.',
  '1. "Rappi es para McDonald''s, no para lo que yo cocino" — la respuesta correcta requiere benchmarks de restaurantes premium en plataforma, no argumentos teóricos.
2. "No voy a poner descuentos, destruyo la marca" — el farmer tiene que ofrecer una alternativa: bundle de degustación como propuesta de valor, no como descuento.
3. "Mi horario es el que puedo atender, no puedo abrir más" — explorar si puede activar viernes-sábado noche sin cambiar estructura de costos.',
  'Proponer la estrategia estándar: descuento + Ads. Un farmer no preparado va a intentar el playbook habitual y lo va a perder. El caso requiere entender que para marcas premium la herramienta correcta es posicionamiento y bundles, no descuentos agresivos.',
  '1. No defender Rappi como plataforma — escuchar primero qué necesita la marca.
2. Mostrar que existen restaurantes gourmet exitosos en Rappi (benchmarks).
3. Proponer ampliar horario a viernes-sábado noche sin cambiar el de semana.
4. Crear un "menú de degustación a domicilio" (bundle premium exclusivo para Rappi, no descuento).
5. Ads solo después, con segmentación a usuarios de alto gasto en la zona.',
  5
),

-- ── CASO 6: Muy Alta ──────────────────────────────────────────────────────────
(
  'Asadero Los Tres Primos — La política familiar que bloquea el crecimiento',
  'Muy Alta',
  'Asadero Los Tres Primos',
  'Horacio',
  'm',
  'Barranquilla',
  'Carnes / Asadero',
  'Horacio tiene 3 sedes de asadero. La Sede Norte y la Sede Centro van bien. La Sede Sur lleva 5 meses con caída sostenida. Horacio cree que el problema es que "en el sur hay menos clientes." Quiere que le expliques qué hacer con la Sede Sur, pero en la llamada su cuñado Mauricio (que administra esa sede) también estará presente — y Mauricio es la causa real del problema.

MÉTRICAS DISPONIBLES:
                    | Sede Norte  | Sede Centro | Sede Sur
Órdenes/semana      | 185         | 142         | 41
Ticket promedio     | $48.200     | $46.800     | $47.100
Ventas/semana       | $8.917.000  | $6.645.600  | $1.931.100
Availability        | 97%         | 93%         | 71%
RTWT                | 10 min      | 13 min      | 31 min
Defect Rate         | 3%          | 5%          | 18%
Calificación        | 4.7         | 4.4         | 3.5
Descuento           | 15% PRO     | 15% PRO     | Ninguno
Ads                 | $800K/sem   | $600K/sem   | Ninguno
Horario             | L-D 11-10pm | L-D 11-10pm | Jue-Dom 6-10pm

CONTEXTO DE ZONA: La Sede Sur está en zona residencial clase media-alta de Barranquilla con alto tráfico delivery. Competidores en esa zona promedian 90-120 órdenes/semana.',
  'Horacio, 45 años. Emprendedor con instinto comercial. Toma decisiones rápido cuando los datos son claros. Es leal a su familia — Mauricio es el marido de su hermana y aunque sabe que no es el mejor administrador, no lo va a despedir fácilmente. Si el farmer insinúa que Mauricio es el problema de forma directa, Horacio se cierra y defiende a la familia. Responde bien a "la operación de la Sede Sur necesita ajustes" en vez de "Mauricio no sirve."

MAURICIO (personaje secundario, también está en la llamada): 41 años. Sabe que los números lo señalan. Está a la defensiva. Interrumpe para dar excusas ("es que la zona es diferente"). Si el farmer lo confronta directamente, escala el conflicto. Si el farmer lo ignora, también escala. La única salida es incluirlo como parte de la solución, no como el problema.',
  'Horacio sabe en el fondo que Mauricio no gestiona bien, pero nunca lo ha dicho en voz alta. Lo que necesita es un plan de acción que le dé a Mauricio un rol claro con métricas específicas — que si no las cumple, sea el propio Horacio quien tome la decisión. El ticket promedio de la Sede Sur es casi idéntico al de las otras sedes: el problema no es la zona — es la operación (horario muy corto, sin promociones, sin Ads, RTWT de 31 min porque Mauricio reduce personal para ahorrar).',
  'HORACIO:
1. "En el sur la gente no gasta igual" — el ticket promedio de $47.100 desmonta esto, hay que usarlo.
2. "¿Por qué tenemos que invertir en publicidad si las otras sedes ya funcionan?" — el comparativo de competidores locales de la Sede Sur da la respuesta.

MAURICIO:
1. "Esos datos de Rappi no son de fiar" — no atacar a Mauricio; validar su perspectiva y redirigir a los datos objetivos.
2. "El problema es que los competidores pagan domicilios subsidiados" — parcialmente cierto pero no explica la brecha.',
  'Hay dos trampas simultáneas: (1) Asumir que el problema de la Sede Sur es la zona, como cree Horacio — el ticket promedio idéntico en las 3 sedes lo desmonta. (2) Señalar a Mauricio directamente — cualquier ataque directo a la persona destruye la reunión.',
  '1. Usar los datos para despersonalizar el problema: "La zona tiene potencial — el ticket es idéntico a tus otras sedes."
2. No mencionar a Mauricio como causa — hablar de "la operación de esta sede."
3. Proponer plan de acción con métricas claras a 30 días: horario ampliado, Ads activados, RTWT como KPI.
4. Invitar a Mauricio a ser parte del plan: "¿Qué necesitas de tu parte para que esto funcione?"
5. Crear mecanismo de seguimiento semanal con Horacio para que los datos hablen solos.',
  6
);
