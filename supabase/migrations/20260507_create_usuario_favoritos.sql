-- Tabla para almacenar selecciones favoritas de los usuarios
CREATE TABLE IF NOT EXISTS usuario_favoritos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    configuracion jsonb NOT NULL,
    fecha_creacion timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE usuario_favoritos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Los usuarios pueden ver sus propios favoritos" ON usuario_favoritos
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden crear sus propios favoritos" ON usuario_favoritos
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios favoritos" ON usuario_favoritos
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios favoritos" ON usuario_favoritos
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_usuario_favoritos_usuario ON usuario_favoritos(usuario_id);
