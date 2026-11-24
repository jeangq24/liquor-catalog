# Liquor Catalog — Implementación técnica, modelo físico y migración inicial

**Servicio:** `liquor-catalog`  
**Versión:** 1.0  
**Base de datos:** PostgreSQL  
**ORM:** Drizzle ORM  
**Backend:** NestJS + TypeScript  
**Estado:** Propuesta técnica para implementación local

---

## 1. Objetivo

Implementar el servicio responsable de administrar el catálogo comercial de Licorera Online.

Catalog será la fuente de verdad para:

- Marcas.
- Categorías.
- Productos.
- Variantes comerciales.
- Precios de venta.
- Imágenes y recursos visuales.
- Publicación y disponibilidad comercial de productos.

El servicio no administrará existencias, reservas, movimientos de inventario, pedidos ni pagos.

## 2. Responsabilidades y límites

| Dominio | Servicio propietario |
|---|---|
| Marcas y categorías | Catalog |
| Productos y descripciones | Catalog |
| Variantes y SKU | Catalog |
| Precios comerciales | Catalog |
| Imágenes de productos | Catalog |
| Existencias y disponibilidad física | Inventory |
| Reservas y movimientos | Inventory |
| Carritos y órdenes | Commerce |
| Precios históricos de órdenes | Commerce |

### Referencias entre servicios

Las relaciones entre servicios serán referencias UUID lógicas.

- `inventory.stock_balances.variant_id` referencia conceptualmente `catalog.product_variants.id`.
- `commerce.order_items.variant_id` referencia conceptualmente `catalog.product_variants.id`.
- No se crearán FK entre esquemas de distintos servicios.
- Ningún servicio accederá directamente a las tablas de otro servicio.

Catalog será responsable de garantizar la integridad de sus propias relaciones.

---

## 3. Arquitectura técnica

### Stack

| Componente | Tecnología |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Lenguaje | TypeScript |
| Persistencia | PostgreSQL |
| ORM | Drizzle ORM |
| Validación | class-validator / class-transformer |
| Documentación | Swagger / OpenAPI |
| Imágenes | Supabase Storage |
| Pruebas | Jest + PostgreSQL |

### Estructura lógica del servicio

```text
liquor-catalog/
├── src/
│   ├── config/
│   ├── database/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── database.module.ts
│   ├── brands/
│   ├── categories/
│   ├── products/
│   ├── product-variants/
│   ├── product-images/
│   ├── public-catalog/
│   ├── internal/
│   ├── common/
│   ├── app.module.ts
│   └── main.ts
├── drizzle/
├── test/
├── .env.example
├── drizzle.config.ts
└── package.json
```

Cada módulo tendrá sus responsabilidades de aplicación, dominio, persistencia y exposición HTTP, sin necesidad de introducir una arquitectura excesivamente compleja para el MVP.

### Base de datos

Se utilizará el mismo proyecto PostgreSQL que los demás servicios, pero con un esquema independiente:

```text
PostgreSQL
│
├── app
├── catalog
├── commerce
├── inventory
│
└── auth / storage (Supabase)
```

Catalog tendrá sus propias migraciones y credenciales de acceso.

---

## 4. Modelo físico de datos

Se implementarán seis tablas iniciales.

### 4.1 `catalog.brands`

Representa las marcas comerciales.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(120) | NOT NULL |
| slug | VARCHAR(140) | UNIQUE, NOT NULL |
| description | TEXT | NULL |
| logo_path | TEXT | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Reglas:

- El nombre identifica la marca comercial.
- El slug permite identificarla mediante URL.
- Una marca inactiva no debe aparecer en el catálogo público.
- No se eliminará físicamente una marca asociada a productos.

### 4.2 `catalog.categories`

Representa las categorías de productos.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| parent_id | UUID | FK nullable, misma tabla |
| name | VARCHAR(120) | NOT NULL |
| slug | VARCHAR(140) | UNIQUE, NOT NULL |
| description | TEXT | NULL |
| image_path | TEXT | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| sort_order | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Reglas:

- Se soportarán categorías y subcategorías.
- `parent_id` permitirá una estructura jerárquica.
- Una categoría puede tener múltiples productos.
- Una categoría inactiva no se mostrará en el storefront.
- Se debe evitar que una categoría sea su propia categoría padre.

Ejemplos iniciales:

- Whisky.
- Ron.
- Aguardiente.
- Tequila.
- Vodka.
- Ginebra.
- Vinos.
- Cervezas.
- Aperitivos.
- Otros productos.

La estructura inicial de categorías se cargará posteriormente mediante datos semilla.

### 4.3 `catalog.products`

Representa la ficha comercial de un producto.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| brand_id | UUID | FK nullable |
| name | VARCHAR(180) | NOT NULL |
| slug | VARCHAR(200) | UNIQUE, NOT NULL |
| short_description | VARCHAR(300) | NULL |
| description | TEXT | NULL |
| status | ENUM | NOT NULL |
| is_featured | BOOLEAN | NOT NULL DEFAULT FALSE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| published_at | TIMESTAMPTZ | NULL |

Estados:

- `DRAFT`: producto en preparación.
- `PUBLISHED`: producto publicado.
- `ARCHIVED`: producto retirado del catálogo.

Reglas:

- Un producto puede tener una marca o ser genérico.
- Un producto puede pertenecer a múltiples categorías.
- Un producto puede tener múltiples variantes.
- El producto no se podrá publicar sin al menos una variante activa y válida.
- Un producto archivado no estará disponible en el catálogo público.

### 4.4 `catalog.product_categories`

Tabla intermedia para la relación muchos a muchos entre productos y categorías.

| Campo | Tipo | Restricción |
|---|---|---|
| product_id | UUID | PK compuesta, FK |
| category_id | UUID | PK compuesta, FK |
| created_at | TIMESTAMPTZ | NOT NULL |

Reglas:

- Un producto puede pertenecer a varias categorías.
- Una categoría puede contener varios productos.
- No se permiten relaciones duplicadas.
- Las relaciones se eliminan al eliminar físicamente un producto o categoría, siempre que las restricciones internas lo permitan.

### 4.5 `catalog.product_variants`

Representa las unidades comerciales vendibles.

Esta entidad es especialmente importante porque Inventory y Commerce utilizarán su UUID como referencia lógica.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK, NOT NULL |
| name | VARCHAR(120) | NOT NULL |
| sku | VARCHAR(80) | UNIQUE, NOT NULL |
| barcode | VARCHAR(80) | UNIQUE, NULL |
| volume_ml | INTEGER | NULL, > 0 |
| units_per_pack | INTEGER | NOT NULL DEFAULT 1 |
| price_cop | BIGINT | NOT NULL, > 0 |
| compare_at_price_cop | BIGINT | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Reglas:

- Cada variante pertenece a un producto.
- Cada variante tiene un SKU único.
- El SKU identifica la unidad comercial dentro de Catalog.
- `volume_ml` representa la capacidad en mililitros cuando aplique.
- `units_per_pack` permite representar presentaciones con varias unidades.
- `price_cop` representa el precio actual de venta.
- `compare_at_price_cop` permite mostrar un precio de referencia cuando exista una promoción.
- El precio de referencia debe ser mayor que el precio de venta.
- Una variante inactiva no se ofrecerá para nuevas compras.
- No se debe eliminar físicamente una variante que tenga referencias históricas en otros servicios.

Ejemplos:

| Producto | Variante | SKU |
|---|---|---|
| Whisky Chivas Regal | 750 ml | CHIVAS-750 |
| Whisky Chivas Regal | 1.000 ml | CHIVAS-1000 |
| Ron Medellín | 750 ml | RONMED-750 |
| Aguardiente | 375 ml | AGUARD-375 |

La variante será la unidad de integración con Inventory.

### 4.6 `catalog.product_images`

Representa las imágenes asociadas a productos o variantes.

| Campo | Tipo | Restricción |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK, NOT NULL |
| variant_id | UUID | FK nullable |
| storage_path | TEXT | UNIQUE, NOT NULL |
| alt_text | VARCHAR(200) | NULL |
| is_primary | BOOLEAN | NOT NULL DEFAULT FALSE |
| sort_order | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMPTZ | NOT NULL |

Reglas:

- Una imagen puede pertenecer a un producto o a una variante.
- Si `variant_id` está presente, debe pertenecer al mismo producto indicado en `product_id`. Esta validación se realizará en la capa de aplicación o mediante una restricción adicional.
- `storage_path` almacena la ubicación del recurso en Supabase Storage.
- No se almacenarán archivos binarios en PostgreSQL.
- Se permitirá ordenar las imágenes.
- Se permitirá una imagen principal por producto y una por variante.

---

## 5. Relaciones del modelo

```text
brands
  │
  └── 1:N ── products
                │
                ├── 1:N ── product_variants
                │               │
                │               └── 1:N ── product_images
                │
                ├── 1:N ── product_images
                │
                └── N:M ── categories
                              │
                              └── product_categories
```

Relaciones internas:

- `brands.id` → `products.brand_id`.
- `products.id` → `product_variants.product_id`.
- `products.id` → `product_categories.product_id`.
- `categories.id` → `product_categories.category_id`.
- `categories.id` → `categories.parent_id`.
- `products.id` → `product_images.product_id`.
- `product_variants.id` → `product_images.variant_id`.

Relaciones externas lógicas:

- `product_variants.id` → `inventory.stock_balances.variant_id`.
- `product_variants.id` → `inventory.stock_movements.variant_id`.
- `product_variants.id` → `commerce.order_items.variant_id`.

Estas últimas no serán FK físicas.

---

## 6. Migración inicial SQL

Archivo:

`drizzle/0001_create_catalog_schema.sql`

La migración crea el esquema, los ENUM, las tablas, las relaciones internas, las restricciones y los índices.

```sql
BEGIN;

CREATE SCHEMA IF NOT EXISTS catalog;

-- ENUMS

CREATE TYPE catalog.product_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED'
);

-- BRANDS

CREATE TABLE catalog.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  logo_path TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATEGORIES

CREATE TABLE catalog.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  parent_id UUID,

  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  image_path TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id)
    REFERENCES catalog.categories(id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_category_not_own_parent
    CHECK (parent_id IS NULL OR parent_id <> id)
);

-- PRODUCTS

CREATE TABLE catalog.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  brand_id UUID,

  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,

  short_description VARCHAR(300),
  description TEXT,

  status catalog.product_status NOT NULL DEFAULT 'DRAFT',

  is_featured BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  CONSTRAINT fk_products_brand
    FOREIGN KEY (brand_id)
    REFERENCES catalog.brands(id)
    ON DELETE RESTRICT
);

-- PRODUCT VARIANTS

CREATE TABLE catalog.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID NOT NULL,

  name VARCHAR(120) NOT NULL,

  sku VARCHAR(80) NOT NULL UNIQUE,
  barcode VARCHAR(80) UNIQUE,

  volume_ml INTEGER,
  units_per_pack INTEGER NOT NULL DEFAULT 1,

  price_cop BIGINT NOT NULL,
  compare_at_price_cop BIGINT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_variants_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.products(id)
    ON DELETE RESTRICT,

  CONSTRAINT chk_variant_volume
    CHECK (volume_ml IS NULL OR volume_ml > 0),

  CONSTRAINT chk_variant_pack_quantity
    CHECK (units_per_pack > 0),

  CONSTRAINT chk_variant_price
    CHECK (price_cop > 0),

  CONSTRAINT chk_variant_compare_price
    CHECK (
      compare_at_price_cop IS NULL
      OR compare_at_price_cop > price_cop
    )
);

-- PRODUCT CATEGORIES

CREATE TABLE catalog.product_categories (
  product_id UUID NOT NULL,
  category_id UUID NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_product_categories
    PRIMARY KEY (product_id, category_id),

  CONSTRAINT fk_product_categories_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.products(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_product_categories_category
    FOREIGN KEY (category_id)
    REFERENCES catalog.categories(id)
    ON DELETE RESTRICT
);

-- PRODUCT IMAGES

CREATE TABLE catalog.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID NOT NULL,
  variant_id UUID,

  storage_path TEXT NOT NULL UNIQUE,
  alt_text VARCHAR(200),

  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id)
    REFERENCES catalog.products(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_product_images_variant
    FOREIGN KEY (variant_id)
    REFERENCES catalog.product_variants(id)
    ON DELETE RESTRICT
);

-- INDEXES

CREATE INDEX idx_products_brand
  ON catalog.products(brand_id);

CREATE INDEX idx_products_status
  ON catalog.products(status);

CREATE INDEX idx_products_featured
  ON catalog.products(is_featured)
  WHERE is_featured = TRUE;

CREATE INDEX idx_categories_parent
  ON catalog.categories(parent_id);

CREATE INDEX idx_categories_active_order
  ON catalog.categories(is_active, sort_order);

CREATE INDEX idx_variants_product
  ON catalog.product_variants(product_id);

CREATE INDEX idx_variants_active
  ON catalog.product_variants(product_id, is_active);

CREATE INDEX idx_variants_price
  ON catalog.product_variants(price_cop);

CREATE INDEX idx_product_categories_category
  ON catalog.product_categories(category_id);

CREATE INDEX idx_product_images_product_order
  ON catalog.product_images(product_id, sort_order);

CREATE INDEX idx_product_images_variant_order
  ON catalog.product_images(variant_id, sort_order)
  WHERE variant_id IS NOT NULL;

-- Only one primary image per product when no variant is specified.

CREATE UNIQUE INDEX uq_product_primary_image
  ON catalog.product_images(product_id)
  WHERE variant_id IS NULL AND is_primary = TRUE;

-- Only one primary image per variant.

CREATE UNIQUE INDEX uq_variant_primary_image
  ON catalog.product_images(variant_id)
  WHERE variant_id IS NOT NULL AND is_primary = TRUE;

COMMIT;
```

**Nota de migraciones:** esta migración se ejecuta una sola vez mediante el sistema de migraciones de Drizzle. No debe utilizarse como script de reinicialización de una base ya migrada. Los ENUM y las tablas se gestionarán mediante migraciones versionadas.

---

## 7. Configuración de Drizzle

El esquema TypeScript deberá reflejar exactamente la estructura PostgreSQL.

Archivos previstos:

```text
src/database/schema/
├── brands.schema.ts
├── categories.schema.ts
├── products.schema.ts
├── product-variants.schema.ts
├── product-categories.schema.ts
├── product-images.schema.ts
└── index.ts
```

Configuración:

- Dialecto PostgreSQL.
- Esquema de propiedad `catalog`.
- Migraciones generadas y versionadas.
- Tipos UUID para identificadores.
- BIGINT para valores monetarios.
- TIMESTAMPTZ para fechas.
- ENUM de PostgreSQL para estados.

Los valores monetarios deben manejarse como enteros en COP, evitando cálculos de dinero mediante números decimales de punto flotante.

---

## 8. Contratos y API REST

Se propone separar las operaciones públicas de consulta de las operaciones administrativas.

### 8.1 Catálogo público

| Método | Endpoint | Responsabilidad |
|---|---|---|
| GET | `/public/v1/products` | Listar productos publicados |
| GET | `/public/v1/products/:slug` | Consultar detalle de producto |
| GET | `/public/v1/categories` | Listar categorías activas |
| GET | `/public/v1/categories/:slug/products` | Productos por categoría |
| GET | `/public/v1/brands` | Listar marcas activas |
| GET | `/public/v1/brands/:slug/products` | Productos por marca |

Filtros previstos para productos:

- Búsqueda por nombre.
- Categoría.
- Marca.
- Rango de precio.
- Productos destacados.
- Paginación.
- Ordenamiento.

Las respuestas públicas deben incluir las variantes activas, precios e imágenes correspondientes.

### 8.2 Administración

| Método | Endpoint | Responsabilidad |
|---|---|---|
| POST | `/admin/v1/brands` | Crear marca |
| PATCH | `/admin/v1/brands/:id` | Actualizar marca |
| POST | `/admin/v1/categories` | Crear categoría |
| PATCH | `/admin/v1/categories/:id` | Actualizar categoría |
| POST | `/admin/v1/products` | Crear producto |
| PATCH | `/admin/v1/products/:id` | Actualizar producto |
| POST | `/admin/v1/products/:id/variants` | Crear variante |
| PATCH | `/admin/v1/variants/:id` | Actualizar variante |
| POST | `/admin/v1/products/:id/images` | Registrar imagen |
| PATCH | `/admin/v1/products/:id/publish` | Publicar producto |
| PATCH | `/admin/v1/products/:id/archive` | Archivar producto |

Los endpoints administrativos requerirán autenticación y permisos.

### 8.3 Integración interna

Commerce necesita validar productos y obtener información comercial vigente.

Se propone:

`GET /internal/v1/variants/:id`

Respuesta conceptual:

```json
{
  "id": "uuid",
  "productId": "uuid",
  "productName": "Whisky Chivas Regal",
  "variantName": "750 ml",
  "sku": "CHIVAS-750",
  "priceCop": 120000,
  "isActive": true
}
```

Inventory necesita identificar las variantes y, cuando corresponda, validar que una referencia de variante sea válida.

No se permitirá que Inventory consulte directamente PostgreSQL de Catalog.

---

## 9. Integración con los demás servicios

### Catalog + Inventory

Catalog proporciona la identidad comercial de la variante.

Inventory administra:

- Cantidad física.
- Cantidad reservada.
- Cantidad disponible.
- Movimientos.
- Reservas.
- Devoluciones.

Catalog no almacenará cantidades de inventario.

### Catalog + Commerce

Commerce consultará Catalog durante el checkout para validar:

1. Que el producto existe.
2. Que la variante existe.
3. Que la variante está activa.
4. Que el producto está publicado.
5. Cuál es el precio comercial vigente.

Commerce guardará una copia histórica de los datos necesarios en `order_items`.

Un cambio posterior de nombre o precio en Catalog no debe modificar una orden ya creada.

---

## 10. Gestión de imágenes

Se utilizará Supabase Storage.

Propuesta de organización:

```text
catalog-products/
├── products/
│   └── {productId}/
│       ├── main.webp
│       └── gallery/
│           ├── image-01.webp
│           └── image-02.webp
│
└── variants/
    └── {variantId}/
        └── main.webp
```

PostgreSQL conservará el `storage_path`, no el archivo.

Las imágenes del catálogo público podrán servirse mediante URLs públicas del bucket o una política de acceso equivalente. Los recursos administrativos y cualquier documento privado deberán mantenerse separados.

---

## 11. Reglas de negocio y validaciones

1. No se puede publicar un producto sin una variante activa.
2. El SKU debe ser único.
3. Los precios deben ser positivos.
4. El precio de referencia, cuando exista, debe superar el precio actual.
5. Una variante debe pertenecer a un producto existente.
6. No se puede eliminar una marca que esté asociada a productos.
7. No se puede eliminar una categoría que tenga productos asociados.
8. No se deben eliminar variantes que puedan tener referencias históricas externas.
9. Una variante inactiva no debe estar disponible para nuevas compras.
10. Los productos archivados no deben aparecer en consultas públicas.
11. Los cambios de precio no modifican órdenes históricas.
12. Las operaciones administrativas deben quedar preparadas para auditoría.

La confirmación de mayoría de edad se mantendrá en el flujo del storefront. No se necesita almacenar información sensible de identidad en Catalog para implementar esta primera versión.

---

## 12. Estrategia de pruebas

### Persistencia

- Crear marcas.
- Crear categorías y subcategorías.
- Crear productos.
- Crear variantes.
- Relacionar productos y categorías.
- Registrar imágenes.
- Validar unicidad de SKU y slug.
- Validar restricciones de precio.
- Validar integridad de relaciones.

### Dominio

- Publicar producto sin variantes.
- Desactivar variante.
- Archivar producto.
- Intentar eliminar marca asociada.
- Intentar eliminar categoría asociada.
- Actualizar precios.
- Consultar productos con varias categorías.

### API

- Listar catálogo público.
- Filtrar por categoría.
- Filtrar por marca.
- Buscar por nombre.
- Consultar detalle por slug.
- Consultar variante por UUID.
- Intentar acceder a endpoints administrativos sin permisos.

### Integración

- Commerce consulta una variante activa.
- Commerce recibe el precio vigente.
- Commerce rechaza variantes inactivas.
- Inventory utiliza el UUID lógico de una variante.
- Una modificación de precio no altera órdenes anteriores.

---

## 13. Decisiones pendientes de confirmación

| Decisión | Propuesta inicial |
|---|---|
| Moneda | COP exclusivamente en MVP |
| Precio comercial | A nivel de variante |
| Presentaciones | `volume_ml` y `units_per_pack` |
| SKU | Obligatorio y único |
| Categorías | Jerarquía con relación N:M |
| Imágenes | Supabase Storage |
| Eliminación | Desactivación o archivado |
| Variantes | Siempre existe al menos una por producto publicado |
| Precio histórico | Responsabilidad de Commerce |
| Stock | Exclusivamente Inventory |


**Resultado esperado:** un servicio Catalog independiente, con persistencia propia, responsable de la información comercial y preparado para integrarse con los servicios Inventory y Commerce sin acoplamiento a sus bases de datos.

14. Definition of Done

La implementación inicial de Catalog se considerará terminada cuando:

El proyecto NestJS se ejecute localmente.

PostgreSQL esté conectado.

El esquema catalog esté creado.

Las seis tablas estén implementadas.

Las restricciones e índices estén aplicados.

Drizzle refleje el modelo físico.

La migración funcione desde una base limpia.

Los módulos de marcas, categorías, productos, variantes e imágenes funcionen.

Las consultas públicas estén implementadas.

Los endpoints administrativos estén protegidos.

Swagger documente los contratos.

Las pruebas unitarias y de integración estén aprobadas.

Commerce pueda consultar variantes y precios.

Inventory pueda utilizar los UUID lógicos de las variantes.

15. Orden recomendado de implementación

Preparación del repositorio y entorno local.

Configuración PostgreSQL y Drizzle.

Modelo físico y migración inicial.

Módulos de marcas y categorías.

Módulo de productos.

Módulo de variantes.

Gestión de imágenes.

API administrativa.

API pública del catálogo.

Integración con Commerce e Inventory.

Pruebas integrales y documentación.

Resultado esperado: un servicio Catalog independiente, con persistencia propia, responsable de la información comercial y preparado para integrarse con los servicios Inventory y Commerce sin acoplamiento a sus bases de datos.