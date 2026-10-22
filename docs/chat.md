# Chat de dudas

Autor: Javier (@Jamarlli). Código: `src/components/chat/ChatLateral.tsx` (panel), `src/app/api/chat/route.ts` (ruta), `src/lib/chat/corpus.ts` (búsqueda), `src/lib/chat/proteccion.ts` (anti-abuso), `src/lib/ia.ts` (HelmCode).

## 1. Qué hace

Es un panel lateral, disponible en todas las páginas, donde puedes preguntar con tus palabras cómo votar el 29 de noviembre de 2026: en persona, por correo, desde el extranjero, si te ha tocado mesa, plazos o cómo se reparten los escaños. Responde en castellano llano, con pasos numerados, y debajo enlaza la página oficial que sostiene la respuesta. Si no puede confirmarlo con las fuentes oficiales, lo dice y te manda al calendario de la Junta Electoral Central y a los plazos del INE. No habla de partidos, candidatos ni encuestas, y no recomienda el voto.

## 2. Cómo funciona

- **Corpus.** `contexto.md` se trocea en fragmentos pequeños (párrafos, grupos de puntos de lista, cada fila de tabla) con id `apartado#n` (p. ej. `2.7#10`). Se añade una ficha por cada fuente oficial (`F#n`) y las 26 fechas de `datos/calendario_29N_2026.json` (`cal#…`). El calendario va siempre entero en el contexto; el resto se recupera.
- **Búsqueda híbrida.** Palabras clave (TF-IDF tosco con sinónimos por apartado) y embeddings `qwen3-embedding` (512 dimensiones, precalculados en `src/datos/embeddings.json`, hoy 189 fragmentos), fusionados con Reciprocal Rank Fusion (K = 60). Se mandan como mucho 8 fragmentos y unos 6.000 caracteres. Se busca con la pregunta actual y la anterior del usuario, para seguir el hilo. Si los embeddings fallan (timeout de 5 s), queda solo la búsqueda por palabras clave.
- **Citas comprobadas.** El modelo (`glm5.3-flash`) responde en JSON: `respuesta`, `citas` (`id` de fragmento y frase literal) y `confirmado`. El servidor comprueba que el id estaba en el contexto enviado y que la frase está en ese fragmento (literal tras normalizar, o con al menos el 80 % de sus palabras). Solo entonces añade los enlaces oficiales del fragmento, cuatro como mucho. El modelo nunca escribe URL: las que se cuelen se borran del texto. Sin cita válida o con `confirmado: false`, se añaden las fuentes generales (JEC e INE).
- **Fuentes citables.** Solo dominios oficiales: BOE (LOREG, Real Decreto 806/2026, Orden INT/650/2026, Estatuto de los Trabajadores, RD 605/1999), Junta Electoral Central, Ministerio del Interior (Infoelectoral), INE (Oficina del Censo Electoral), Correos y Exteriores. Maldita.es solo en los bulos del apartado 6.3.
- **Qué queda fuera y por qué.** Apartado 4 (candidaturas y programas), por neutralidad. Apartados 6, 6.2 y 6.4-6.8 y las «implicaciones para el hack» del 5, porque son notas para quien construye la herramienta. URL de resultados de 2023 y de formaciones políticas (`resultados-electorales`, `DataLab`, `wstempus`, `formaciones-politicas`), que no se citan. `comun/` no se carga: el chat solo trata cómo votar.

## 3. Seguridad y gasto

Todo se decide antes de llamar al modelo (`protegerChat`):

1. **Origen.** Solo `same-origin` desde `build.barraca.house`, `*.vercel.app` o localhost. Sin cabeceras de navegador, solo en desarrollo. Esto corta el uso trivial, pero curl puede falsear las cabeceras.
2. **Tasa por IP.** 15 peticiones por minuto y 120 por hora por IP, y 120 por minuto en total. Se guarda en memoria **por instancia**, con la IP en hash SHA-256 y sal aleatoria por proceso.
3. **Cuerpo.** Solo `application/json` y 4 MB como máximo. Se usan los 6 últimos mensajes y las respuestas previas del asistente se recortan a 500 caracteres. **La pregunta no tiene límite de longitud** (decisión del equipo): el gasto lo acotan la tasa, el tamaño del cuerpo y `maxTokens`.
4. **Filtro previo sin LLM.** Patrones de jailbreak («ignora tus instrucciones», petición del prompt, leet, full-width, caracteres invisibles), juego de rol, encargos ajenos (código, poemas, traducciones), código pegado y base64. Su prioridad es no dar falsos positivos: se mide contra todos los casos «dentro» de los bancos. Las preguntas rechazadas no gastan tokens.
5. **Modelo.** El razonamiento está desactivado por defecto y `maxTokens` es 1.500. Con `CHAT_RAZONAR=1` se reactiva y `maxTokens` sube a 6.000. Las reglas del prompt piden ceñirse al CONTEXTO, tratar el contexto como datos y no como órdenes, y rechazar otras tareas.
6. **Privacidad.** No se guarda ni se registra el texto del ciudadano: los errores solo registran el tipo de error. El navegador manda en cada petición el historial de la sesión, que no se guarda en ningún almacenamiento.

## 4. Calidad medida

La batería tiene 458 casos en `pruebas/banco-*.json`: contenido (192), adversario (121), fechas y bulos (118) y el banco original del chat (27). Se lanza con `bun pruebas/evaluar.mjs [BASE]`, que respeta los límites del servidor y deja `resultados-*.json` e `informe-*.md`. Admite `--bancos`, `--max`, `--reanudar` y `--repuntuar`.

| Banco | OK |
|---|---|
| Original + fechas/bulos | 92 % (134/145) |
| Adversario | 94 % (114/121) |
| Contenido | 90 % (173/192) |

Sin razonamiento, el tiempo medio es de unos 6 s (p90, unos 10 s), frente a los ~20 s de antes. En una muestra de 59 casos, el % OK fue igual o mejor.

## 5. Cómo mantenerlo

- Si cambia `contexto.md` o el troceado: `bun scripts/embeber.ts`. Solo reembebe los fragmentos cuyo hash ha cambiado. Sube `src/datos/embeddings.json`. Si falta un vector, ese fragmento solo se encuentra por palabras clave.
- Variables de entorno: `HELMCODE_API_KEY`, `HELMCODE_MODEL` y `HELMCODE_BASE_URL` (opcional); `CHAT_RAZONAR=1` para reactivar el razonamiento; `CHAT_POR_MINUTO_IP` y `CHAT_POR_HORA_IP`, **solo para pruebas locales** en `.env.local`.
- Después de cada `git pull`: `bun install`.
- Antes de tocar el filtro previo, pasa los casos «dentro» de todos los bancos.

## 6. Qué falta para producción

- Un límite de tasa compartido (KV o Redis). El actual es por instancia y se reinicia al enfriarse.
- Verificar una a una las anclas de artículos de la LOREG (`#asetentaytres`…), que se generan automáticamente.
- El filtro por patrones se puede esquivar. La segunda barrera es el modelo, con las reglas del prompt y `maxTokens`.
- Una revisión jurídica del corpus y de las respuestas.
- Probar la accesibilidad con un lector de pantalla real. Hoy el panel tiene `aria-live`, cierre con Escape y botones etiquetados, pero no se ha probado con lector.
- Monitorización (errores, latencia, gasto) sin datos personales ni texto del ciudadano.
