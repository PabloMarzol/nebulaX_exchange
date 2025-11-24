CREATE TABLE "ai_chat_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_market_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(50),
	"analysis_type" varchar(50) NOT NULL,
	"summary" text NOT NULL,
	"sentiment" varchar(20),
	"confidence" numeric(5, 2),
	"data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_trading_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(50) NOT NULL,
	"action" varchar(20) NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"entry_price" numeric(20, 8),
	"target_price" numeric(20, 8),
	"stop_loss" numeric(20, 8),
	"reasoning" text,
	"indicators" text,
	"timeframe" varchar(10),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onramp_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"fiat_amount" numeric(20, 2) NOT NULL,
	"fiat_currency" varchar(10) NOT NULL,
	"crypto_amount" numeric(20, 8),
	"crypto_currency" varchar(20) NOT NULL,
	"network" varchar(50) NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"payment_method" integer NOT NULL,
	"provider_order_id" varchar(255),
	"merchant_recognition_id" varchar(255),
	"onramp_url" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "onramp_orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "onramp_orders_merchant_recognition_id_unique" UNIQUE("merchant_recognition_id")
);
--> statement-breakpoint
CREATE TABLE "swap_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sell_token" varchar(255) NOT NULL,
	"buy_token" varchar(255) NOT NULL,
	"sell_amount" varchar(100) NOT NULL,
	"buy_amount" varchar(100) NOT NULL,
	"sell_token_symbol" varchar(20),
	"buy_token_symbol" varchar(20),
	"chain_id" integer NOT NULL,
	"price" varchar(50) NOT NULL,
	"guaranteed_price" varchar(50),
	"slippage" numeric(5, 2) DEFAULT '0.01',
	"quote_id" varchar(255),
	"quote_expiry" timestamp,
	"tx_hash" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(50) NOT NULL,
	"side" varchar(10) NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"price" numeric(20, 8),
	"stop_price" numeric(20, 8),
	"filled_amount" numeric(20, 8) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"nonce" integer NOT NULL,
	"provider_order_id" varchar(255),
	"provider_status" varchar(50),
	"chain_tx_hash" varchar(255),
	"error" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"finalized_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(50) NOT NULL,
	"side" varchar(10) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"liquidation_price" numeric(20, 8),
	"leverage" numeric(5, 2) DEFAULT '1',
	"unrealized_pnl" numeric(20, 8) DEFAULT '0',
	"realized_pnl" numeric(20, 8) DEFAULT '0',
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(50) NOT NULL,
	"side" varchar(10) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"fee" numeric(20, 8) DEFAULT '0',
	"fee_currency" varchar(20),
	"chain_tx_hash" varchar(255),
	"trade_id" varchar(255),
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"nonce" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_nonces_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"chain_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"label" varchar(100),
	"linked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"wallet_address" varchar(255) NOT NULL,
	"username" varchar(100),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"kyc_level" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"two_factor_secret" varchar(64),
	"two_factor_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "ai_chat_history" ADD CONSTRAINT "ai_chat_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_market_analysis" ADD CONSTRAINT "ai_market_analysis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_trading_signals" ADD CONSTRAINT "ai_trading_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onramp_orders" ADD CONSTRAINT "onramp_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_orders" ADD CONSTRAINT "swap_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_chat_user_id_idx" ON "ai_chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_analysis_user_id_idx" ON "ai_market_analysis" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_signals_user_id_idx" ON "ai_trading_signals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_signals_symbol_idx" ON "ai_trading_signals" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "onramp_orders_user_id_idx" ON "onramp_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onramp_orders_status_idx" ON "onramp_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "swap_orders_user_id_idx" ON "swap_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "swap_orders_status_idx" ON "swap_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_symbol_idx" ON "orders" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "positions_user_id_idx" ON "positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "positions_status_idx" ON "positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trades_user_id_idx" ON "trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trades_symbol_idx" ON "trades" USING btree ("symbol");