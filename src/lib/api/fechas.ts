import { supabase } from '../supabase/cliente';
import type { SolicitudFecha } from '../supabase/tipos-bd';

export const fechasApi = {
    async obtenerPorSolicitud(solicitudId: string): Promise<SolicitudFecha[]> {
        const { data, error } = await supabase
            .from('solicitud_fechas')
            .select('*')
            .eq('solicitud_id', solicitudId)
            .order('fecha_registro', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async registrar(
        solicitudId: string,
        tipo: 'inicio' | 'fin',
        fecha: string,
        cambiadoPor: string | null
    ): Promise<SolicitudFecha> {
        const { data, error } = await supabase
            .from('solicitud_fechas')
            .insert({
                solicitud_id: solicitudId,
                tipo,
                fecha,
                cambiado_por: cambiadoPor,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
};
