import { supabase } from '../supabase/cliente';
import type { Dominio } from '../supabase/tipos-bd';

export const dominiosApi = {
    async obtenerTodos(espacioId: string): Promise<Dominio[]> {
        const { data, error } = await supabase
            .from('dominios')
            .select('*')
            .eq('espacio_id', espacioId)
            .order('orden', { ascending: true })
            .order('nombre');
        if (error) throw error;
        return data ?? [];
    },

    async obtenerActivos(espacioId: string): Promise<Dominio[]> {
        const { data, error } = await supabase
            .from('dominios')
            .select('*')
            .eq('espacio_id', espacioId)
            .eq('esta_activo', true)
            .order('orden', { ascending: true })
            .order('nombre');
        if (error) throw error;
        return data ?? [];
    },

    async crear(nombre: string, espacioId: string): Promise<Dominio> {
        const { data, error } = await supabase
            .from('dominios')
            .insert({ nombre, esta_activo: true, espacio_id: espacioId })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async actualizar(id: string, cambios: Partial<Pick<Dominio, 'nombre' | 'esta_activo' | 'orden'>>): Promise<Dominio> {
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
