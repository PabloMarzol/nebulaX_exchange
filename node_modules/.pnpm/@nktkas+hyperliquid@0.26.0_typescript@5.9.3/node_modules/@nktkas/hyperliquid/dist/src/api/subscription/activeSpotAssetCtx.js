import * as v from "valibot";
import { parser, UnsignedDecimal } from "../_base.js";
// -------------------- Schemas --------------------
/** Subscription to context events for a specific spot asset. */
export const ActiveSpotAssetCtxRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("activeAssetCtx"), v.description("Type of subscription.")),
        /** Asset ID (e.g., @1). */
        coin: v.pipe(v.string(), v.description("Asset ID (e.g., @1).")),
    }), v.description("Subscription to context events for a specific spot asset."));
})();
/** Event of active spot asset context. */
export const ActiveSpotAssetCtxEvent = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Asset ID (e.g., @1). */
        coin: v.pipe(v.string(), v.description("Asset ID (e.g., @1).")),
        /** Context for a specific spot asset. */
        ctx: v.pipe(v.object({
            /** Previous day's closing price. */
            prevDayPx: v.pipe(UnsignedDecimal, v.description("Previous day's closing price.")),
            /** Daily notional volume. */
            dayNtlVlm: v.pipe(UnsignedDecimal, v.description("Daily notional volume.")),
            /** Mark price. */
            markPx: v.pipe(UnsignedDecimal, v.description("Mark price.")),
            /** Mid price. */
            midPx: v.pipe(v.nullable(UnsignedDecimal), v.description("Mid price.")),
            /** Circulating supply. */
            circulatingSupply: v.pipe(UnsignedDecimal, v.description("Circulating supply.")),
            /** Asset symbol. */
            coin: v.pipe(v.string(), v.description("Asset symbol.")),
            /** Total supply. */
            totalSupply: v.pipe(UnsignedDecimal, v.description("Total supply.")),
            /** Daily volume in base currency. */
            dayBaseVlm: v.pipe(UnsignedDecimal, v.description("Daily volume in base currency.")),
        }), v.description("Context for a specific spot asset.")),
    }), v.description("Event of active spot asset context."));
})();
/**
 * Subscribe to context updates for a specific spot asset.
 * @param config - General configuration for Subscription API subscriptions.
 * @param params - Parameters specific to the API subscription.
 * @param listener - A callback function to be called when the event is received.
 * @returns A request-promise that resolves with a {@link Subscription} object to manage the subscription lifecycle.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions
 * @example
 * ```ts
 * import { WebSocketTransport } from "@nktkas/hyperliquid";
 * import { activeSpotAssetCtx } from "@nktkas/hyperliquid/api/subscription";
 *
 * const transport = new WebSocketTransport();
 *
 * const sub = await activeSpotAssetCtx(
 *   { transport },
 *   { coin: "@1" },
 *   (data) => console.log(data),
 * );
 * ```
 */
export function activeSpotAssetCtx(config, params, listener) {
    const payload = parser(ActiveSpotAssetCtxRequest)({ type: "activeAssetCtx", ...params });
    return config.transport.subscribe("activeSpotAssetCtx", payload, (e) => {
        if (e.detail.coin === payload.coin) {
            listener(e.detail);
        }
    });
}
//# sourceMappingURL=activeSpotAssetCtx.js.map