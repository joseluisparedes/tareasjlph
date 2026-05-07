import { supabase } from '../supabase/cliente';
import { SolicitudStatusLog } from '../supabase/tipos-bd';

export const statusLogsApi = {
    async obtenerPorSolicitud(solicitudId: string): Promise<SolicitudStatusLog[]> {
        const { data, error } = await supabase
            .from('solicitud_status_log')
            .select('*')
            .eq('solicitud_id', solicitudId)
            .order('fecha_entrada', { ascending: false });

        if (error) {
            console.error("Error al obtener logs de estado:", error);
            return [];
        }
        return data || [];
    },

    async actualizarLog(logId: string, data: Partial<Pick<SolicitudStatusLog, 'fecha_entrada' | 'fecha_salida'>>): Promise<void> {
        const { error } = await supabase
            .from('solicitud_status_log')
            .update(data)
            .eq('id', logId);

        if (error) throw error;
    }
};
