import * as v from "valibot";
import { Address, Hex, parser, UnsignedInteger } from "../_base.js";
// -------------------- Schemas --------------------
/** Subscription to explorer transaction events (RPC endpoint). */
export const ExplorerTxsRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("explorerTxs"), v.description("Type of subscription.")),
    }), v.description("Subscription to explorer transaction events."));
})();
/** Event of array of transaction details. */
export const ExplorerTxsEvent = /* @__PURE__ */ (() => {
    return v.pipe(v.array(
    /** Transaction details. */
    v.pipe(v.object({
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
    }), v.description("Transaction details."))), v.description("Event of array of transaction details."));
})();
/**
 * Subscribe to explorer transaction updates.
 * @param config - General configuration for Subscription API subscriptions.
 * @param listener - A callback function to be called when the event is received.
 * @returns A request-promise that resolves with a {@link Subscription} object to manage the subscription lifecycle.
 * @note Make sure the endpoint in the {@link transport} supports this method.
 *
 * @throws {TransportError} When the transport layer throws an error.
 *
 * @see null
 * @example
 * ```ts
 * import { WebSocketTransport } from "@nktkas/hyperliquid";
 * import { explorerTxs } from "@nktkas/hyperliquid/api/subscription";
 *
 * const transport = new WebSocketTransport({ url: "wss://rpc.hyperliquid.xyz/ws" }); // RPC endpoint
 *
 * const sub = await explorerTxs(
 *   { transport },
 *   (data) => console.log(data),
 * );
 * ```
 */
export function explorerTxs(config, listener) {
    const payload = parser(ExplorerTxsRequest)({ type: "explorerTxs" });
    return config.transport.subscribe("_explorerTxs", payload, (e) => {
        listener(e.detail);
    });
}
//# sourceMappingURL=explorerTxs.js.map