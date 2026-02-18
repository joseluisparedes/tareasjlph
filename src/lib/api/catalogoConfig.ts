import { supabase } from '../supabase/cliente';
import type { CatalogType, CatalogoConfig } from '../../types';

export const catalogoConfigApi = {
    async obtenerTodos(): Promise<CatalogoConfig[]> {
        const { data, error } = await supabase
            .from('catalogo_config')
            .select('*');
        if (error) throw error;
        return (data ?? []) as CatalogoConfig[];
    },

    async upsert(tipo: CatalogType, modo: 'desplegable' | 'cuadros'): Promise<void> {
        const { error } = await supabase
            .from('catalogo_config')
            .upsert({ tipo, modo_visualizacion: modo, fecha_actualizacion: new Date().toISOString() });
        if (error) throw error;
    },
};
