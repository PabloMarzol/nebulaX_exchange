import * as v from "valibot";
import { Address, parser } from "../_base.js";
// -------------------- Schemas --------------------
/**
 * Request to check if a user is a VIP.
 * @see null
 */
export const IsVipRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("isVip"), v.description("Type of request.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Request to check if a user is a VIP."));
})();
/**
 * Boolean indicating user's VIP status.
 * @see null
 */
export const IsVipResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.nullable(v.boolean()), v.description("Boolean indicating user's VIP status."));
})();
/**
 * Request to check if a user is a VIP.
 * @param config - General configuration for Info API requests.
 * @param params - Parameters specific to the API request.
 * @param signal - An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) can be used to cancel the request by calling [`abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort) on the corresponding [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
 * @returns Boolean indicating user's VIP status.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see null
 * @example
 * ```ts
 * import { HttpTransport } from "@nktkas/hyperliquid";
 * import { isVip } from "@nktkas/hyperliquid/api/info";
 *
 * const transport = new HttpTransport(); // or `WebSocketTransport`
 * const data = await isVip(
 *   { transport },
 *   { user: "0x..." },
 * );
 * ```
 */
export function isVip(config, params, signal) {
    const request = parser(IsVipRequest)({
        type: "isVip",
        ...params,
    });
    return config.transport.request("info", request, signal);
}
//# sourceMappingURL=isVip.js.map