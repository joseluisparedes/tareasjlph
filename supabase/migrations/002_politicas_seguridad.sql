-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;

-- Políticas para tabla usuarios
CREATE POLICY ver_usuarios_autenticados ON usuarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY modificar_perfil_propio ON usuarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Políticas para tabla dominios
CREATE POLICY ver_dominios ON dominios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY gestionar_dominios_solo_admin ON dominios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol = 'Admin'
    )
  );

-- Políticas para tabla solicitudes
CREATE POLICY ver_todas_solicitudes ON solicitudes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY crear_solicitud_admin_editor ON solicitudes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol IN ('Admin', 'Editor')
    )
  );

CREATE POLICY modificar_solicitud_admin_editor ON solicitudes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol IN ('Admin', 'Editor')
    )
  );

CREATE POLICY eliminar_solicitud_solo_admin ON solicitudes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol = 'Admin'
    )
  );
