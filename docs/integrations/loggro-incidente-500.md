# Incidente API Loggro Pymes — HTTP 500 en consulta de productos

**Estado:** abierto · **Detectado:** 2026-07-30 · **Tenant:** NIT 1053799959 (One Star)

Reporte listo para enviar a soporte de Loggro. La integración de la tienda quedó
lista y a la espera; en cuanto el ERP responda, la sincronización entra sola.

---

## Resumen para soporte

> Buen día. Reportamos una falla en el API de **Loggro Pymes** (tenant NIT **1053799959**).
>
> Desde la carga del catálogo de calzado, **toda consulta de productos devuelve HTTP 500**:
>
> - `GET  /apik/loggro-inventario/v1/items?pagina=0&tamano=100` → 500
> - `GET  /apik/loggro-inventario/v1/items/{codigo}` → 500
> - `POST /apik/loggro-inventario/v1/productos/disponibilidad-productos` → 500
>
> **No es conectividad ni permisos**: con el mismo token y en el mismo módulo responden 200 OK
> `GET /estructura-empresarial/establecimientos`, `GET /productos/unidades-medida`
> y `GET /items?tipoItem=SERVICIO`. Falla únicamente al leer ítems **INVENTARIABLES**,
> en todas las páginas (incluso con `tamano=1`) y en las tres sedes.
>
> El endpoint de disponibilidad devuelve la excepción completa, que apunta a la causa:
>
> ```
> java.lang.IllegalArgumentException: Can not set boolean field
> com.loggro.inventario.dominio.producto.modelos.ProductoBase.asignarVersion to null value
>     at org.hibernate.property.access.spi.SetterFieldImpl.set(SetterFieldImpl.java:52)
>     at com.loggro.inventario.aplicacion.ProductoService.getListaAlternos(ProductoService.java:252)
>     at com.loggro.inventario.aplicacion.disponibilidad.DisponibilidadProductoService.resolverProductos(...:149)
> ```
>
> Es decir: al menos un registro de **`ProductoBase`** tiene la columna **`asignarVersion` en NULL**,
> y el mapeo la espera como `boolean` primitivo (no admite null), por lo que Hibernate
> falla al materializar la entidad y se cae toda la consulta.
>
> Sospechamos que los registros quedaron así por la importación masiva del catálogo.
> ¿Pueden normalizar ese campo (asignarle `false`/`true` según corresponda) en los
> `ProductoBase` del tenant y confirmarnos cuando esté resuelto?

---

## Evidencia recogida

| Petición | Resultado |
|---|---|
| `GET /estructura-empresarial/establecimientos` | ✅ 200 (devuelve las 3 tiendas) |
| `GET /productos/unidades-medida` | ✅ 200 (`["PAR"]`) |
| `GET /items?tipoItem=SERVICIO` | ✅ 200 (lista vacía) |
| `GET /items?tipoItem=NO_INVENTARIABLE` | ✅ 200 (lista vacía) |
| `GET /items` (sin filtro o `INVENTARIABLE`) | ❌ 500 |
| `GET /items?pagina=N&tamano=1` (varias páginas) | ❌ 500 |
| `GET /items/{codigo}` | ❌ 500 |
| `POST /productos/disponibilidad-productos` | ❌ 500 (expone el stack) |
| `GET /apik/loggro-enterprise/*` | 🚫 403 — otro producto, no contratado (irrelevante) |

## Cómo reintentar cuando Loggro confirme

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  --url "https://api.loggro.com/apik/loggro-inventario/v1/items?pagina=0&tamano=100" \
  --header "Authorization: Bearer $LOGGRO_API_TOKEN" \
  --header "Content-Type: application/json"
```

`200` = resuelto. Luego basta con **Sincronizar** en `/admin/integraciones`
(o esperar el ciclo automático de 30 min).

> Nota: el header `Content-Type: application/json` es obligatorio incluso en GET;
> sin él Loggro responde 415.
