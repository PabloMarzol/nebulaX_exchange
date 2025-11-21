import * as v from "valibot";
import { Address, parser } from "../_base.js";
// -------------------- Schemas --------------------
/**
 * Request legal verification status of a user.
 * @see null
 */
export const LegalCheckRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of request. */
        type: v.pipe(v.literal("legalCheck"), v.description("Type of request.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Request legal verification status of a user."));
})();
/**
 * Legal verification status for a user.
 * @see null
 */
export const LegalCheckResponse = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Whether the user IP address is allowed. */
        ipAllowed: v.pipe(v.boolean(), v.description("Whether the user IP address is allowed.")),
        /** Whether the user has accepted the terms of service. */
        acceptedTerms: v.pipe(v.boolean(), v.description("Whether the user has accepted the terms of service.")),
        /** Whether the user is allowed to use the platform. */
        userAllowed: v.pipe(v.boolean(), v.description("Whether the user is allowed to use the platform.")),
    }), v.description("Legal verification status for a user."));
})();
/**
 * Request legal verification status of a user.
 * @param config - General configuration for Info API requests.
 * @param params - Parameters specific to the API request.
 * @param signal - An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) can be used to cancel the request by calling [`abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort) on the corresponding [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
 * @returns Legal verification status for a user.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see null
 * @example
 * ```ts
 * import { HttpTransport } from "@nktkas/hyperliquid";
 * import { legalCheck } from "@nktkas/hyperliquid/api/info";
 *
 * const transport = new HttpTransport(); // or `WebSocketTransport`
 * const data = await legalCheck(
 *   { transport },
 *   { user: "0x..." },
 * );
 * ```
 */
export function legalCheck(config, params, signal) {
    const request = parser(LegalCheckRequest)({
        type: "legalCheck",
        ...params,
    });
    return config.transport.request("info", request, signal);
}
//# sourceMappingURL=legalCheck.js.map