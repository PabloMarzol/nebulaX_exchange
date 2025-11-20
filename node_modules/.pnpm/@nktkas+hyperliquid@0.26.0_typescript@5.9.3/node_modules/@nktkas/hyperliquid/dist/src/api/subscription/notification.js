import * as v from "valibot";
import { Address, parser } from "../_base.js";
// -------------------- Schemas --------------------
/** Subscription to notification events for a specific user. */
export const NotificationRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("notification"), v.description("Type of subscription.")),
        /** User address. */
        user: v.pipe(Address, v.description("User address.")),
    }), v.description("Subscription to notification events for a specific user."));
})();
/** Event of user notification. */
export const NotificationEvent = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Notification content. */
        notification: v.pipe(v.string(), v.description("Notification content.")),
    }), v.description("Event of user notification."));
})();
/**
 * Subscribe to notification updates for a specific user.
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
 * import { notification } from "@nktkas/hyperliquid/api/subscription";
 *
 * const transport = new WebSocketTransport();
 *
 * const sub = await notification(
 *   { transport },
 *   { user: "0x..." },
 *   (data) => console.log(data),
 * );
 * ```
 */
export function notification(config, params, listener) {
    const payload = parser(NotificationRequest)({ type: "notification", ...params });
    return config.transport.subscribe(payload.type, payload, (e) => {
        listener(e.detail);
    });
}
//# sourceMappingURL=notification.js.map