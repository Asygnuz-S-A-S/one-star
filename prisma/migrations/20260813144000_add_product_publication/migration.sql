-- Publication is independent from sales-channel availability:
-- a product may remain visible while being available only in physical stores.
ALTER TABLE "Product"
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
