# Project Brief — One Star E-Commerce

## Contexto del Negocio

One Star es una tienda colombiana de calzado deportivo y lifestyle con presencia física y canal digital en construcción. Su identidad visual se apoya en una paleta de **Rojo One Star (#E31C23)** sobre fondos en gris concreto (#E0E0E0) y blanco, con tipografía Barlow (títulos) y Montserrat (cuerpo). Los referentes directos son Hype, BrokenChains y New Balance Colombia: tiendas que combinan editorial de marca con catálogo limpio y conversión ágil en móvil.

El proyecto se realiza en el dominio **www.tiendaonestar.com**.

## Objetivo del Proyecto

Construir la tienda online completa de One Star — catálogo, checkout, panel de administración y las integraciones de pago y CRM — de modo que el equipo pueda operar el negocio digital sin dependencia técnica externa permanente. El objetivo es poner en producción un sitio que permita:

- Publicar y gestionar un catálogo inicial de **200 productos en 7 categorías/marcas**.
- Aceptar pedidos con pasarela de pago (ePayco o MercadoPago) desde el primer día.
- Administrar inventario, pedidos y cupones desde el panel admin.
- Conectar el sistema con Alegra POS para sincronizar ventas e inventario.

## Usuarios Objetivo

| Perfil | Descripción | Canal principal |
|---|---|---|
| Comprador final | Jóvenes de 18–35 años, 85 %+ en móvil, buscan sneakers y calzado lifestyle | Tienda pública (shop) |
| Administrador / operador | Equipo One Star que gestiona productos, pedidos y banners sin conocimientos técnicos | Panel admin (`/admin`) |

## Métricas de Éxito

| Métrica | Target de lanzamiento |
|---|---|
| LCP en móvil | < 2.5 s (Core Web Vitals contractual) |
| Tasa de conversión | ≥ 2 % en los primeros 60 días |
| Pasos hasta checkout | ≤ 3 clics desde ficha de producto |
| Cobertura de test | ≥ 80 % en servicios y repositorios de servidor |
| Tiempo de carga de catálogo (200 productos) | < 1 s TTFB con caché |

## Alcance del Lanzamiento (MVP)

1. Catálogo navegable con filtros por género, marca, precio, color y talla.
2. Ficha de producto con galería (≥ 5 fotos + video clip opcional).
3. Carrito persistente + checkout con compra como invitado y pago vía ePayco/MercadoPago.
4. Registro y login de clientes (email/password + social) gestionados con better-auth.
5. Panel admin: CRUD de productos, gestión de pedidos, banners, cupones y clientes.
6. Email de confirmación de pedido personalizado con logo One Star.
7. Integración básica con Alegra POS.
8. Páginas legales estáticas (términos, privacidad, devoluciones).

## Fuera del Alcance Inicial

- Blog/contenido editorial (preparado pero no prioritario en MVP).
- Programa de fidelización completo.
- Plugin Addi para créditos en línea.
- Integración con Clientify u otro CRM.
- Agentes de IA para gestión de clientes.
