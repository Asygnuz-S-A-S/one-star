## Qué cambia y por qué
<!-- Una o dos frases, en lenguaje de negocio. -->

## Qué debe verse en la tienda / el admin después del despliegue
<!-- Puntos concretos que quien despliega o JM pueda comprobar a ojo. -->

## Revisión de seguridad (obligatoria, marcar cada punto o escribir "no aplica")
- [ ] **Permisos:** toda Server Action, ruta API o página nueva o modificada usa `requireAdmin("inventory" | "sales")` o el valor por defecto (solo Super Admin). Ninguna depende solo de ocultar el botón o el menú.
- [ ] **Datos de clientes:** nada expone correos, teléfonos, direcciones o exportaciones a un rol que no los necesite. Las exportaciones masivas son solo Super Admin.
- [ ] **Roles:** probé (o hay prueba automática) que un Operador de Inventario y uno de Ventas NO pueden llamar lo que no es suyo.
- [ ] **Secretos:** ninguna clave, token o valor por defecto en el código; si falta una variable de entorno, falla cerrado.
- [ ] **CSP y terceros:** no se agregaron orígenes de scripts amplios (unpkg, s3 completo, comodines); cada dominio nuevo está justificado.
- [ ] **Entradas y salidas:** validación en el servidor, sin SQL armado a mano, sin HTML sin escapar, enlaces con token de un solo uso y vencimiento.
- [ ] **Migraciones:** solo aditivas; probadas con `pnpm db:migrations:check`.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm test` en verde.
- [ ] Si va a `main`: subí el texto de versión del footer.
