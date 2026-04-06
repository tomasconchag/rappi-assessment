-- Create caso_bank table
CREATE TABLE IF NOT EXISTS caso_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_profile TEXT NOT NULL,
  context TEXT NOT NULL,
  data_raw TEXT NOT NULL,
  situation TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add active_caso_id to assessment_configs
ALTER TABLE assessment_configs
  ADD COLUMN IF NOT EXISTS active_caso_id UUID REFERENCES caso_bank(id);

-- Seed the 8 cases
INSERT INTO caso_bank (title, difficulty, owner_name, owner_profile, context, data_raw, situation, question, sort_order) VALUES

('Pizzería Don Tomasso', 'Baja', 'Don Tomás, 58 años',
'Italiano de segunda generación, lleva 20 años haciendo pizzas. Es orgulloso de su producto y desconfía profundamente de la tecnología. Habla fuerte, interrumpe mucho y repite "yo no necesito eso" cada vez que le mencionas herramientas digitales. No revisa el portal de Rappi — su hijo le "ayuda" a veces pero no está involucrado de verdad. Cuando se frustra dice "ustedes solo quieren cobrar comisión". Sin embargo, si le demuestras con datos concretos que algo funciona, baja la guardia y escucha. La clave con Don Tomás es no pelear el orgullo sino redirigirlo: "su pizza es buena, el problema es que la gente no la está viendo."',
'Pizzería Don Tomasso lleva 2 años en Rappi en Bogotá. El dueño está frustrado porque siente que "Rappi no le funciona" y quiere salirse de la plataforma. Tu rol como Farmer es retenerlo y activar crecimiento.',
'- Categoría: Pizzas
- Ciudad: Bogotá
- Ticket promedio: $38,500 COP
- Horario en Rappi: Lunes a domingo, 11:00 am a 10:00 pm
- Órdenes promedio/semana: 120
- Ventas netas promedio/semana: $4,620,000 COP',
'- No tiene ninguna campaña de descuento activa.
- No tiene campañas publicitarias (Ads) activas.
- El menú en Rappi tiene 47 productos, incluyendo entradas, pizzas, pastas, postres, bebidas y combos.
- Niveles de servicio: Availability 92%, RTWT 14 min, Defect Rate 8%, Cancelaciones 2%.
- Las fotos de los productos fueron tomadas con celular, sin edición.
- La tienda tiene 4.1 de calificación con 230 reseñas.',
'El dueño te dice: "Llevo dos años y no crezco. No voy a seguir pagando comisión si no veo resultados." ¿Cómo abordas esta conversación y qué plan de acción le propones para los próximos 30 días?',
1),

('Sushi Kento', 'Baja-Media', 'Sebastián, 31 años',
'Emprendedor millennial que montó el restaurante con ahorros y un préstamo. Tiene Instagram con 12K seguidores y se considera "experto en marketing digital" porque pauta en redes. Es receptivo a ideas pero impaciente — quiere resultados en 2 semanas. Tiende a culpar a Rappi cuando las cosas van mal ("el algoritmo me escondió") en vez de mirar sus niveles de servicio. Es amable en persona pero agresivo por WhatsApp cuando está estresado. Si le muestras que el problema está en su operación y no en la plataforma, lo acepta pero necesita que se lo digas con tacto, con datos, no con opiniones.',
'Sushi Kento es un restaurante de sushi premium que abrió en Rappi hace 6 meses en Medellín. Las ventas arrancaron bien pero llevan 2 meses cayendo semana a semana.',
'- Categoría: Sushi / Japonesa
- Ciudad: Medellín
- Ticket promedio: $72,000 COP
- Horario en Rappi: Martes a domingo, 12:00 pm a 9:00 pm
- Órdenes/semana últimas 8 semanas: 95, 88, 82, 79, 71, 68, 63, 58',
'- Tiene un descuento del 10% en rolls seleccionados para todos los usuarios. Retorno: 8X.
- Tiene campaña de Ads de $500,000 COP semanales (sin co-inversión de Rappi). Consumo promedio: 78%. Retorno: 2.1X.
- Niveles de servicio: Availability 88%, RTWT 22 min, Defect Rate 12%, Cancelaciones 5%.
- El restaurante tiene 3.8 de calificación con 85 reseñas. Quejas frecuentes: "llegó destapado", "el arroz estaba frío", "faltaban piezas".
- Tiene 1 sola sede habilitada en Rappi.',
'Las ventas están en caída libre. ¿Dónde está el problema real y qué le propones al dueño? Prioriza: ¿qué resuelves primero y qué resuelves después?',
2),

('Alitas & Bros', 'Media', 'Andrés, 42 años',
'Ex-ejecutivo de consumo masivo que dejó la vida corporativa para montar su propia marca. Piensa en términos de P&L, market share y unit economics. Habla con jerga de negocio y espera que tú también. No tolera respuestas vagas — si le dices "vamos a mejorar la visibilidad" te va a preguntar "¿cuántas impresiones más? ¿cuánto cuesta? ¿cuándo veo el resultado?". Es exigente pero justo: si le cumples lo que prometes, te da más presupuesto y más acceso. Tiene un administrador en cada sede y el de la Sede Sur es su cuñado, que es el menos comprometido pero no lo puede despedir fácilmente.',
'Alitas & Bros es una marca de alitas con 3 sedes en Barranquilla. Las 3 están en Rappi pero con rendimientos muy distintos. El dueño quiere entender por qué y quiere que las 3 rindan como la mejor.',
'- Categoría: Alitas / Pollo
- Ciudad: Barranquilla
- Ticket promedio: $34,200 COP

COMPARATIVO DE SEDES:
                   | Sede Norte | Sede Centro | Sede Sur
Órdenes/semana     | 145        | 62          | 38
Ventas netas/sem   | $4,959,000 | $2,120,400  | $1,299,600
Availability       | 96%        | 81%         | 73%
RTWT               | 8 min      | 18 min      | 25 min
Defect Rate        | 3%         | 9%          | 15%
Cancelaciones      | 1%         | 6%          | 11%
Calificación       | 4.6 (310)  | 3.9 (95)    | 3.2 (40)
Descuentos         | 15% todos  | 5% PRO      | Ninguno
Ads                | $800K/sem  | Ninguno     | Ninguno
Horario            | 11am-11pm  | 12pm-9pm    | 5pm-9pm
                   | L-D        | L-S         | Mié-Dom',
'',
'Tienes reunión con el dueño la próxima semana. Prepara un diagnóstico comparativo de las 3 sedes y un plan de acción específico para cada una. ¿Qué nivel de ventas crees que podrían alcanzar Sede Centro y Sede Sur en 60 días si ejecutan tu plan?',
3),

('Café Macarena', 'Media', 'Valentina, 36 años',
'Diseñadora gráfica que se reinventó como dueña de cafetería. Es detallista, creativa y muy enfocada en la experiencia del cliente. Su café es bonito, su marca es coherente y tiene buenas fotos porque ella misma las toma. Es abierta a experimentar pero necesita entender el "por qué" antes de invertir un peso. No le gusta sentir que le están vendiendo — prefiere sentir que está co-creando la estrategia contigo. Tiene un presupuesto limitado y lo administra con cuidado. Si le propones algo, tiene que ser con un plan paso a paso porque se abruma si le tiras 5 ideas al tiempo.',
'Café Macarena es una cafetería artesanal en Cali con un solo punto de venta. Lleva 1 año en Rappi. Las ventas son estables pero la dueña siente que está dejando dinero sobre la mesa porque su local físico vende 3x más que Rappi. Quiere duplicar ventas en Rappi sin abrir otra sede.',
'- Categoría: Cafetería / Postres
- Ciudad: Cali
- Ticket promedio: $22,400 COP
- Horario en Rappi: Lunes a sábado, 8:00 am a 5:00 pm
- Órdenes/semana: 85
- Ventas netas/semana: $1,904,000 COP',
'- Descuento del 10% en combos de desayuno para todos los usuarios. Retorno: 15X.
- No tiene campaña de Ads.
- Niveles de servicio: Availability 95%, RTWT 9 min, Defect Rate 4%, Cancelaciones 1%.
- Calificación: 4.5 con 180 reseñas.
- El menú tiene 22 productos: desayunos, sándwiches, ensaladas, jugos, café y postres.
- Los horarios pico del local físico son: 7-9am (desayuno), 12-2pm (almuerzo), 3-5pm (onces). En Rappi, el 70% de las órdenes se concentran entre 8am y 12pm.',
'La dueña te dice: "Mi meta es llegar a 170 órdenes por semana sin abrir otra cocina." ¿Qué estrategia le armas? Sé específico con las palancas comerciales de Rappi que usarías y por qué.',
4),

('Burger Stack', 'Media-Alta', 'Felipe, 38 años',
'Ingeniero industrial que aplica pensamiento analítico a todo. Tiene un Excel donde trackea márgenes por producto, por canal y por día. Sabe exactamente cuánto le cuesta cada orden en Rappi y te lo va a decir antes de que tú se lo muestres. Es directo, no se anda con rodeos y respeta que tú tampoco lo hagas. Su frustración no es con Rappi como plataforma sino con la dinámica de descuentos que siente que Rappi incentiva. Te va a retar con: "Si quito el descuento, ¿ustedes me garantizan que no me caen las órdenes?" No busca promesas — busca un plan con lógica detrás.',
'Burger Stack es una marca de hamburguesas smash con 2 sedes en Bogotá. Lleva 3 años en Rappi y tiene buenas ventas, pero el margen del dueño se ha deteriorado y está evaluando si Rappi sigue siendo rentable para él. No quiere más descuentos — quiere más volumen con el mismo o mejor margen.',
'- Categoría: Hamburguesas
- Ciudad: Bogotá
- Ticket promedio: $41,300 COP
- Órdenes/semana (ambas sedes): 310
- Ventas netas promedio/semana: $12,803,000 COP',
'- Descuento 20% en todo el menú para todos los usuarios. Retorno: 35X.
- Descuento adicional 10% para usuarios PRO (total 30% PRO). Retorno específico PRO: 28X.
- Ads: $2,000,000 COP/semana. Co-inversión Rappi: 50%. Consumo: 95%. Retorno: 5.2X.
- Niveles de servicio: Availability 97%, RTWT 7 min, Defect Rate 2%, Cancelaciones 0.5%.
- Calificación: 4.7 con 1,200 reseñas.
- El dueño reporta que su margen bruto por orden Rappi bajó de 38% a 22% en el último año. Su margen en venta directa es 45%.',
'El dueño te dice: "Vendo mucho en Rappi pero ya casi no gano. Si me quitas los descuentos se me caen las ventas. Estoy atrapado." ¿Cómo le ayudas a salir de esta trampa de descuentos sin destruir el volumen? Propón un plan de transición de 90 días.',
5),

('Wok Express', 'Alta', 'Carolina, 45 años (Directora Comercial)',
'MBA, ex-directora de trade marketing en una multinacional de alimentos. Maneja 5 sedes y reporta a un board de inversionistas. Habla en KPIs, pide benchmarks y compara todo con datos del sector. No acepta explicaciones emocionales — quiere causa raíz y plan de acción con timeline. Es políticamente astuta: si siente que Rappi favorece al competidor, lo va a escalar a su contacto en el equipo de liderazgo de Rappi. Sin embargo, si le demuestras que el problema es de estrategia comercial y no de favoritismo, te respeta y te da autonomía para ejecutar. La peor forma de perder a Carolina es decirle "no tengo esos datos."',
'Wok Express es una cadena de comida asiática con 5 sedes en Bogotá. Llevan 4 años en Rappi. La directora comercial te pide una reunión porque un competidor directo (Asian Box) los está superando en órdenes en 3 de las 5 zonas, a pesar de que Wok Express tiene mejores niveles de servicio y más sedes.',
'WOK EXPRESS (5 sedes): Ticket prom $33,800 | Órdenes/sem 420 | Ventas $14,196,000/sem
ASIAN BOX (competidor, 3 sedes): Ticket prom $28,500 | Órdenes/sem 480 | Ventas $13,680,000/sem

COMPARATIVO:
                       | Wok Express           | Asian Box
Descuento promedio     | 8% prod. seleccionados | 25% todo + envío gratis
Ads/semana             | $1.5M (consumo 60%)   | $3M (consumo 97%)
Co-inversión Rappi     | 0%                    | 60%
Availability promedio  | 94%                   | 91%
RTWT promedio          | 10 min                | 12 min
Defect Rate            | 4%                    | 6%
Calificación           | 4.4                   | 4.2
Horario                | 11am-10pm L-D         | 10am-11pm L-D
# Productos en menú    | 65                    | 28',
'',
'La directora comercial te dice: "Tenemos mejor producto, mejor servicio y más sedes. ¿Por qué nos están ganando? ¿Rappi los está favoreciendo?" Prepara un análisis honesto de por qué Asian Box vende más y un plan para que Wok Express recupere liderazgo en las 3 zonas donde pierde, sin copiar la estrategia agresiva de descuentos del competidor.',
6),

('La Brasería', 'Alta', 'Ricardo, 50 años',
'Paisa de toda la vida, empezó asando carne en un carrito y hoy tiene un restaurante reconocido en Medellín. Es leal a las personas, no a las plataformas. Si siente que lo cuidan, se queda. Si siente que es un número más, se va. El tema de iFood no es solo por la comisión — es porque "el de iFood me llamó, me visitó y me hizo sentir importante." Es pragmático con los números pero las decisiones finales las toma con el instinto. Tiene un contador que le lleva las cuentas y un sobrino que le maneja las redes. La dark kitchen le emociona pero le da miedo la inversión.',
'La Brasería es un restaurante de carnes a la brasa con 1 sede en Medellín. Lleva 18 meses en Rappi. Las ventas son decentes pero el dueño acaba de recibir una propuesta de iFood con comisión más baja y quiere que le expliques por qué debería quedarse en Rappi — o incluso invertir más. Además, está considerando abrir una dark kitchen solo para delivery.',
'- Categoría: Carnes / Parrilla
- Ciudad: Medellín
- Ticket promedio: $56,800 COP
- Órdenes/semana: 95
- Ventas netas/semana: $5,396,000 COP',
'- Descuento 12% en combos para usuarios PRO. Retorno: 18X.
- Ads: $700,000/semana. Co-inversión Rappi: 40%. Consumo: 52%. Retorno: 4.5X.
- Niveles de servicio: Availability 90%, RTWT 19 min, Defect Rate 7%, Cancelaciones 3%.
- Calificación: 4.3 con 150 reseñas.
- El 40% de las órdenes son combos para 2 personas (ticket $85K+).
- El dueño dice que iFood le ofrece 12% de comisión vs el 25% que paga en Rappi.',
'Esta es una reunión de retención. El dueño tiene la propuesta de iFood sobre la mesa. ¿Cómo estructuras la conversación? Además, ¿le recomiendas abrir la dark kitchen? Argumenta con números y con la propuesta de valor de Rappi vs la oferta del competidor.',
7),

('Empanadas La Esquina + Caso Portafolio', 'Muy Alta', 'Don Hernando, 55 años',
'Empresario de Cartagena que empezó con un carrito de empanadas y hoy tiene 3 restaurantes. Es conservador con el dinero pero ambicioso con el crecimiento. Toma decisiones lento — necesita consultarlo con su esposa (que lleva la contabilidad) y con su hijo mayor (que administra Mariscos del Puerto). Le da pánico la calificación de Rappi porque vio cómo a un amigo le "destruyeron" el negocio con malas reseñas por problemas de empaque. Es desconfiado al principio pero si ve que ya le funcionó con La Esquina, está dispuesto a escalar.',
'Empanadas La Esquina es un negocio familiar en Cartagena ya activo en Rappi. El dueño también tiene otros 2 restaurantes que NO están en Rappi y quiere una propuesta integral para meter los 3. Tu trabajo es diseñar la estrategia de onboarding + crecimiento para el portafolio completo.',
'EMPANADAS LA ESQUINA (ya en Rappi):
- Categoría: Comida rápida / Empanadas | Ciudad: Cartagena
- Ticket prom: $18,500 | Órdenes/sem: 110 | Ventas: $2,035,000/sem
- Availability 98% | RTWT 6 min | Defect Rate 2% | Cancelaciones 0.8%
- Calificación: 4.8 con 420 reseñas
- Descuento: 15% primer pedido. Retorno: 40X. Sin Ads.

MARISCOS DEL PUERTO (NO en Rappi):
- Categoría: Mariscos | Ticket prom estimado: $48,000
- Horario local: 11am-9pm L-D | 2 sedes en Cartagena
- Venta mensual local: ~$85M COP entre ambas sedes
- Desafío: los mariscos son delicados para delivery (temperatura, presentación)

CEVICHERÍA OLA (NO en Rappi):
- Categoría: Ceviches / Comida de mar | Ticket prom estimado: $35,000
- Horario local: 12pm-8pm Mié-Dom | 1 sede en zona turística
- Venta mensual local: ~$40M COP
- Desafío: producto muy perecedero, altamente dependiente de frescura visual',
'',
'El dueño te dice: "La Esquina me funciona bien en Rappi. Quiero meter los otros dos pero no quiero que me pase lo que le pasó a un amigo que metió su restaurante y le destruyeron la calificación por problemas de empaque." Diseña la propuesta completa: ¿con cuál restaurante arrancas y por qué? ¿Qué condiciones de operación exiges antes de activarlo? ¿Qué estrategia comercial propones para los primeros 90 días de cada uno? ¿Cómo usas el éxito de La Esquina como palanca?',
8);
