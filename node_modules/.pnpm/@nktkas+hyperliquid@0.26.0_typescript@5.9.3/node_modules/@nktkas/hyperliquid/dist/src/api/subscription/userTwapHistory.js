import * as v from "valibot";
import { Address, parser, UnsignedInteger } from "../_base.js";
import { TwapStateSchema, TwapStatusSchema } from "../_common_schemas.js";
// -------------------- Schemas --------------------
/** Subscription to user TWAP history events for a specific user. */
export const UserTwapHistoryRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("userTwapHistory"), v.description("Type of subscription.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Subscription to user TWAP history events for a specific user."));
})();
/** Event of user TWAP history. */
export const UserTwapHistoryEvent = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
        /** Array of user's TWAP history. */
        history: v.pipe(v.array(
        /** TWAP history record. */
        v.pipe(v.object({
            /** Creation time of the history record (in seconds since epoch). */
            time: v.pipe(UnsignedInteger, v.description("Creation time of the history record (in seconds since epoch).")),
            /** State of the TWAP order. */
            state: TwapStateSchema,
            /** Current status of the TWAP order. */
            status: TwapStatusSchema,
            /** ID of the TWAP. */
            twapId: v.pipe(v.optional(UnsignedInteger), v.description("ID of the TWAP.")),
        }), v.description("TWAP history record."))), v.description("Array of user's TWAP history.")),
        /** Whether this is an initial snapshot. */
        isSnapshot: v.pipe(v.optional(v.literal(true)), v.description("Whether this is an initial snapshot.")),
    }), v.description("Event of user TWAP history."));
})();
/**
 * Subscribe to TWAP order history updates for a specific user.
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
 * import { userTwapHistory } from "@nktkas/hyperliquid/api/subscription";
 *
 * const transport = new WebSocketTransport();
 *
 * const sub = await userTwapHistory(
 *   { transport },
 *   { user: "0x..." },
 *   (data) => console.log(data),
 * );
 * ```
 */
export function userTwapHistory(config, params, listener) {
    const payload = parser(UserTwapHistoryRequest)({ type: "userTwapHistory", ...params });
    return config.transport.subscribe(payload.type, payload, (e) => {
        if (e.detail.user === payload.user) {
            listener(e.detail);
        }
    });
}
//# sourceMappingURL=userTwapHistory.js.map