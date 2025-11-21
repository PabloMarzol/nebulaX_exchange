import * as v from "valibot";
import { Address, parser } from "../_base.js";
// -------------------- Schemas --------------------
/**
 * Request user HIP-3 DEX abstraction state.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-a-users-hip-3-dex-abstraction-state
 */
export const UserDexAbstractionInfoRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("userDexAbstraction"), v.description("Type of request.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Request user referral."));
})();
/**
 * User HIP-3 DEX abstraction state.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-a-users-hip-3-dex-abstraction-state
 */
export const UserDexAbstractionInfoResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.nullable(v.boolean()), v.description("User HIP-3 DEX abstraction state."));
})();
/**
 * Request user HIP-3 DEX abstraction state.
 * @param config - General configuration for Info API requests.
 * @param params - Parameters specific to the API request.
 * @param signal - An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) can be used to cancel the request by calling [`abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort) on the corresponding [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
 * @returns User HIP-3 DEX abstraction state.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-a-users-hip-3-dex-abstraction-state
 * @example
 * ```ts
 * import { HttpTransport } from "@nktkas/hyperliquid";
 * import { userDexAbstraction } from "@nktkas/hyperliquid/api/info";
 *
 * const transport = new HttpTransport(); // or `WebSocketTransport`
 * const data = await userDexAbstraction(
 *   { transport },
 *   { user: "0x..." },
 * );
 * ```
 */
export function userDexAbstraction(config, params, signal) {
    const request = parser(UserDexAbstractionInfoRequest)({
        type: "userDexAbstraction",
        ...params,
    });
    return config.transport.request("info", request, signal);
}
//# sourceMappingURL=userDexAbstraction.js.map