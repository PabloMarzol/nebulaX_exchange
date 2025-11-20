import * as v from "valibot";
import { parser, UnsignedDecimal } from "../_base.js";
// -------------------- Schemas --------------------
/**
 * Request mid coin prices.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#retrieve-mids-for-all-coins
 */
export const AllMidsRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("allMids"), v.description("Type of request.")),
        /** DEX name (empty string for main dex). */
        dex: v.pipe(v.optional(v.string()), v.description("DEX name (empty string for main dex).")),
    }), v.description("Request mid coin prices."));
})();
/**
 * Mapping of coin symbols to mid prices.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#retrieve-mids-for-all-coins
 */
export const AllMidsResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.record(v.string(), UnsignedDecimal), v.description("Mapping of coin symbols to mid prices."));
})();
export function allMids(config, paramsOrSignal, maybeSignal) {
    const params = paramsOrSignal instanceof AbortSignal ? {} : paramsOrSignal;
    const signal = paramsOrSignal instanceof AbortSignal ? paramsOrSignal : maybeSignal;
    const request = parser(AllMidsRequest)({
        type: "allMids",
        ...params,
    });
    return config.transport.request("info", request, signal);
}
//# sourceMappingURL=allMids.js.map