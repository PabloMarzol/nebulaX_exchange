import * as v from "valibot";
import { Address, parser } from "../_base.js";
import { DetailedOrderSchema } from "../_common_schemas.js";
// -------------------- Schemas --------------------
/**
 * Request frontend open orders.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#retrieve-a-users-open-orders-with-additional-frontend-info
 */
export const FrontendOpenOrdersRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("frontendOpenOrders"), v.description("Type of request.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
        /** DEX name (empty string for main dex). */
        dex: v.pipe(v.optional(v.string()), v.description("DEX name (empty string for main dex).")),
    }), v.description("Request frontend open orders."));
})();
/**
 * Array of open orders with additional display information.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#retrieve-a-users-open-orders-with-additional-frontend-info
 */
export const FrontendOpenOrdersResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.array(DetailedOrderSchema), v.description("Array of open orders with additional display information."));
})();
/**
 * Request frontend open orders.
 * @param config - General configuration for Info API requests.
 * @param params - Parameters specific to the API request.
 * @param signal - An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) can be used to cancel the request by calling [`abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort) on the corresponding [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
 * @returns Array of open orders with additional display information.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#retrieve-a-users-open-orders-with-additional-frontend-info
 * @example
 * ```ts
 * import { HttpTransport } from "@nktkas/hyperliquid";
 * import { frontendOpenOrders } from "@nktkas/hyperliquid/api/info";
 *
 * const transport = new HttpTransport(); // or `WebSocketTransport`
 * const data = await frontendOpenOrders(
 *   { transport },
 *   { user: "0x..." },
 * );
 * ```
 */
export function frontendOpenOrders(config, params, signal) {
    const request = parser(FrontendOpenOrdersRequest)({
        type: "frontendOpenOrders",
        ...params,
    });
    return config.transport.request("info", request, signal);
}
//# sourceMappingURL=frontendOpenOrders.js.map