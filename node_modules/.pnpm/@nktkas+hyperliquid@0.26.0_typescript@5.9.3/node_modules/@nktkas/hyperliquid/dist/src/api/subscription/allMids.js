import * as v from "valibot";
import { parser, UnsignedDecimal } from "../_base.js";
// -------------------- Schemas --------------------
/** Subscription to mid price events for all coins. */
export const AllMidsRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("allMids"), v.description("Type of subscription.")),
        /** DEX name (empty string for main dex). */
        dex: v.pipe(v.optional(v.string()), v.description("DEX name (empty string for main dex).")),
    }), v.description("Subscription to mid price events for all coins."));
})();
/** Event of mid prices for all assets. */
export const AllMidsEvent = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Mapping of coin symbols to mid prices. */
        mids: v.pipe(v.record(v.string(), UnsignedDecimal), v.description("Mapping of coin symbols to mid prices.")),
        /** DEX name (undefined for main dex). */
        dex: v.pipe(v.optional(v.string()), v.description("DEX name (empty string for main dex).")),
    }), v.description("Event of mid prices for all assets."));
})();
export function allMids(config, paramsOrListener, maybeListener) {
    const params = typeof paramsOrListener === "function" ? {} : paramsOrListener;
    const listener = typeof paramsOrListener === "function" ? paramsOrListener : maybeListener;
    const payload = parser(AllMidsRequest)({
        type: "allMids",
        ...params,
        dex: params.dex || undefined, // same value as in response
    });
    return config.transport.subscribe(payload.type, payload, (e) => {
        if (e.detail.dex === payload.dex) {
            listener(e.detail);
        }
    });
}
//# sourceMappingURL=allMids.js.map