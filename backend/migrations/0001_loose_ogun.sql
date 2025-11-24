CREATE TABLE "hyperliquid_fills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"hyperliquid_fill_id" varchar(128),
	"symbol" varchar(20) NOT NULL,
	"side" varchar(4) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"size" numeric(20, 8) NOT NULL,
	"fee" numeric(20, 8),
	"fee_token" varchar(10),
	"is_maker" boolean,
	"tx_hash" varchar(128),
	"block_number" varchar(20),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hyperliquid_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"internal_order_id" varchar(64) NOT NULL,
	"hyperliquid_order_id" varchar(128),
	"symbol" varchar(20) NOT NULL,
	"side" varchar(4) NOT NULL,
	"order_type" varchar(20) NOT NULL,
	"price" numeric(20, 8),
	"size" numeric(20, 8) NOT NULL,
	"filled_size" numeric(20, 8) DEFAULT '0',
	"remaining_size" numeric(20, 8),
	"average_fill_price" numeric(20, 8),
	"time_in_force" varchar(10),
	"reduce_only" boolean DEFAULT false,
	"post_only" boolean DEFAULT false,
	"status" varchar(20) NOT NULL,
	"metadata" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"filled_at" timestamp,
	"cancelled_at" timestamp,
	CONSTRAINT "hyperliquid_orders_internal_order_id_unique" UNIQUE("internal_order_id")
);
--> statement-breakpoint
CREATE TABLE "hyperliquid_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"side" varchar(5) NOT NULL,
	"size" numeric(20, 8) NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"mark_price" numeric(20, 8),
	"liquidation_price" numeric(20, 8),
	"unrealized_pnl" numeric(20, 8),
	"realized_pnl" numeric(20, 8) DEFAULT '0',
	"leverage" numeric(5, 2),
	"margin_used" numeric(20, 8),
	"margin_mode" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hyperliquid_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"check_type" varchar(50) NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" varchar(128) NOT NULL,
	"db_status" varchar(50) NOT NULL,
	"api_status" varchar(50) NOT NULL,
	"discrepancy" boolean NOT NULL,
	"discrepancy_details" jsonb,
	"resolution" text,
	"resolved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hyperliquid_user_state_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_address" varchar(42) NOT NULL,
	"account_value" numeric(20, 8),
	"total_margin_used" numeric(20, 8),
	"total_unrealized_pnl" numeric(20, 8),
	"total_realized_pnl" numeric(20, 8),
	"state_snapshot" jsonb,
	"last_fetched_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hyperliquid_user_state_cache_user_id_unique" UNIQUE("user_id")
);
