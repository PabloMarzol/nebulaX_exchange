import * as v from "valibot";
import { Address, parser } from "../_base.js";
import { ActiveAssetDataResponse } from "../info/activeAssetData.js";
// -------------------- Schemas --------------------
/** Subscription to active asset data events for a specific user and coin. */
export const ActiveAssetDataRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("activeAssetData"), v.description("Type of subscription.")),
        /** Asset symbol (e.g., BTC). */
        coin: v.pipe(v.string(), v.description("Asset symbol (e.g., BTC).")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Subscription to active asset data events for a specific user and coin."));
})();
/** Event of user active asset data. */
export const ActiveAssetDataEvent = /* @__PURE__ */ (() => {
    return ActiveAssetDataResponse;
})();
/**
 * Subscribe to trading data updates for a specific asset and user.
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
 * import { activeAssetData } from "@nktkas/hyperliquid/api/subscription";
 *
 * const transport = new WebSocketTransport();
 *
 * const sub = await activeAssetData(
 *   { transport },
 *   { coin: "ETH", user: "0x..." },
 *   (data) => console.log(data),
 * );
 * ```
 */
export function activeAssetData(config, params, listener) {
    const payload = parser(ActiveAssetDataRequest)({ type: "activeAssetData", ...params });
    return config.transport.subscribe(payload.type, payload, (e) => {
        if (e.detail.coin === payload.coin && e.detail.user === payload.user) {
            listener(e.detail);
        }
    });
}
//# sourceMappingURL=activeAssetData.js.map