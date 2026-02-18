import { supabase } from '../supabase/cliente';
import type { Usuario } from '../supabase/tipos-bd';

export const usuariosApi = {
    async obtenerTodos(): Promise<Usuario[]> {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .order('nombre_completo');
        if (error) throw error;
        return data ?? [];
    },

    async obtenerPorId(id: string): Promise<Usuario> {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async obtenerPerfil(): Promise<Usuario | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        return this.obtenerPorId(user.id);
    },

    async actualizar(id: string, cambios: Partial<Pick<Usuario, 'nombre_completo' | 'url_avatar' | 'rol'>>): Promise<Usuario> {
        const { data, error } = await supabase
            .from('usuarios')
            .update(cambios)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
};
