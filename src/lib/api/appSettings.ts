import { supabase } from '../supabase/cliente';

export const appSettingsApi = {
    async obtenerPermisoRegistro(): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', 'allow_registration')
                .maybeSingle();

            if (error) {
                console.error("Error al obtener permiso de registro:", error);
                return true; // Default seguro
            }
            if (data?.value === 'false' || data?.value === false) {
                return false;
            }
            return true; // Si no existe o es true, permitir
        } catch (e) {
            console.error("Excepción al obtener permiso de registro:", e);
            return true;
        }
    },

    async actualizarPermisoRegistro(permitir: boolean): Promise<void> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                id: 'allow_registration',
                value: permitir ? 'true' : 'false',
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
    }
};
