# LicoresYaaa Catalog

Microservicio de catálogo comercial para administrar marcas, categorías,
productos, variantes e imágenes, y ofrecer consultas al escaparate digital.
Catalog es propietario de los datos comerciales de su dominio y
los persiste en PostgreSQL.

## Propósito y alcance

Catalog mantiene las marcas y categorías, los datos de productos, sus estados
de publicación, las presentaciones comerciales y sus precios, así como las
referencias y metadatos de imágenes. Expone rutas administrativas,
públicos e internos para consultar esos datos.

Catalog **no** administra existencias, reservas, pagos ni pedidos. Tampoco
almacena archivos de imagen: PostgreSQL conserva únicamente sus rutas. La
integración con un proveedor de almacenamiento, la carga y verificación física
de imágenes siguen pendientes. Por esa razón, eliminar una referencia responde
503 y conserva el registro.

## Tecnologías y arquitectura

- Node.js y TypeScript con NestJS 12, en modo ESM.
- PostgreSQL y Drizzle ORM / Drizzle Kit para persistencia y migraciones.
- `class-validator` y `class-transformer` para validar solicitudes.
- Swagger / OpenAPI para documentar las APIs.
- Vitest para pruebas unitarias, de persistencia y HTTP.
- pnpm para administrar dependencias y ejecutar comandos.

La aplicación inicia en `src/main.ts` y registra los módulos de marcas,
categorías, productos, variantes e imágenes desde `src/app.module.ts`. Cada
módulo separa controladores, servicios, DTOs y mapeadores. El esquema propiedad
de Catalog está en `src/infrastructure/database/schema/catalog.schema.ts`;
las migraciones están en `drizzle/`.

Los precios COP se almacenan como enteros `BIGINT` y las respuestas los
representan como cadenas decimales para preservar su precisión.

## Requisitos previos

- Node.js compatible con las versiones declaradas en las dependencias del
  proyecto.
- pnpm.
- PostgreSQL accesible mediante una URL de conexión.

El repositorio no fija una versión exacta de Node.js ni de pnpm; utiliza
versiones compatibles con las dependencias y el archivo `pnpm-lock.yaml`.

## Instalación y configuración local

Instala las dependencias:

```powershell
pnpm install
```

Crea `.env` a partir de `.env.example` y configura `DATABASE_URL` para una
base PostgreSQL local. No incluyas secretos en el repositorio. La
configuración de ejemplo apunta a `licoresyaaa`; crea esa base o cambia la URL
para apuntar a una base existente.

| Variable                     |              Requerida | Propósito                                                                                                                  |
| ---------------------------- | ---------------------: | -------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               |                     Sí | URL PostgreSQL usada por la aplicación y Drizzle Kit.                                                                      |
| `PORT`                       |                     No | Puerto HTTP; por defecto, `3002`.                                                                                          |
| `CATALOG_INTERNAL_API_TOKEN` |    Para administración | Token Bearer del BFF confiable. Debe tener al menos 32 caracteres.                                                         |
| `CATALOG_SERVICE_API_TOKEN`  | Para llamadas internas | Token Bearer exclusivo de servicios confiables. Debe tener al menos 32 caracteres y ser distinto del token administrativo. |
| `SWAGGER_ENABLED`            |                     No | Habilita las interfaces y especificaciones Swagger solo cuando vale `true`; por defecto no se exponen.                     |
| `POSTGRES_TEST_DATABASE_URL` |                     No | Base PostgreSQL dedicada a pruebas de integración. No uses una base con datos de usuario.                                  |

Si no está configurado el token administrativo, las operaciones
administrativas se deniegan. La autenticación administrativa requiere además
los encabezados `X-Actor-Id` y `X-Actor-Permissions`, que debe establecer un
BFF confiable después de autenticar al usuario y resolver sus permisos. Nunca
expongas estos tokens ni el contrato administrativo al navegador.

Las operaciones internas requieren `CATALOG_SERVICE_API_TOKEN`; no aceptan
como sustituto el token del BFF.

## Base de datos y migraciones

Drizzle Kit utiliza `drizzle.config.ts`, el esquema
`src/infrastructure/database/schema/catalog.schema.ts` y el directorio
`drizzle/`. Para generar una migración tras un cambio intencional de esquema y
aplicarla:

```powershell
pnpm db:generate
pnpm db:migrate
```

`pnpm db:migrate` aplica las migraciones pendientes en la base indicada por
`DATABASE_URL`. Verifica esa variable antes de ejecutarlo, especialmente si
usas una base compartida.

## Ejecución y comprobaciones

```powershell
pnpm start:dev
pnpm start:debug
pnpm build
pnpm start:prod
pnpm lint
pnpm test
pnpm test:postgres
pnpm test:e2e
pnpm test:cov
pnpm format
```

`pnpm start` inicia NestJS; `pnpm start:dev` lo inicia en modo de desarrollo.
`pnpm start:debug` inicia el modo de desarrollo con depuración.
`pnpm start:prod` ejecuta la compilación en `dist/` y requiere haber corrido
antes `pnpm build`. `pnpm test:watch` ejecuta Vitest en modo interactivo y
`pnpm test:debug` inicia el modo de depuración de Vitest. `pnpm format`
aplica Prettier a los archivos TypeScript de `src/` y `test/`.

Las pruebas PostgreSQL requieren una base dedicada en
`POSTGRES_TEST_DATABASE_URL`. Antes de ejecutarlas, configura también
`DATABASE_URL` temporalmente para apuntar a esa base y aplica allí las
migraciones con `pnpm db:migrate`; los runners leen
`POSTGRES_TEST_DATABASE_URL` y las pruebas e2e también usan esa URL al
inicializar la aplicación. Las pruebas PostgreSQL y e2e se omiten cuando no se
configura la URL de pruebas.

## APIs

Los nombres de rutas y propiedades que siguen son identificadores técnicos
y se mantienen literalmente.

### API pública

No requiere autenticación:

| Método y ruta                              | Descripción                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `GET /public/v1/products`                  | Lista productos publicados con paginación.                                |
| `GET /public/v1/products/:slug`            | Consulta el detalle de un producto publicado.                             |
| `GET /public/v1/brands`                    | Lista marcas activas.                                                     |
| `GET /public/v1/brands/:slug/products`     | Lista productos publicados de una marca activa.                           |
| `GET /public/v1/categories`                | Lista categorías activas.                                                 |
| `GET /public/v1/categories/tree`           | Consulta el árbol de categorías activas.                                  |
| `GET /public/v1/categories/:slug/products` | Lista productos publicados asociados directamente a una categoría activa. |

Las listas de productos devuelven `{items, page, limit, total}`. `page`
comienza en 1; `limit` vale 25 por defecto y tiene máximo de 100. Los filtros
disponibles son `search`, `brandSlug`, `categorySlug`, `isFeatured`,
`minPriceCop`, `maxPriceCop` y `sort`. La búsqueda es una subcadena literal,
sin comodines. Las categorías no incluyen descendientes. El rango de precio es
inclusivo y una misma variante activa debe cumplir ambos límites. Los valores
posibles de `sort` son `name` (predeterminado), `price_asc`, `price_desc` y
`newest`; los ordenamientos por precio usan el precio mínimo de las variantes
activas.

El detalle público incluye las variantes activas, sus precios e imágenes del
producto y de sus variantes activas. Los productos no publicados y las marcas
o categorías inactivas no se ofrecen en sus respectivas consultas públicas.
Las rutas de imagen son referencias, no URLs públicas.

### API administrativa

Las rutas administrativas requieren el token del BFF, `X-Actor-Id`,
`X-Actor-Permissions` y el permiso específico de cada operación.

| Recurso    | Rutas                                                                                                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marcas     | `GET /admin/v1/brands`, `GET /admin/v1/brands/:id`, `POST /admin/v1/brands`, `PATCH /admin/v1/brands/:id`, `PATCH /admin/v1/brands/:id/activate`, `PATCH /admin/v1/brands/:id/deactivate`                                                                                                 |
| Categorías | `GET /admin/v1/categories`, `GET /admin/v1/categories/tree`, `GET /admin/v1/categories/slug/:slug`, `GET /admin/v1/categories/:id`, `POST /admin/v1/categories`, `PATCH /admin/v1/categories/:id`, `PATCH /admin/v1/categories/:id/activate`, `PATCH /admin/v1/categories/:id/deactivate` |
| Productos  | `GET /admin/v1/products`, `GET /admin/v1/products/slug/:slug`, `GET /admin/v1/products/:id`, `POST /admin/v1/products`, `PATCH /admin/v1/products/:id`, `PATCH /admin/v1/products/:id/publish`, `PATCH /admin/v1/products/:id/archive`                                                    |
| Variantes  | `GET /admin/v1/products/:productId/variants`, `POST /admin/v1/products/:productId/variants`, `GET /admin/v1/variants/:id`, `PATCH /admin/v1/variants/:id`, `PATCH /admin/v1/variants/:id/activate`, `PATCH /admin/v1/variants/:id/deactivate`                                             |
| Imágenes   | `GET /admin/v1/products/:productId/images`, `POST /admin/v1/products/:productId/images`, `GET /admin/v1/images/:id`, `PATCH /admin/v1/images/:id`, `DELETE /admin/v1/images/:id`                                                                                                          |

Las listas administrativas de marcas, categorías, productos, variantes e
imágenes aceptan `page` y `limit` y devuelven `{items, page, limit, total}`.
También admiten estos filtros:

- Marcas: `search`, `isActive`.
- Categorías: `search`, `isActive`, `parentId`.
- Productos: `search`, `status`, `brandId`, `categoryId`, `isFeatured`.
- Variantes: `search`, `isActive`.
- Imágenes: `variantId`, `isPrimary`.

La búsqueda administrativa considera los campos indicados por el recurso;
`%` y `_` se tratan como caracteres literales. Los parámetros no reconocidos
o inválidos responden 400. La lista plana de categorías se pagina; el árbol
completo no se pagina.

Los permisos siguen los nombres `catalog.brands.*`,
`catalog.categories.*` y `catalog.products.*`, con acciones `read`, `create`,
`update` y `deactivate` según la operación. La activación requiere `update`.
Los cambios administrativos se registran en los registros de la aplicación; una
integración de auditoría durable sigue pendiente.

### API interna entre servicios

`GET /internal/v1/variants/:id` requiere
`Authorization: Bearer <CATALOG_SERVICE_API_TOKEN>`. Devuelve identificadores
UUID estables, estado del producto y variante, nombres, SKU, precio COP como
cadena decimal e `isPurchasable`. Este último solo vale `true` si la variante
está activa y su producto publicado. Las variantes inactivas pueden
consultarse para conservar referencias históricas. La respuesta incluye
`Cache-Control: no-store`; no reserva el precio ni impide cambios posteriores.

Commerce debe validar `isPurchasable` al confirmar la compra y conservar
capturas históricas de los precios de los pedidos, sin confiar en importes
enviados por clientes.
Inventory utiliza los UUID lógicos de las variantes; su estado de inventario
no pertenece a Catalog. Los servicios consumidores no deben conectarse
directamente a la base de datos de Catalog.

### Swagger / OpenAPI

Con `SWAGGER_ENABLED=true`, se exponen las interfaces y especificaciones
separadas:

| API            | Interfaz         | Especificación JSON   |
| -------------- | ---------------- | --------------------- |
| Administrativa | `/docs`          | `/docs-json`          |
| Pública        | `/public-docs`   | `/public-docs-json`   |
| Interna        | `/internal-docs` | `/internal-docs-json` |

Swagger documenta los contratos, pero no sustituye la autenticación ni la
autorización. La documentación está desactivada por defecto. Si se habilita
en un entorno desplegado, limita su acceso mediante la red o un proxy.

## Integraciones y límites

- PostgreSQL es la base de datos de Catalog; la aplicación y Drizzle Kit usan
  `DATABASE_URL`.
- El BFF confiable mantiene el token administrativo, autentica a sus usuarios
  y proporciona actor y permisos.
- Commerce consulta la API interna de variantes para validar la información
  comercial; implementar el consumidor y habilitar la confirmación de compra
  en Commerce
  corresponde a ese servicio.
- Inventory conserva referencias lógicas por UUID y administra existencias
  fuera de Catalog.
- No hay un proveedor de almacenamiento conectado. Las imágenes no se cargan,
  verifican ni eliminan físicamente desde esta versión.

## Consideraciones de mantenimiento

Los productos comienzan en `DRAFT`. Para publicar un producto se necesita al
menos una variante activa. No se puede desactivar la última variante activa
de un producto publicado. Archivar un producto lo oculta del escaparate digital; se
puede volver a publicar si conserva una variante activa.

Los SKU son únicos y los códigos de barras no nulos también. Los precios deben
ser positivos; cuando existe un precio de referencia, debe superar el precio
vigente. Las categorías activas requieren un padre activo, no se permiten
ciclos jerárquicos y una categoría con descendientes activos no puede
desactivarse.

Al añadir migraciones o cambiar los contratos, actualiza sus pruebas y
documentación. Usa siempre bases de datos dedicadas para pruebas y verifica
`DATABASE_URL` antes de migrar.
