# Embedded OnRamp Flow Implementation Plan

## Objective
Minimize user redirection away from the NebulaX Swap interface during the onramp process for both OnRamp.Money and Reown (Web3Modal) providers, creating a more seamless "embedded" experience.

## Analysis of Current State

### 1. OnRamp.Money
- **Current Flow**: User fills details in `OnRampWidget` -> Clicks "Continue" -> Full page redirect to `onramp.money` -> User completes payment -> Redirect back to `/swap`.
- **Issues**: Disrupts user context; feels like leaving the app.
- **Constraints**: 
  - `iframe` embedding is often blocked by payment providers (X-Frame-Options).
  - "White Label" integration (API-only) requires complex PCI-DSS compliance and handling sensitive user data (KYC, Card numbers) which `createOrder` API hints at but doesn't fully document for a "lightweight" integration.

### 2. Reown Appkit (Web3Modal)
- **Current Flow**: `web3modal.open({ view: 'OnRampProviders' })` opens a modal -> User selects provider (Meld/Coinbase) -> Likely redirects for final steps.
- **Constraints**: Controlled entirely by the `@web3modal/wagmi` library. Customizing the internal flow is not possible without replacing the library with direct provider integrations (e.g., Meld SDK).

## Proposed Solution

### Strategy A: OnRamp.Money - "Embedded Quote + Popup Pattern"
To meet the requirement of keeping the quote flow within the interface, we will decouple the "Quote" step from the "Payment" step.

1. **Embedded Quote (New)**: 
   - Implement real-time integration with OnRamp.Money's Quotes API.
   - As the user types the Fiat Amount, the UI will fetch and display:
     - Exact Crypto Amount to be received.
     - Exchange Rate.
     - Fees (OnRamp fee, Network fee).
   - This happens entirely within the `OnRampWidget` without any popups.

2. **Popup Launch (Payment only)**: 
   - Only after the user reviews the quote and clicks "Continue", we utilize the "Popup Window" pattern for the secure payment/KYC flow.
   - On "Continue", open the `onrampUrl` in a sized popup window (e.g., 500x700 center screen).
   - This keeps the main NebulaX Swap interface visible and active in the background.
3. **Completion Handler**:
   - The `redirectURL` parameter sent to OnRamp will point to a specific route: `/onramp/callback` (or handle `/swap?role=popup`).
   - When the user finishes on OnRamp.Money, they are redirected to this URL *inside the popup*.
   - This page will contain valid Javascript to:
     1. Send a `postMessage({ type: 'ONRAMP_SUCCESS', ... }, window.opener)` to the main window.
     2. `window.close()` itself.
4. **UI Update**:
   - The main `OnRampWidget` listens for the `message` event.
   - Upon receipt, it refresh order history or shows a "Success" confetti/modal without ever reloading the main page.

### Strategy B: Reown Appkit
- **Action**: Assess feasibility of direct Meld.io integration. 
- **Recommendation**: For Phase 1, maintain current Web3Modal implementation as it provides a "Modal" experience initially. If deeper embedding is required, we must register directly with Meld.io to get API keys for their specific Widget/SDK, effectively bypassing Web3Modal.

## Implementation Steps

### 1. Backend: Implement Quote Service
- Update `backend/src/services/onrampMoneyService.ts`:
  - Add `getQuote(params)` method calling `https://api.onramp.money/onramp/api/v2/common/transaction/quotes`.
  - Ensure proper signature generation for this endpoint.
- Add API Endpoint: `POST /api/onramp/quote` in `backend/src/routes/onramp.routes.ts`.

### 2. Frontend: OnRampWidget Refactor
- Create `useOnRampQuote` hook in `apps/web/src/hooks/useSwap.ts` to consume the new Quote API.
- Update `OnRampWidget.tsx`:
  - Display "Loading..." state while fetching quote.
  - Show breakdown: "Rate: 1 USD = X ETH", "Fees: $Y", "You Receive: Z ETH".
  - Only enable "Continue" button when a valid quote is received.
- Modify `handleCreateOrder`:
  - Replace `window.location.href = ...` with a `window.open(...)` logic for the final step.
- Add `useEffect` listener for `message` events.

### 2. Frontend: Popup Handler Route
- Create a new route/component (e.g., in `apps/web/src/pages/OnRampCallbackPage.tsx` or handle in `SwapPage.tsx` with checking query params).
- Logic:
  ```typescript
  if (window.opener) {
    window.opener.postMessage({ type: 'ONRAMP_COMPLETE', params: searchParams }, '*');
    window.close();
  }
  ```

### 3. Backend: URL Configuration
- Update `backend/src/services/onrampMoneyService.ts`.
- Ensure `redirectURL` points to the new callback handler route. 

## Technical Considerations

- **Popup Blockers**: Browsers might block popups if not triggered directly by user action. Ensure `window.open` is called *immediately* within the `onClick` handler.
  - *Challenge*: We currently `await createOrder.mutateAsync(...)` before redirecting. The async delay might trigger blockers.
  - *Mitigation*: Open an empty popup *immediately* on click (loading state), then update its `location.href` once the API returns the URL.
- **Mobile Experience**: Popups on mobile often become new tabs. This is acceptable and still better than a full redirect replacing the app.

## Success Criteria
- User initiates OnRamp.Money flow.
- A popup opens (NebulaX remains background).
- User completes payment.
- Popup closes automatically.
- NebulaX UI updates to show "Processing" or "Success".
