import * as v from "valibot";
import { Address, parser } from "../_base.js";
import { UserNonFundingLedgerUpdatesResponse } from "../info/userNonFundingLedgerUpdates.js";
// -------------------- Schemas --------------------
/** Subscription to user non-funding ledger updates for a specific user. */
export const UserNonFundingLedgerUpdatesRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("userNonFundingLedgerUpdates"), v.description("Type of subscription.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Subscription to user non-funding ledger updates for a specific user."));
})();
/** Event of user non-funding ledger updates. */
export const UserNonFundingLedgerUpdatesEvent = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
        /** Array of user's non-funding ledger update. */
        nonFundingLedgerUpdates: UserNonFundingLedgerUpdatesResponse,
        /** Whether this is an initial snapshot. */
        isSnapshot: v.pipe(v.optional(v.literal(true)), v.description("Whether this is an initial snapshot.")),
    }), v.description("Event of user non-funding ledger updates."));
})();
/**
 * Subscribe to non-funding ledger updates for a specific user.
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
 * import { userNonFundingLedgerUpdates } from "@nktkas/hyperliquid/api/subscription";
 *
 * const transport = new WebSocketTransport();
 *
 * const sub = await userNonFundingLedgerUpdates(
 *   { transport },
 *   { user: "0x..." },
 *   (data) => console.log(data),
 * );
 * ```
 */
export function userNonFundingLedgerUpdates(config, params, listener) {
    const payload = parser(UserNonFundingLedgerUpdatesRequest)({ type: "userNonFundingLedgerUpdates", ...params });
    return config.transport.subscribe(payload.type, payload, (e) => {
        if (e.detail.user === payload.user) {
            listener(e.detail);
        }
    });
}
//# sourceMappingURL=userNonFundingLedgerUpdates.js.map