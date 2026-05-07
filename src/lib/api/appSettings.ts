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

    async obtenerUmbralesEstatus(): Promise<{ yellow: number, red: number }> {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('id, value')
                .in('id', ['status_threshold_yellow', 'status_threshold_red']);

            if (error) throw error;

            const yellow = data?.find(d => d.id === 'status_threshold_yellow')?.value;
            const red = data?.find(d => d.id === 'status_threshold_red')?.value;

            return {
                yellow: yellow ? parseInt(yellow) : 7,
                red: red ? parseInt(red) : 14
            };
        } catch (e) {
            console.error("Error al obtener umbrales de estatus:", e);
            return { yellow: 7, red: 14 };
        }
    },

    async actualizarUmbralesEstatus(yellow: number, red: number): Promise<void> {
        const { error } = await supabase
            .from('app_settings')
            .upsert([
                { id: 'status_threshold_yellow', value: yellow.toString(), updated_at: new Date().toISOString() },
                { id: 'status_threshold_red', value: red.toString(), updated_at: new Date().toISOString() }
            ]);

        if (error) throw error;
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
