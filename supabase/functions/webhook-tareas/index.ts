import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de pre-flight requests (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Solo aceptamos POST para crear la tarea
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Leemos el payload enviado por Power Automate
    const body = await req.json()
    let { titulo, descripcion, columna_id } = body;

    if (!titulo || !columna_id) {
       return new Response(JSON.stringify({ error: 'Falta título o el ID de la columna' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- PROCESAMIENTO SIN IA (Limpieza y Truncado) ---
    if (descripcion && descripcion.length > 0) {
      const limpiarHTML = (texto: string) => {
        return texto
          .replace(/<style[^>]*>.*<\/style>/gms, '')
          .replace(/<script[^>]*>.*<\/script>/gms, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const descripcionLimpia = limpiarHTML(descripcion);
      
      // IA deshabilitada: usamos solo fallback inteligente
      descripcion = descripcionLimpia.length <= 200 ? descripcionLimpia : descripcionLimpia.substring(0, 197) + "...";
    }
    // -------------------------------------

    // Creamos un cliente de Supabase usando el Service Role Key (para tener permisos de insertar sin un usuario logueado)
    // Las variables de entorno process.env en Deno para Supabase Edge Functions son automáticas
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usamos Service Role para saltar políticas RLS si es necesario
    )

    // Obtenemos el propietario de la columna para asignarle la tarea
    const { data: columnaData } = await supabaseClient
      .from('tareas_columnas')
      .select('creado_por')
      .eq('id', columna_id)
      .single()

    const propietario = columnaData ? columnaData.creado_por : null;

    // Calculamos el orden para que aparezca al inicio de la columna (top)
    const { data: tareasExistentes } = await supabaseClient
      .from('tareas')
      .select('orden')
      .eq('columna_id', columna_id)
      .order('orden', { ascending: true }) // Buscamos el mínimo
      .limit(1)

    const nuevoOrden = tareasExistentes && tareasExistentes.length > 0 ? tareasExistentes[0].orden - 1 : 0;

    // Insertamos la tarea
    const nuevaTarea = {
      titulo,
      descripcion: descripcion || null,
      columna_id,
      estado: 'Activa',
      urgencia: 'Verde',
      origen: 'integracion',
      orden: nuevoOrden,
      creado_por: propietario
    }

    const { data, error } = await supabaseClient
      .from('tareas')
      .insert(nuevaTarea)
      .select()
      .single()

    if (error) {
       console.error("Error al insertar:", error)
       return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(
      JSON.stringify({ success: true, tarea: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error("Error no controlado:", err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
