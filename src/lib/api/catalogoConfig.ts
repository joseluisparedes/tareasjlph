import { supabase } from '../supabase/cliente';
import type { CatalogType, CatalogoConfig } from '../../types';

export const catalogoConfigApi = {
    async obtenerTodos(espacioId: string): Promise<CatalogoConfig[]> {
        const { data, error } = await supabase
            .from('catalogo_config')
            .select('*')
            .eq('espacio_id', espacioId);
        if (error) throw error;
        return (data ?? []) as CatalogoConfig[];
    },

    async upsert(tipo: CatalogType, modo: 'desplegable' | 'cuadros', espacioId: string): Promise<void> {
        const { error } = await supabase
            .from('catalogo_config')
            .upsert({ 
                tipo, 
                espacio_id: espacioId,
                modo_visualizacion: modo, 
                fecha_actualizacion: new Date().toISOString() 
            });
        if (error) throw error;
    },
};
