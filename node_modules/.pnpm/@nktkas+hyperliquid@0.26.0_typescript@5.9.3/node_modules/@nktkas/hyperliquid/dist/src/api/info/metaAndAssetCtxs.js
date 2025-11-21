import * as v from "valibot";
import { Decimal, parser, UnsignedDecimal } from "../_base.js";
import { MetaResponse } from "./meta.js";
// -------------------- Schemas --------------------
/**
 * Request metadata and asset contexts.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals#retrieve-perpetuals-asset-contexts-includes-mark-price-current-funding-open-interest-etc
 */
export const MetaAndAssetCtxsRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("metaAndAssetCtxs"), v.description("Type of request.")),
        /** DEX name (empty string for main dex). */
        dex: v.pipe(v.optional(v.string()), v.description("DEX name (empty string for main dex).")),
    }), v.description("Request metadata and asset contexts."));
})();
/**
 * Metadata and context for perpetual assets.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals#retrieve-perpetuals-asset-contexts-includes-mark-price-current-funding-open-interest-etc
 */
export const MetaAndAssetCtxsResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.tuple([
        MetaResponse,
        /** Array of contexts for each perpetual asset. */
        v.pipe(v.array(
        /** Context for a specific perpetual asset. */
        v.pipe(v.object({
            /** Previous day's closing price. */
            prevDayPx: v.pipe(UnsignedDecimal, v.description("Previous day's closing price.")),
            /** Daily notional volume. */
            dayNtlVlm: v.pipe(UnsignedDecimal, v.description("Daily notional volume.")),
            /** Mark price. */
            markPx: v.pipe(UnsignedDecimal, v.description("Mark price.")),
            /** Mid price. */
            midPx: v.pipe(v.nullable(UnsignedDecimal), v.description("Mid price.")),
            /** Funding rate. */
            funding: v.pipe(Decimal, v.description("Funding rate.")),
            /** Total open interest. */
            openInterest: v.pipe(UnsignedDecimal, v.description("Total open interest.")),
            /** Premium price. */
            premium: v.pipe(v.nullable(Decimal), v.description("Premium price.")),
            /** Oracle price. */
            oraclePx: v.pipe(UnsignedDecimal, v.description("Oracle price.")),
            /** Array of impact prices. */
            impactPxs: v.pipe(v.nullable(v.array(v.string())), v.description("Array of impact prices.")),
            /** Daily volume in base currency. */
            dayBaseVlm: v.pipe(UnsignedDecimal, v.description("Daily volume in base currency.")),
        }), v.description("Context for a specific perpetual asset."))), v.description("Array of contexts for each perpetual asset.")),
    ]), v.description("Metadata and context for perpetual assets."));
})();
export function metaAndAssetCtxs(config, paramsOrSignal, maybeSignal) {
    const params = paramsOrSignal instanceof AbortSignal ? {} : paramsOrSignal;
    const signal = paramsOrSignal instanceof AbortSignal ? paramsOrSignal : maybeSignal;
    const request = parser(MetaAndAssetCtxsRequest)({
        type: "metaAndAssetCtxs",
        ...params,
    });
    return config.transport.request("info", request, signal);
}
//# sourceMappingURL=metaAndAssetCtxs.js.map