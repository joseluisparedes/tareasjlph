import { supabase } from '../supabase/cliente';
import type { UsuarioFavorito } from '../supabase/tipos-bd';

export const favoritosApi = {
    async obtenerPorUsuario(usuarioId: string): Promise<UsuarioFavorito[]> {
        const { data, error } = await supabase
            .from('usuario_favoritos')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('fecha_creacion', { ascending: false });
        
        if (error) {
            console.error('Error al obtener favoritos:', error);
            throw error;
        }
        return data || [];
    },

    async crear(favorito: Omit<UsuarioFavorito, 'id' | 'fecha_creacion'>): Promise<UsuarioFavorito> {
        const { data, error } = await supabase
            .from('usuario_favoritos')
            .insert(favorito)
            .select()
            .single();

        if (error) {
            console.error('Error al crear favorito:', error);
            throw error;
        }
        return data;
    },

    async eliminar(id: string): Promise<void> {
        const { error } = await supabase
            .from('usuario_favoritos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error al eliminar favorito:', error);
            throw error;
        }
    }
};
