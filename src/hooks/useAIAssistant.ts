import { useState } from 'react';
import { supabase } from '../lib/supabase/cliente';

interface AIRequestParams {
    tipo: 'tarea' | 'iniciativa';
    modo: 'generar_pregunta' | 'procesar_accion';
    itemData: any;
    respuestaUsuario?: string;
}

export function useAIAssistant() {
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const callAIFunction = async (params: AIRequestParams) => {
        setCargando(true);
        setError(null);
        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant-reviewer', {
                body: params
            });

            if (error) {
                console.error("Error from edge function:", error);
                let message = error.message;
                try {
                    // Intentar extraer el mensaje de error del cuerpo si Supabase lo incluyó
                    const details = (error as any).context;
                    if (details && typeof details === 'object') {
                        message += ": " + JSON.stringify(details);
                    }
                } catch (e) {}
                throw new Error(message);
            }

            if (data?.success === false || data?.error) {
                 throw new Error(data.error || "Error desconocido en la función");
            }

            return data;
        } catch (err: any) {
            console.error("Detalle catch IA:", err);
            setError(err.message || "Error de red desconocido");
            return null;
        } finally {
            setCargando(false);
        }
    };

    return {
        cargando,
        error,
        callAIFunction
    };
}
