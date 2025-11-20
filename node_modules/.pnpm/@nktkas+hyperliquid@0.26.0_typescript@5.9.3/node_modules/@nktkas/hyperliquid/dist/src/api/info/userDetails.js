import * as v from "valibot";
import { Address, parser } from "../_base.js";
import { TxDetailsResponse } from "./txDetails.js";
// -------------------- Schemas --------------------
/**
 * Request array of user transaction details.
 * @see null
 */
export const UserDetailsRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("userDetails"), v.description("Type of request.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Request array of user transaction details."));
})();
/**
 * Response array of user transaction details.
 * @see null
 */
export const UserDetailsResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of response. */
        type: v.pipe(v.literal("userDetails"), v.description("Type of response.")),
        /** Array of user transaction details. */
        txs: v.pipe(v.array(TxDetailsResponse.entries.tx), v.description("Array of user transaction details.")),
    }), v.description("Response array of user transaction details."));
})();
/**
 * Request array of user transaction details.
 * @param config - General configuration for Info API requests.
 * @param params - Parameters specific to the API request.
 * @param signal - An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) can be used to cancel the request by calling [`abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort) on the corresponding [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
 * @returns Array of user transaction details.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see null
 * @example
 * ```ts
 * import { HttpTransport } from "@nktkas/hyperliquid";
 * import { userDetails } from "@nktkas/hyperliquid/api/info";
 *
 * const transport = new HttpTransport(); // only `HttpTransport` supports this API
 * const data = await userDetails(
 *   { transport },
 *   { user: "0x..." },
 * );
 * ```
 */
export function userDetails(config, params, signal) {
    const request = parser(UserDetailsRequest)({
        type: "userDetails",
        ...params,
    });
    return config.transport.request("explorer", request, signal);
}
//# sourceMappingURL=userDetails.js.map