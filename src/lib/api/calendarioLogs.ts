import { supabase } from '../supabase/cliente';
import { ActividadLog } from '../../types';

export const calendarioLogsApi = {
    async obtenerPorActividad(actividadId: string): Promise<ActividadLog[]> {
        const { data, error } = await supabase
            .from('actividad_calendario_logs')
            .select('*')
            .eq('actividad_id', actividadId)
            .order('fecha_registro', { ascending: false });

        if (error) throw error;

        // Obtener nombres de usuarios
        const { data: usersData } = await supabase.from('usuarios').select('id, nombre_completo');
        const usersMap = new Map((usersData || []).map(u => [u.id, u.nombre_completo]));

        return (data || []).map(log => ({
            ...log,
            cambiado_por_nombre: usersMap.get(log.cambiado_por) || 'Desconocido'
        })) as ActividadLog[];
    },

    async registrar(actividadId: string, cambiadoPor: string, campo: string, anterior: string, nuevo: string) {
        const { data, error } = await supabase
            .from('actividad_calendario_logs')
            .insert([{
                actividad_id: actividadId,
                cambiado_por: cambiadoPor,
                campo_modificado: campo,
                valor_anterior: anterior,
                valor_nuevo: nuevo
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
