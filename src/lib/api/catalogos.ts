import { supabase } from '../supabase/cliente';
import type { CatalogoItem, CatalogType } from '../../types';

export const catalogosApi = {
    async obtenerPorTipo(tipo: CatalogType): Promise<CatalogoItem[]> {
        const { data, error } = await supabase
            .from('catalogos')
            .select('*')
            .eq('tipo', tipo)
            .order('orden');
        if (error) throw error;
        return (data ?? []) as CatalogoItem[];
    },

    async obtenerTodos(): Promise<CatalogoItem[]> {
        const { data, error } = await supabase
            .from('catalogos')
            .select('*')
            .order('tipo')
            .order('orden');
        if (error) throw error;
        return (data ?? []) as CatalogoItem[];
    },

    async crear(tipo: CatalogType, valor: string, orden = 0): Promise<CatalogoItem> {
        const { data, error } = await supabase
            .from('catalogos')
            .insert({ tipo, valor, orden, esta_activo: true })
            .select()
            .single();
        if (error) throw error;
        return data as CatalogoItem;
    },

    async actualizar(id: string, cambios: Partial<Pick<CatalogoItem, 'valor' | 'esta_activo' | 'orden' | 'color'>>): Promise<CatalogoItem> {
        const { data, error } = await supabase
            .from('catalogos')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as CatalogoItem;
    },

    async eliminar(id: string): Promise<void> {
        const { error } = await supabase.from('catalogos').delete().eq('id', id);
        if (error) throw error;
    },
};
