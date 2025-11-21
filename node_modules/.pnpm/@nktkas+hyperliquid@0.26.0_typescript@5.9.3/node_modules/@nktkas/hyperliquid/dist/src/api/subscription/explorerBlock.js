import * as v from "valibot";
import { Address, Hex, parser, UnsignedInteger } from "../_base.js";
// -------------------- Schemas --------------------
/** Subscription to explorer block events (RPC endpoint). */
export const ExplorerBlockRequest = /* @__PURE__ */ (() => {
    return v.pipe(v.object({
        /** Type of subscription. */
        type: v.pipe(v.literal("explorerBlock"), v.description("Type of subscription.")),
    }), v.description("Subscription to explorer block events."));
})();
/** Event of array of block details. */
export const ExplorerBlockEvent = /* @__PURE__ */ (() => {
    return v.pipe(v.array(
    /** Block details. */
    v.pipe(v.object({
        /** Block creation timestamp. */
        blockTime: v.pipe(UnsignedInteger, v.description("Block creation timestamp.")),
        /** Block hash. */
        hash: v.pipe(v.pipe(Hex, v.length(66)), v.description("Block hash.")),
        /** Block height in chain. */
        height: v.pipe(UnsignedInteger, v.description("Block height in chain.")),
        /** Total transactions in block. */
        numTxs: v.pipe(UnsignedInteger, v.description("Total transactions in block.")),
        /** Block proposer address. */
        proposer: v.pipe(Address, v.description("Block proposer address.")),
    }), v.description("The details of a block."))), v.description("Event of array of block details."));
})();
/**
 * Subscribe to explorer block updates.
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
 * import { explorerBlock } from "@nktkas/hyperliquid/api/subscription";
 *
 * const transport = new WebSocketTransport({ url: "wss://rpc.hyperliquid.xyz/ws" }); // RPC endpoint
 *
 * const sub = await explorerBlock(
 *   { transport },
 *   (data) => console.log(data),
 * );
 * ```
 */
export function explorerBlock(config, listener) {
    const payload = parser(ExplorerBlockRequest)({ type: "explorerBlock" });
    return config.transport.subscribe("_explorerBlock", payload, (e) => {
        listener(e.detail);
    });
}
//# sourceMappingURL=explorerBlock.js.map