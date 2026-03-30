import { supabase } from '../supabase/cliente';
import type { Solicitud } from '../supabase/tipos-bd';

export const solicitudesApi = {
    async obtenerTodas(): Promise<any[]> {
        const { data, error } = await supabase
            .from('solicitudes')
            .select('*, usuarios!solicitudes_creado_por_fkey(nombre_completo)')
            .order('fecha_creacion', { ascending: false });
        if (error) throw error;
        return data ?? [];
    },

    async obtenerPorId(id: string): Promise<any> {
        const { data, error } = await supabase
            .from('solicitudes')
            .select('*, usuarios!solicitudes_creado_por_fkey(nombre_completo)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async crear(solicitud: Omit<Solicitud, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>): Promise<Solicitud> {
        // Generar ID automáticamente con la función SQL
        const { data: idData, error: idError } = await supabase
            .rpc('generar_id_solicitud');
        if (idError) throw idError;

        const { data, error } = await supabase
            .from('solicitudes')
            .insert({ ...solicitud, id: idData })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async actualizar(id: string, cambios: Partial<Omit<Solicitud, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>>): Promise<Solicitud> {
        const { data, error } = await supabase
            .from('solicitudes')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async cambiarEstado(id: string, estado: Solicitud['estado']): Promise<Solicitud> {
        return this.actualizar(id, { estado });
    },

    async eliminar(id: string): Promise<void> {
        const { error } = await supabase
            .from('solicitudes')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },
};
