import * as v from "valibot";
import { Address, Hex, parser, UnsignedInteger } from "../_base.js";
// -------------------- Schemas --------------------
/**
 * Request transaction details by transaction hash.
 * @see null
 */
export const TxDetailsRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("txDetails"), v.description("Type of request.")),
        /** Transaction hash. */
        hash: v.pipe(v.pipe(Hex, v.length(66)), v.description("Transaction hash.")),
    }), v.description("Request transaction details by transaction hash."));
})();
/**
 * Response with transaction details.
 * @see null
 */
export const TxDetailsResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Response type. */
        type: v.pipe(v.literal("txDetails"), v.description("Response type.")),
        /** Transaction details. */
        tx: v.pipe(v.object({
            /** Action performed in transaction. */
            action: v.pipe(v.looseObject({
                /** Action type. */
                type: v.pipe(v.string(), v.description("Action type.")),
            }), v.description("Action performed in transaction.")),
            /** Block number where transaction was included. */
            block: v.pipe(UnsignedInteger, v.description("Block number where transaction was included.")),
            /** Error message if transaction failed. */
            error: v.pipe(v.nullable(v.string()), v.description("Error message if transaction failed.")),
            /** Transaction hash. */
            hash: v.pipe(v.pipe(Hex, v.length(66)), v.description("Transaction hash.")),
            /** Transaction creation timestamp. */
            time: v.pipe(UnsignedInteger, v.description("Transaction creation timestamp.")),
            /** Creator's address. */
            user: v.pipe(Address, v.description("Creator's address.")),
        }), v.description("Transaction details.")),
    }), v.description("Response with transaction details."));
})();
/**
 * Request transaction details by transaction hash.
 * @param config - General configuration for Info API requests.
 * @param params - Parameters specific to the API request.
 * @param signal - An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) can be used to cancel the request by calling [`abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort) on the corresponding [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
 * @returns Transaction details.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see null
 * @example
 * ```ts
 * import { HttpTransport } from "@nktkas/hyperliquid";
 * import { txDetails } from "@nktkas/hyperliquid/api/info";
 *
 * const transport = new HttpTransport(); // only `HttpTransport` supports this API
 * const data = await txDetails(
 *   { transport },
 *   { hash: "0x..." },
 * );
 * ```
 */
export function txDetails(config, params, signal) {
    const request = parser(TxDetailsRequest)({
        type: "txDetails",
        ...params,
    });
    return config.transport.request("explorer", request, signal);
}
//# sourceMappingURL=txDetails.js.map