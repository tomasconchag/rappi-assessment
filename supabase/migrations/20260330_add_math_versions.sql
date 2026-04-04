-- Add version support to assessment_questions
ALTER TABLE assessment_questions
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'free_text',
  ADD COLUMN IF NOT EXISTS options JSONB;

-- Mark existing math questions as legacy
UPDATE assessment_questions SET version = 'legacy' WHERE section = 'math';

-- Add math_version to assessment_configs
ALTER TABLE assessment_configs
  ADD COLUMN IF NOT EXISTS math_version TEXT NOT NULL DEFAULT 'A';

-- Add math_context to assessment_configs (shared restaurant table context)
ALTER TABLE assessment_configs
  ADD COLUMN IF NOT EXISTS math_context TEXT;

-- ============================================================
-- VERSION A QUESTIONS (9 questions, multiple choice)
-- Context: same restaurant table for both versions
-- ============================================================

INSERT INTO assessment_questions (section, version, question_type, position, content, options, correct_answer, points, is_honeypot) VALUES
('math', 'A', 'multiple_choice', 1,
 'Si vendieras 4 hamburguesas, ¿de cuánto serían tus ingresos?',
 '[{"letter":"a","text":"$72.000"},{"letter":"b","text":"$54.000"},{"letter":"c","text":"$18.000"},{"letter":"d","text":"$90.000"}]',
 'a', 1, false),

('math', 'A', 'multiple_choice', 2,
 '¿Cuál sería el valor de un perro caliente si hicieras un 20% de descuento?',
 '[{"letter":"a","text":"$3.000"},{"letter":"b","text":"$12.000"},{"letter":"c","text":"$6.000"},{"letter":"d","text":"$13.000"}]',
 'b', 1, false),

('math', 'A', 'multiple_choice', 3,
 'Si vendieras una hamburguesa, un perro caliente y una porción de pizza, ¿de cuánto serían tus ingresos?',
 '[{"letter":"a","text":"$61.000"},{"letter":"b","text":"$51.000"},{"letter":"c","text":"$41.000"},{"letter":"d","text":"$33.000"}]',
 'c', 1, false),

('math', 'A', 'multiple_choice', 4,
 'Si hicieras un 30% de descuento en lasañas, ¿cuánto deberías cobrar al cliente si te compra una lasaña y un perro caliente?',
 '[{"letter":"a","text":"$35.000"},{"letter":"b","text":"$24.500"},{"letter":"c","text":"$29.000"},{"letter":"d","text":"$30.000"}]',
 'c', 2, false),

('math', 'A', 'multiple_choice', 5,
 'Si vendes 3 pizzas en $18.000 COP, ¿de cuánto es el descuento (%) que estás haciendo?',
 '[{"letter":"a","text":"33%"},{"letter":"b","text":"25%"},{"letter":"c","text":"40%"},{"letter":"d","text":"15%"}]',
 'b', 2, false),

('math', 'A', 'multiple_choice', 6,
 'Si vendieras 3 perros calientes y 2 hamburguesas, ¿cuánto serían tus ganancias?',
 '[{"letter":"a","text":"$56.700"},{"letter":"b","text":"$69.300"},{"letter":"c","text":"$46.200"},{"letter":"d","text":"$40.300"}]',
 'a', 2, false),

('math', 'A', 'multiple_choice', 7,
 'Trabajas como farmer y tu meta es llamar a 300 restaurantes al mes. Si trabajas 20 días hábiles, ¿cuántos negocios debes llamar diariamente?',
 '[{"letter":"a","text":"10"},{"letter":"b","text":"15"},{"letter":"c","text":"30"},{"letter":"d","text":"12"}]',
 'b', 1, false),

('math', 'A', 'multiple_choice', 8,
 'Estás cursando un diplomado en ventas. Para graduarte debes tener una calificación promedio mínima de 3,0. Tus notas: Tácticas de ventas 30%→3,7 | Comercio electrónico 20%→3,0 | Matemática financiera 15%→4,8 | Marketing digital 20%→2,9 | Trabajo de grado 15%→4,6. ¿Cuál es tu calificación final?',
 '[{"letter":"a","text":"2,9"},{"letter":"b","text":"3,0"},{"letter":"c","text":"3,7"},{"letter":"d","text":"3,8"}]',
 'c', 2, false),

('math', 'A', 'multiple_choice', 9,
 'Las ventas del negocio A son $2.000.000/semana (rentabilidad 20%) y las del negocio B son $4.000.000/semana (rentabilidad 10%). La rentabilidad es lo que le queda al dueño en pesos. ¿Cuál de los 2 restaurantes ganó más?',
 '[{"letter":"a","text":"El restaurante A"},{"letter":"b","text":"El restaurante B"},{"letter":"c","text":"Ninguno de los 2"},{"letter":"d","text":"Los 2 son igual de rentables"}]',
 'd', 2, false);

-- ============================================================
-- VERSION B QUESTIONS (9 questions, multiple choice)
-- ============================================================

INSERT INTO assessment_questions (section, version, question_type, position, content, options, correct_answer, points, is_honeypot) VALUES
('math', 'B', 'multiple_choice', 1,
 'Si vendieras 3 hamburguesas, ¿de cuánto serían tus ingresos?',
 '[{"letter":"a","text":"$72.000"},{"letter":"b","text":"$54.000"},{"letter":"c","text":"$18.000"},{"letter":"d","text":"$90.000"}]',
 'b', 1, false),

('math', 'B', 'multiple_choice', 2,
 '¿Cuál sería el valor de un perro caliente si hicieras un 30% de descuento?',
 '[{"letter":"a","text":"$3.000"},{"letter":"b","text":"$12.000"},{"letter":"c","text":"$6.000"},{"letter":"d","text":"$10.500"}]',
 'd', 1, false),

('math', 'B', 'multiple_choice', 3,
 'Si vendieras una hamburguesa, un perro caliente y una porción de pizza, ¿de cuánto serían tus ingresos?',
 '[{"letter":"a","text":"$61.000"},{"letter":"b","text":"$51.000"},{"letter":"c","text":"$41.000"},{"letter":"d","text":"$33.000"}]',
 'c', 1, false),

('math', 'B', 'multiple_choice', 4,
 'Si hicieras un 20% de descuento en lasañas, ¿cuánto deberías cobrar al cliente si te compra una lasaña y un perro caliente?',
 '[{"letter":"a","text":"$35.000"},{"letter":"b","text":"$24.500"},{"letter":"c","text":"$29.000"},{"letter":"d","text":"$31.000"}]',
 'd', 2, false),

('math', 'B', 'multiple_choice', 5,
 'Si vendes 3 pizzas en $16.800 COP, ¿de cuánto es el descuento (%) que estás haciendo?',
 '[{"letter":"a","text":"33%"},{"letter":"b","text":"25%"},{"letter":"c","text":"40%"},{"letter":"d","text":"30%"}]',
 'd', 2, false),

('math', 'B', 'multiple_choice', 6,
 'Si vendieras 3 perros calientes y 4 hamburguesas, ¿cuánto serían tus ganancias?',
 '[{"letter":"a","text":"$81.900"},{"letter":"b","text":"$56.700"},{"letter":"c","text":"$69.300"},{"letter":"d","text":"$46.200"}]',
 'a', 2, false),

('math', 'B', 'multiple_choice', 7,
 'Trabajas como farmer y tu meta es llamar a 300 restaurantes al mes. Si trabajas 25 días hábiles, ¿cuántos negocios debes llamar diariamente?',
 '[{"letter":"a","text":"10"},{"letter":"b","text":"15"},{"letter":"c","text":"30"},{"letter":"d","text":"12"}]',
 'd', 1, false),

('math', 'B', 'multiple_choice', 8,
 'Estás cursando un diplomado en ventas. Para graduarte debes tener una calificación promedio mínima de 3,0. Tus notas: Tácticas de ventas 30%→3,7 | Comercio electrónico 20%→3,0 | Matemática financiera 15%→4,8 | Marketing digital 20%→2,9 | Trabajo de grado 15%→4,6. ¿Cuál es tu calificación final?',
 '[{"letter":"a","text":"3,7"},{"letter":"b","text":"2,9"},{"letter":"c","text":"3,0"},{"letter":"d","text":"3,8"}]',
 'a', 2, false),

('math', 'B', 'multiple_choice', 9,
 'Las ventas del negocio A son $2.000.000/semana (rentabilidad 20%) y las del negocio B son $4.000.000/semana (rentabilidad 10%). La rentabilidad es lo que le queda al dueño en pesos. ¿Cuál de los 2 restaurantes ganó más?',
 '[{"letter":"a","text":"El restaurante A"},{"letter":"b","text":"El restaurante B"},{"letter":"c","text":"Los 2 son igual de rentables"},{"letter":"d","text":"Ninguno de los 2"}]',
 'c', 2, false);

-- Update assessment_configs to set the shared math context
UPDATE assessment_configs SET math_context = 'Eres el dueño de un restaurante de comidas rápidas. Con la siguiente información, resuelve:

| Producto | Precio | Costo de producción |
|---|---|---|
| Hamburguesa | $18.000 | $5.400 |
| Perro caliente | $15.000 | $4.500 |
| Porción Pizza | $8.000 | $2.400 |
| Lasaña | $20.000 | $6.000 |

Recuerda: **Ganancias = Ingresos - Costos**';
