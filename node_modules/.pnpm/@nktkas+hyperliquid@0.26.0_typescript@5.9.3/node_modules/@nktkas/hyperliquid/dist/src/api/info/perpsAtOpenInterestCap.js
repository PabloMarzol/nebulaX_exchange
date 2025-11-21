import * as v from "valibot";
import { parser } from "../_base.js";
// -------------------- Schemas --------------------
/**
 * Request perpetuals at open interest cap.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals#query-perps-at-open-interest-caps
 */
export const PerpsAtOpenInterestCapRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("perpsAtOpenInterestCap"), v.description("Type of request.")),
        /** DEX name (empty string for main dex). */
        dex: v.pipe(v.optional(v.string()), v.description("DEX name (empty string for main dex).")),
    }), v.description("Request perpetuals at open interest cap."));
})();
/**
 * Array of perpetuals at open interest caps.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals#query-perps-at-open-interest-caps
 */
export const PerpsAtOpenInterestCapResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.array(v.string()), v.description("Array of perpetuals at open interest caps."));
})();
export function perpsAtOpenInterestCap(config, paramsOrSignal, maybeSignal) {
    const params = paramsOrSignal instanceof AbortSignal ? {} : paramsOrSignal;
    const signal = paramsOrSignal instanceof AbortSignal ? paramsOrSignal : maybeSignal;
    const request = parser(PerpsAtOpenInterestCapRequest)({
        type: "perpsAtOpenInterestCap",
        ...params,
    });
    return config.transport.request("info", request, signal);
}
//# sourceMappingURL=perpsAtOpenInterestCap.js.map