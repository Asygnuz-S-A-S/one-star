# Manifiestos de preparación para contracciones

Una migración destructiva sólo puede ejecutarse después de que una versión de la
aplicación deje de usar los objetos que va a retirar. Este directorio conserva
la evidencia versionada de esa preparación.

## Formato

Cada contrato vive en `prisma/migration-contracts/<id>.json`. El `<id>` usa
kebab-case (`a-z`, `0-9` y guiones), es único y coincide tanto con el campo
`id` como con el marcador de la migración posterior.

```json
{
  "version": 1,
  "id": "drop-product-legacy-code",
  "objects": ["column:Product.legacyCode"],
  "checks": {
    "applicationNoLongerUsesObjects": true,
    "backfillCompletedOrNotRequired": true,
    "backwardCompatibilityVerified": true,
    "rollbackPlanDocumented": true
  }
}
```

El esquema es estricto: no admite campos adicionales. `objects` contiene uno o
más objetivos canónicos, únicos y sin espacios al inicio o al final. Debe
coincidir exactamente (sin importar el orden) con los objetivos que el gate
extrae del DDL incompatible:

- `table:<tabla>` para `DROP/RENAME/TRUNCATE TABLE`.
- `column:<tabla>.<columna>` para `DROP/RENAME/ALTER COLUMN`, `SET NOT NULL` y
  `ADD COLUMN NOT NULL` sin default.
- `type:<tipo>` para `DROP TYPE`.
- `constraint:<tabla>.<constraint>` para `DROP CONSTRAINT`.

Los nombres calificados conservan sus segmentos (`public.Product`) y la caja de
identificadores entre comillas; los identificadores SQL sin comillas se
normalizan a minúsculas. Caracteres ambiguos o especiales dentro de un segmento
se codifican como porcentaje UTF-8 (`"legacy.code"` → `legacy%2Ecode`). El error
del gate informa la lista canónica esperada para que no haya que inferirla.

Todos los checks deben existir y ser literalmente `true`:

- `applicationNoLongerUsesObjects`: el código preparado ya no lee, escribe ni
  depende de los objetos enumerados.
- `backfillCompletedOrNotRequired`: el backfill terminó o se verificó que no
  aplica.
- `backwardCompatibilityVerified`: la versión anterior y la preparada se
  probaron contra el esquema expandido.
- `rollbackPlanDocumented`: existe un procedimiento para revertir la aplicación
  sin restaurar inmediatamente los objetos antiguos.

## Secuencia

1. Desplegar primero la expansión compatible.
2. Cambiar la aplicación, completar el backfill y crear o actualizar el
   manifiesto. El commit que modifica el manifiesto es el **commit de
   preparación**.
3. Desplegar ese commit y verificarlo. Desde ese momento el manifiesto no se
   edita: el gate exige que sus bytes en la rama base y en `HEAD` sean idénticos
   a los de dicho commit. También rechaza cualquier commit intermedio que haya
   tocado el archivo, aunque después restaure los mismos bytes. El SHA de
   preparación puede ser un merge que integra el manifiesto, siempre que el
   archivo cambie respecto de su primer padre; un merge ajeno no prepara nada.
   La misma prohibición de cambios intermedios aplica entre la base y `HEAD`.
4. En un PR y despliegue posterior, crear la migración destructiva con dos
   comentarios de línea reales:

   ```sql
   -- onestar:contract-after <sha-del-commit-de-preparacion>
   -- onestar:contract-id drop-product-legacy-code
   ```

5. Ejecutar `pnpm db:migrations:check --base <sha-base>` sobre commits. Antes de
   `prisma migrate deploy`, confirmar manualmente que el SHA de preparación fue
   desplegado en el entorno objetivo.

Cada ID se consume una sola vez: el gate rechaza duplicados entre migraciones
nuevas y marcadores `contract-id` ya presentes en las migraciones de la rama
base. Para comprobarlo sólo indexa esos marcadores históricos; no reevalúa su
DDL. Si cambia el alcance, los objetos o cualquier check después del commit de
preparación, se crea un ID y un manifiesto nuevos; no se recicla evidencia.

El gate sólo valida SQL top-level que puede analizar estáticamente. Una
migración nueva con `DO` o `CALL` top-level se rechaza; su cuerpo o procedimiento
podría ocultar DDL fuera del alcance verificable. El catálogo de DDL destructivo
no se amplía por esta regla y el análisis de DML permanece fuera de alcance.
