<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Database

The service uses PostgreSQL and Drizzle ORM. Create a local `.env` from the
example and set `DATABASE_URL` to the PostgreSQL connection string:

```powershell
Copy-Item .env.example .env
```

Drizzle Kit reads the schema from
`src/infrastructure/database/schema/catalog.schema.ts` and writes versioned
migrations to `drizzle/`. Generate and apply migrations with:

```bash
pnpm db:generate
pnpm db:migrate
```

The local database used by `.env.example` is `licoresyaaa`; create it before
applying migrations. In Supabase, use the platform connection string and keep
the `catalog` schema as the service-owned schema.

To run the PostgreSQL schema tests, configure `POSTGRES_TEST_DATABASE_URL` with
a dedicated test database, apply the migrations to it, and run
`pnpm test:postgres`. Run `pnpm test:e2e` to test the HTTP API against the same
dedicated database. These database-dependent tests are skipped if the test
database URL is not set.

## Brands and categories

The public endpoints `GET /public/v1/brands`, `GET /public/v1/categories`,
and `GET /public/v1/categories/tree` return active entries. Administrative
endpoints live under `/admin/v1/brands` and `/admin/v1/categories`. They
support list, get by ID, create, update, activate and deactivate; categories
also support `GET /tree` and `GET /slug/:slug`.

Administrative requests require `Authorization: Bearer <CATALOG_INTERNAL_API_TOKEN>`,
`X-Actor-Id` (a UUID), and `X-Actor-Permissions` (comma-separated permissions).
The token must contain at least 32 characters. Only a trusted BFF may hold the
token and set actor headers after validating the Supabase JWT and resolving
permissions; never expose this contract or token to browsers. If no token is
configured, administrative requests are denied.

Permissions follow `catalog.brands.*` and `catalog.categories.*`, with `read`,
`create`, `update`, and `deactivate` actions. Activation requires `update`.
Active categories require an active parent; a category with active descendants
cannot be deactivated, and hierarchy cycles are rejected. Administrative
changes are logged with actor and resource identifiers; durable audit storage
requires the platform audit integration.

## Administrative queries and OpenAPI

The administrative lists of brands, categories, products, product variants,
and product images return `{ "items": [...], "page": 1, "limit": 25,
"total": 0 }`. This replaces the previous unpaginated array response in v1.
`page` starts at 1 (maximum 1000000); `limit` defaults to 25 and is capped at
100. Ordering is stable by name and UUID, or by sort order and UUID for
images; categories use sort order, name and UUID. An out-of-range page returns
an empty `items` array and the matching total. Invalid or unknown query
parameters return 400.

Filters:

- Brands: `search` (name or slug), `isActive`.
- Categories: `search` (name or slug), `isActive`, `parentId`.
- Products: `search` (name or slug), `status`, `brandId`, `categoryId`,
  `isFeatured`.
- Product variants: `search` (name, SKU or barcode), `isActive`.
- Product images: `variantId`, `isPrimary`.

Search is a case-insensitive literal substring; `%` and `_` are not wildcards.
Boolean filters accept only `true` or `false`. The category tree remains a
complete, unpaginated hierarchy.

Set `SWAGGER_ENABLED=true` to serve the administrative OpenAPI UI at `/docs`
and its specification at `/docs-json`. Documentation is disabled by default;
if enabled in a deployed environment, restrict access at the network or proxy
layer. The UI documents the BFF bearer token, actor headers, required
permissions, query parameters, and request and response schemas; it does not
authenticate users or replace BFF authorization.

## Public catalog

The storefront can use `GET /public/v1/products`, product detail at
`/public/v1/products/:slug`, and the active-brand and active-category product
lists at `/public/v1/brands/:slug/products` and
`/public/v1/categories/:slug/products`. The latter return 404 for nonexistent
or inactive brands and categories. Product lists return
`{items, page, limit, total}`; this replaces the previous unpaginated product
array in v1. The default page size is 25, capped at 100.

All product lists accept `search` (case-insensitive literal name substring),
`brandSlug`, `categorySlug`, `isFeatured`, `minPriceCop`, `maxPriceCop`, and
`sort`. Category matching is direct; subcategories are not included. Brand and
category filters match active entries only. Product lists and details retain
the existing visibility rules: published products, active variants, and
images of the product or its active variants. A product associated with an
inactive brand can still appear in the general list, but not under that
brand's filter or route.

Price bounds are inclusive decimal strings from `0` to
`9223372036854775807`; one active variant must satisfy both bounds. Sorting is
`name` (default), `price_asc`, `price_desc`, or `newest`. Price sorting uses
the lowest price among all active variants, even when a price filter matches
another variant. `newest` orders by publication date. Invalid filters return
400. Prices in responses remain decimal strings; image paths are references,
not public URLs, until Storage is integrated. Stock availability belongs to
Inventory and is not included.

When `SWAGGER_ENABLED=true`, the public documentation is available separately
at `/public-docs` and `/public-docs-json`.

## Products

Administrative product operations use `/admin/v1/products`: list, get by ID
or `/slug/:slug`, create, update, publish and archive. Use the
`catalog.products.read`, `catalog.products.create`, `catalog.products.update`
and `catalog.products.deactivate` permissions respectively. Creating or
updating a product accepts `brandId`, `categoryIds`, and `isFeatured` alongside
the commercial fields. Omitting `categoryIds` on update leaves associations
unchanged; an empty array removes them.

Products start in `DRAFT`. Publishing requires an active variant. Archiving
hides the product from `/public/v1/products`; an archived product can be
republished if it still has an active variant. Republishing updates
`publishedAt`. Public product responses include active variants and their
images; COP prices are decimal strings to preserve BIGINT precision.

Product publication and variant mutations lock the product first; deactivating
the last active variant of a published product is rejected, including when
requests run concurrently.

## Variants and service integration

`GET` and `POST /admin/v1/products/:productId/variants` list and create
variants; `GET` and `PATCH /admin/v1/variants/:id` retrieve and update them.
`PATCH /admin/v1/variants/:id/activate` and `/deactivate` change their state.
These operations use the corresponding `catalog.products.read`, `create`,
`update`, and `deactivate` permissions. UUIDs and product ownership never
change; no physical delete endpoint is provided. SKU and non-null barcode are
unique. `priceCop` and `compareAtPriceCop` are positive decimal strings bounded
by PostgreSQL BIGINT; a reference price must exceed the resulting current
price. Set `compareAtPriceCop`, `barcode`, or `volumeMl` to null to clear it.

Trusted services can call `GET /internal/v1/variants/:id` with
`Authorization: Bearer <CATALOG_SERVICE_API_TOKEN>`. Configure an independent
secret of at least 32 characters, different from the BFF token; if absent,
requests are denied. Never expose it to browsers. The response includes the
product and variant names, SKU, decimal-string `priceCop`, `productStatus`,
`isActive`, and `isPurchasable`. Commerce must revalidate this response during
checkout, reject `isPurchasable: false`, and preserve order price snapshots.
Inventory may resolve inactive variants by UUID for historical operations.
Checkout integration in Commerce remains a separate implementation.
The response reflects Catalog at the time of the request; it does not reserve
the price or prevent later status changes across services.
Variant changes are logged, but durable audit storage requires platform
integration.

## Product images

`GET` and `POST /admin/v1/products/:productId/images` list and register image
references. `GET` and `PATCH /admin/v1/images/:id` retrieve or update an image.
Reads require `catalog.products.read`; registration and updates require
`catalog.products.update`. An image belongs to a product and optionally one of
its variants. `sortOrder` controls display order; ties are ordered by UUID.
Setting `isPrimary` to true atomically replaces the previous primary image in
the same product or variant scope. Changing the variant of a primary image
likewise replaces the primary in the destination scope.

`storagePath` is a unique relative object key (up to 1024 ASCII characters,
using letters, numbers, `.`, `_`, `~`, `-`, and `/` between segments). URLs,
empty segments, and `.` or `..` segments are rejected. Only the path and
metadata are stored in PostgreSQL, never image bytes. Paths cannot be replaced
through this API while storage is unavailable, to avoid abandoning an existing
file. Administrators may update `variantId`, `altText`, `isPrimary`, and
`sortOrder`.

Supabase Storage, uploads, public URLs and physical file verification are
**not yet integrated**. Registering a key does not verify that a file exists
or is an image. Until the storage integration can remove the file as well,
`DELETE /admin/v1/images/:id` returns 503 and preserves the reference. Image
changes are logged with the actor; durable audit storage remains pending.

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ pnpm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
