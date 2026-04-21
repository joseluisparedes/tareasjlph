import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Manejo de pre-flight requests (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { tipo, modo, itemData, respuestaUsuario } = body;

    // modo puede ser 'generar_pregunta' o 'procesar_accion'
    if (!modo || !itemData || !tipo) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros requeridos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Falta clave de API Gemini', success: true, mensaje: "IA en mantenimiento (clave faltante). Procediendo manualmente." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let promptTexto = "";
    let esJSON = false;

    if (modo === 'generar_pregunta') {
      if (tipo === 'iniciativa') {
        promptTexto = `Actúa como un excelente Scrum Master y gestor de proyectos. Tu tarea es ayudarme en una revisión ágil (Daily).
Te pasaré el contexto de una 'Iniciativa' (Necesidad) y quiero que generes una pregunta CORTA Y DIRECTA (máximo 40 palabras) de forma conversacional que resuma el estado y me pregunte qué quieres hacer con ella (ej: "¿Qué hacemos con esto?, ¿Actualizamos estado?, ¿Algún nuevo comentario?"). No uses saludos como hola.
        
Contexto de Iniciativa:
Título: ${itemData.titulo}
Descripción: ${itemData.descripcion || 'Sin descripción'}
Últimas Notas: ${itemData.notas || 'Sin notas recientes'}
Estado actual: ${itemData.estado}
`;
      } else if (tipo === 'tarea') {
        promptTexto = `Actúa como un excelente Scrum Master. Tu tarea es ayudarme en una revisión ágil (Daily).
Te pasaré el contexto de una Tarea de Kanban y quiero que generes una pregunta CORTA Y DIRECTA (máximo 30 palabras) resumiendo de qué trata y preguntándome qué hacemos o qué pasó con ella (ej: "¿Muevo esta tarea?, ¿en qué estado está?"). No uses saludos.

Contexto de Tarea:
Nombre: ${itemData.titulo}
Descripción: ${itemData.descripcion || 'Sin descripción'}
Columna actual: ${itemData.nombre_columna || 'Desconocida'}
`;
      }
    } else if (modo === 'procesar_accion') {
      esJSON = true;
      if (tipo === 'iniciativa') {
        promptTexto = `Eres un asistente de gestión de proyectos. El usuario acaba de responderte sobre una "Iniciativa" que estabas revisando. Tu objetivo es interpretar la respuesta en lenguaje natural del usuario y transformarla a una estructura JSON con las acciones concretas a realizar en la base de datos.

Contexto de Iniciativa: Título: ${itemData.titulo}. Estado previo: ${itemData.estado}.

Respuesta del usuario: "${respuestaUsuario}"

Analiza la respuesta y reacciona de la siguiente forma retornado ÚNICAMENTE el código JSON:
1. "estado_nuevo": El usuario indicó explícitamente pasarla a En progreso, Cerrado, u Otro estado? (Puede ser nulo si no indicó cambio). Estados típicos: "Nuevo", "En Proceso", "Cerrado", "Cancelado", "Pausado".
2. "agregar_nota": Un resumen literal de lo que dictó o comentó el usuario que deba guardarse como trazabilidad o comentario (puede ser nulo).
3. "accion": 'actualizar' (si hay nota o cambio) o 'omitir' (si el usuario dijo que la dejemos como está o pases).

Ejemplo de respuesta válida JSON:
{
  "accion": "actualizar",
  "estado_nuevo": "En Proceso",
  "agregar_nota": "El proveedor aún no contesta."
}`;
      } else if (tipo === 'tarea') {
        promptTexto = `Eres un asistente de Kanban. El usuario repondió sobre una "Tarea" en curso. Interpreta la respuesta en un JSON válido con acciones de sistema.

Contexto de la Tarea: Título: ${itemData.titulo}. Estado previo/Columna: ${itemData.nombre_columna}.
Respuesta del usuario: "${respuestaUsuario}"

Retorna el JSON estrictamente con esto:
1. "accion": "actualizar" o "omitir"
2. "agregar_descripcion": Un resumen de la anotación que el usuario quiso poner. Ej: "Hoy: Esperando a cliente". Será nulo si no aportó información nueva.
3. "mover_a": Si el usuario dice 'pásala a completada', o 'ya terminó' o 'muevela a progreso', debes inferir un posible nombre de columna (ej: "Completado", "Terminado", "En Progreso", etc) o null si no infieres cambio visual de tablero.

Ejemplo JSON:
{
  "accion": "actualizar",
  "agregar_descripcion": "Cliente contactado a las 10 am, falta respuesta",
  "mover_a": "Terminado"
}`;
      }
    }

    const payloadOpenAI = {
      contents: [{
        parts: [{ text: promptTexto }]
      }],
      generationConfig: {
        temperature: 0.1,
        ...(esJSON ? { responseMimeType: "application/json" } : {})
      }
    };

    const modelsToTry = [
        "gemini-flash-latest",
        "gemini-1.5-flash",
        "gemini-pro"
    ];

    let response;
    let lastErrorBody = "";
    let modelUsed = "";

    try {
        for (const model of modelsToTry) {
            modelUsed = model;
            response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadOpenAI)
                }
            );

            if (response.ok) break;
            lastErrorBody = await response.text();
            if (response.status !== 404) break;
        }

        if (response && response.ok) {
            const dataIA = await response.json();
            const textoIA = dataIA.candidates?.[0]?.content?.parts?.[0]?.text;

            if (textoIA) {
                if (modo === 'procesar_accion') {
                    try {
                        const resultJSON = JSON.parse(textoIA.trim());
                        return new Response(JSON.stringify({ success: true, result: resultJSON }), {
                          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                        });
                    } catch (e) {
                         // Fallback si la IA no devuelve JSON
                         return new Response(JSON.stringify({ 
                           success: true, 
                           result: { accion: 'omitir', agregar_nota: respuestaUsuario } 
                         }), {
                           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                         });
                    }
                } else {
                    return new Response(JSON.stringify({ success: true, mensaje: textoIA.trim() }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error crítico en fetch:", e);
    }

    // --- FALLBACK TOTAL (MODO SEGURO) ---
    // Si llegamos aquí, algo falló con Gemini, pero NO devolvemos error al frontend.
    // Devolvemos un mensaje que permite al usuario seguir trabajando manualmente.
    const fallbackMsg = `La conexión con la IA no está disponible en este momento. Por favor, indica brevemente qué quieres hacer con esta ${tipo === 'tarea' ? 'tarea' : 'iniciativa'} (ej: "pásala a en proceso", "terminada", etc.) o simplemente pulsa Omitir.`;
    
    if (modo === 'procesar_accion') {
        // Si falló procesando, simplemente guardamos el texto del usuario como una nota literal
        return new Response(JSON.stringify({ 
          success: true, 
          result: { 
            accion: 'actualizar', 
            agregar_nota: respuestaUsuario || "Actualización manual",
            estado_nuevo: null 
          } 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } else {
        return new Response(JSON.stringify({ success: true, mensaje: fallbackMsg }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (err: any) {
    console.error("Error de escape:", err)
    return new Response(
      JSON.stringify({ success: true, mensaje: "Modo manual activo. ¿Qué deseas hacer?" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
