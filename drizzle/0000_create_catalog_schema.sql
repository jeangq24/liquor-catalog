CREATE SCHEMA "catalog";
--> statement-breakpoint
CREATE TYPE "catalog"."product_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "catalog"."brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text,
	"logo_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text,
	"image_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "chk_category_not_own_parent" CHECK ("catalog"."categories"."parent_id" IS NULL OR "catalog"."categories"."parent_id" <> "catalog"."categories"."id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_product_categories" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"storage_path" text NOT NULL,
	"alt_text" varchar(200),
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "catalog"."product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"sku" varchar(80) NOT NULL,
	"barcode" varchar(80),
	"volume_ml" integer,
	"units_per_pack" integer DEFAULT 1 NOT NULL,
	"price_cop" bigint NOT NULL,
	"compare_at_price_cop" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_barcode_unique" UNIQUE("barcode"),
	CONSTRAINT "uq_product_variants_id_product" UNIQUE("id","product_id"),
	CONSTRAINT "chk_variant_volume" CHECK ("catalog"."product_variants"."volume_ml" IS NULL OR "catalog"."product_variants"."volume_ml" > 0),
	CONSTRAINT "chk_variant_pack_quantity" CHECK ("catalog"."product_variants"."units_per_pack" > 0),
	CONSTRAINT "chk_variant_price" CHECK ("catalog"."product_variants"."price_cop" > 0),
	CONSTRAINT "chk_variant_compare_price" CHECK ("catalog"."product_variants"."compare_at_price_cop" IS NULL OR "catalog"."product_variants"."compare_at_price_cop" > "catalog"."product_variants"."price_cop")
);
--> statement-breakpoint
CREATE TABLE "catalog"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"name" varchar(180) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"short_description" varchar(300),
	"description" text,
	"status" "catalog"."product_status" DEFAULT 'DRAFT' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "catalog"."categories" ADD CONSTRAINT "fk_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "catalog"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_categories" ADD CONSTRAINT "fk_product_categories_product" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_categories" ADD CONSTRAINT "fk_product_categories_category" FOREIGN KEY ("category_id") REFERENCES "catalog"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_images" ADD CONSTRAINT "fk_product_images_product" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_images" ADD CONSTRAINT "fk_product_images_variant_product" FOREIGN KEY ("variant_id","product_id") REFERENCES "catalog"."product_variants"("id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."product_variants" ADD CONSTRAINT "fk_variants_product" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog"."products" ADD CONSTRAINT "fk_products_brand" FOREIGN KEY ("brand_id") REFERENCES "catalog"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_categories_parent" ON "catalog"."categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_categories_active_order" ON "catalog"."categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "idx_product_categories_category" ON "catalog"."product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_product_images_product_order" ON "catalog"."product_images" USING btree ("product_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_product_images_variant_order" ON "catalog"."product_images" USING btree ("variant_id","sort_order") WHERE "catalog"."product_images"."variant_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_primary_image" ON "catalog"."product_images" USING btree ("product_id") WHERE "catalog"."product_images"."variant_id" IS NULL AND "catalog"."product_images"."is_primary" = TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_variant_primary_image" ON "catalog"."product_images" USING btree ("variant_id") WHERE "catalog"."product_images"."variant_id" IS NOT NULL AND "catalog"."product_images"."is_primary" = TRUE;--> statement-breakpoint
CREATE INDEX "idx_variants_product" ON "catalog"."product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variants_active" ON "catalog"."product_variants" USING btree ("product_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_variants_price" ON "catalog"."product_variants" USING btree ("price_cop");--> statement-breakpoint
CREATE INDEX "idx_products_brand" ON "catalog"."products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "idx_products_status" ON "catalog"."products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_products_featured" ON "catalog"."products" USING btree ("is_featured") WHERE "catalog"."products"."is_featured" = TRUE;