import { supabase } from '../supabase/cliente';
import type { SolicitudApunte } from '../supabase/tipos-bd';

export const apuntesApi = {
    async obtenerPorSolicitud(solicitudId: string): Promise<SolicitudApunte[]> {
        const { data, error } = await supabase
            .from('solicitud_apuntes')
            .select('*')
            .eq('solicitud_id', solicitudId)
            .order('fecha_creacion', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async crear(
        solicitudId: string,
        nota: string,
        creadoPor: string | null
    ): Promise<SolicitudApunte> {
        const { data, error } = await supabase
            .from('solicitud_apuntes')
            .insert({
                solicitud_id: solicitudId,
                nota,
                creado_por: creadoPor,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async actualizar(id: string, nota: string): Promise<SolicitudApunte> {
        const { data, error } = await supabase
            .from('solicitud_apuntes')
            .update({ nota })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async eliminar(id: string): Promise<void> {
        const { error } = await supabase
            .from('solicitud_apuntes')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },
};
