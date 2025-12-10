-- Portfolio Tables Migration
-- Creates tables for portfolio management, investment pies, and AI analysis

CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"name" varchar(100) DEFAULT 'My Portfolio',
	"description" text,
	"cash_balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"total_value" numeric(20, 8) DEFAULT '0',
	"total_pnl" numeric(20, 8) DEFAULT '0',
	"total_pnl_percent" numeric(10, 4) DEFAULT '0',
	"currency" varchar(10) DEFAULT 'USD',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_analyzed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "portfolio_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(100),
	"long_quantity" numeric(20, 8) DEFAULT '0' NOT NULL,
	"short_quantity" numeric(20, 8) DEFAULT '0' NOT NULL,
	"long_cost_basis" numeric(20, 8) DEFAULT '0',
	"short_cost_basis" numeric(20, 8) DEFAULT '0',
	"current_price" numeric(20, 8),
	"market_value" numeric(20, 8) DEFAULT '0',
	"unrealized_pnl" numeric(20, 8) DEFAULT '0',
	"realized_pnl" numeric(20, 8) DEFAULT '0',
	"total_pnl" numeric(20, 8) DEFAULT '0',
	"pnl_percent" numeric(10, 4) DEFAULT '0',
	"allocation_percent" numeric(10, 4) DEFAULT '0',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_pies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT false,
	"total_allocation" numeric(5, 2) DEFAULT '100',
	"asset_count" integer DEFAULT 0,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pie_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pie_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(100),
	"allocation_percent" numeric(5, 2) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_analysis_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_type" varchar(50) DEFAULT 'full_portfolio',
	"model_name" varchar(50) DEFAULT 'llama-3.3-70b-versatile',
	"model_provider" varchar(50) DEFAULT 'Groq',
	"decisions" jsonb NOT NULL,
	"sentiment" varchar(20),
	"confidence_score" numeric(5, 2),
	"risk_score" numeric(5, 2),
	"diversification_score" numeric(5, 2),
	"agent_signals" jsonb,
	"processing_time_ms" integer,
	"tokens_used" integer,
	"steps_completed" jsonb,
	"raw_response" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "portfolio_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"total_value" numeric(20, 8) NOT NULL,
	"cash_balance" numeric(20, 8) NOT NULL,
	"positions_value" numeric(20, 8) NOT NULL,
	"daily_change" numeric(20, 8),
	"daily_change_percent" numeric(10, 4),
	"total_pnl" numeric(20, 8),
	"total_pnl_percent" numeric(10, 4),
	"snapshot_type" varchar(20) DEFAULT 'daily',
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Foreign Keys
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "investment_pies" ADD CONSTRAINT "investment_pies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pie_assets" ADD CONSTRAINT "pie_assets_pie_id_investment_pies_id_fk" FOREIGN KEY ("pie_id") REFERENCES "public"."investment_pies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_analysis_results" ADD CONSTRAINT "ai_analysis_results_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_analysis_results" ADD CONSTRAINT "ai_analysis_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portfolio_history" ADD CONSTRAINT "portfolio_history_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Indexes
CREATE INDEX "portfolios_user_id_idx" ON "portfolios" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "portfolio_positions_portfolio_id_idx" ON "portfolio_positions" USING btree ("portfolio_id");
--> statement-breakpoint
CREATE INDEX "portfolio_positions_symbol_idx" ON "portfolio_positions" USING btree ("symbol");
--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_positions_portfolio_symbol_idx" ON "portfolio_positions" USING btree ("portfolio_id","symbol");
--> statement-breakpoint
CREATE INDEX "investment_pies_user_id_idx" ON "investment_pies" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "investment_pies_is_active_idx" ON "investment_pies" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX "pie_assets_pie_id_idx" ON "pie_assets" USING btree ("pie_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "pie_assets_pie_symbol_idx" ON "pie_assets" USING btree ("pie_id","symbol");
--> statement-breakpoint
CREATE INDEX "ai_analysis_portfolio_id_idx" ON "ai_analysis_results" USING btree ("portfolio_id");
--> statement-breakpoint
CREATE INDEX "ai_analysis_user_id_idx" ON "ai_analysis_results" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "ai_analysis_created_at_idx" ON "ai_analysis_results" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "portfolio_history_portfolio_id_idx" ON "portfolio_history" USING btree ("portfolio_id");
--> statement-breakpoint
CREATE INDEX "portfolio_history_timestamp_idx" ON "portfolio_history" USING btree ("timestamp");
--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_history_portfolio_timestamp_idx" ON "portfolio_history" USING btree ("portfolio_id","timestamp");
