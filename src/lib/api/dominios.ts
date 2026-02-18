import { supabase } from '../supabase/cliente';
import type { Dominio } from '../supabase/tipos-bd';

export const dominiosApi = {
    async obtenerTodos(): Promise<Dominio[]> {
        const { data, error } = await supabase
            .from('dominios')
            .select('*')
            .order('nombre');
        if (error) throw error;
        return data ?? [];
    },

    async obtenerActivos(): Promise<Dominio[]> {
        const { data, error } = await supabase
            .from('dominios')
            .select('*')
            .eq('esta_activo', true)
            .order('nombre');
        if (error) throw error;
        return data ?? [];
    },

    async crear(nombre: string): Promise<Dominio> {
        const { data, error } = await supabase
            .from('dominios')
            .insert({ nombre, esta_activo: true })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async actualizar(id: string, cambios: Partial<Pick<Dominio, 'nombre' | 'esta_activo'>>): Promise<Dominio> {
        const { data, error } = await supabase
            .from('dominios')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async eliminar(id: string): Promise<void> {
        const { error } = await supabase
            .from('dominios')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },
};
