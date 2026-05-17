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

    async obtenerUmbralesEstatus(espacioId: string): Promise<{ yellow: number, red: number }> {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('id, value')
                .eq('espacio_id', espacioId)
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

    async actualizarUmbralesEstatus(espacioId: string, yellow: number, red: number): Promise<void> {
        const updateOrInsert = async (id: string, value: string) => {
            const { data: existing } = await supabase
                .from('app_settings')
                .select('id')
                .eq('id', id)
                .eq('espacio_id', espacioId)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('app_settings')
                    .update({ value, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .eq('espacio_id', espacioId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('app_settings')
                    .insert({ id, espacio_id: espacioId, value, updated_at: new Date().toISOString() });
                if (error) throw error;
            }
        };

        await Promise.all([
            updateOrInsert('status_threshold_yellow', yellow.toString()),
            updateOrInsert('status_threshold_red', red.toString())
        ]);
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
    },

    async obtenerConfigCampos(espacioId: string, tipo: 'import' | 'export'): Promise<string[]> {
        try {
            const id = tipo === 'import' ? 'import_fields_config' : 'export_fields_config';
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', id)
                .eq('espacio_id', espacioId)
                .maybeSingle();

            if (error) throw error;
            if (data?.value) {
                let val = data.value;
                if (typeof val === 'string') {
                    try {
                        val = JSON.parse(val);
                    } catch (e) {
                        return [];
                    }
                }
                if (Array.isArray(val)) {
                    return val;
                }
            }
            return []; // Por defecto vacío
        } catch (e) {
            console.error(`Error al obtener config de ${tipo}:`, e);
            return [];
        }
    },

    async actualizarConfigCampos(espacioId: string, tipo: 'import' | 'export', campos: string[]): Promise<void> {
        const id = tipo === 'import' ? 'import_fields_config' : 'export_fields_config';
        
        const { data: existing } = await supabase
            .from('app_settings')
            .select('id')
            .eq('id', id)
            .eq('espacio_id', espacioId)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('app_settings')
                .update({
                    value: JSON.stringify(campos),
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('espacio_id', espacioId);
            if (error) {
                console.error(`Error al actualizar config de ${tipo}:`, error);
                throw error;
            }
        } else {
            const { error } = await supabase
                .from('app_settings')
                .insert({
                    id,
                    espacio_id: espacioId,
                    value: JSON.stringify(campos),
                    updated_at: new Date().toISOString()
                });
            if (error) {
                console.error(`Error al insertar config de ${tipo}:`, error);
                throw error;
            }
        }
    }
};
