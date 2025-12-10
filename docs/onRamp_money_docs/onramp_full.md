This plan details the implementation of a comprehensive Whitelabel Full On-Ramp Flow (Direct API integration) combined with a Hybrid KYC Approach where KYC verification is delegated to the dedicated Onramp KYC widget.
This strategy ensures that the entire transaction and user interface remain under the control of your platform, but regulatory compliance (KYC) is handled securely by Onramp.Money via a dedicated redirect/modal.
Technical Implementation Plan: Whitelabel Onramp (Direct API + Hybrid KYC)
Merchant Credentials
	
Value
ONRAMP_BASE_API_URL
	
https://api.onramp.money
X-ONRAMP-APIKEY
	
.. (Your live API Key)
ONRAMP_APP_ID
	
1739218
Phase 1: Setup and Pre-Flight Checks
This phase involves configuring the environment and retrieving necessary data mappings.
1.1 Secure Webhook Configuration (Mandatory)
Developers must set up an HTTPS endpoint to asynchronously receive final transaction updates, which is crucial for completing the transaction without constant polling
.
• API Endpoint: POST https://api.onramp.money/onramp/api/v1/merchant/setWebhookUrl
• Request Body: {"webhookUrl": "YOUR_SECURE_HTTPS_URL"}
• Failure Note: If the webhook URL is not set before a transaction completes successfully, the status codes will show 4 or 15 instead of 5 or 16
. Webhook failure occurs if no response is received within 5 seconds
.
1.2 Fetch Configuration Data
Retrieve necessary identifiers and price quotes to build the user interface and validate transaction parameters.
• A. Get Supported Assets/Networks:
    ◦ API Endpoint: GET https://api.onramp.money/onramp/api/v2/sell/public/allConfig
    ◦ Purpose: Extract valid coinId and chainId (network details) required for order creation
.
• B. Generate Real-Time Quotes:
    ◦ API Endpoint: POST https://api.onramp.money/onramp/api/v2/common/transaction/quotes
    ◦ Headers: Requires X-ONRAMP-APIKEY, X-ONRAMP-PAYLOAD, X-ONRAMP-SIGNATURE
.
    ◦ Request Body: Must include fiatAmount, fiatType, and type: 1 (onramp)
.
    ◦ Data to Display: Use the response to show the user the estimated quantity (crypto amount), rate, and fee breakdowns (onRampFee, clientFee, gatewayFee, gasFee)
.
Phase 2: On-Ramp Transaction Initiation (Whitelabel Control)
This is the core step for creating the transaction and obtaining payment details.
2.1 Create the Order
Use the specific API endpoint intended for the entire whitelabel flow
.
• API Endpoint: POST https://api.onramp.money/onramp-merchants/widget/createOrder
• Required Request Body (Minimum): Requires coinId, chainId, and coinAmount
.
• Critical Response Data: The API returns the identifiers and fiat payment instructions
:
    ◦ orderId: The unique transaction identifier
.
    ◦ address: The Deposit address where the user must send the fiat funds
.
    ◦ endTime: The expiration timestamp for the order (Unix format)
.
2.2 Display Payment Instructions
The application UI must show the user the deposit address and the endTime to facilitate the fiat transfer (e.g., UPI or Bank transfer), as determined by the paymentType (1 for Instant transfer, 2 for Bank transfer)
.
Phase 3: Hybrid KYC Check and Redirection
This phase manages compliance requirements while keeping the transaction open.
3.1 Poll for Status and KYC Requirement
The partner must continuously monitor the order status using the Get Order API to check for state changes, especially the KYC status.
• API Endpoint: POST https://api.onramp.money/onramp-merchants/widget/getOrder
• Request Body: {"orderId": "..."}
• Check KYC Status: Inspect the kycNeeded field in the response data
:
    ◦ If kycNeeded: 0: Proceed to wait for payment completion.
    ◦ If kycNeeded: 1: The user needs KYC to process the transaction, typically because the purchase amount exceeds the limit for unverified users
.
3.2 Initiate KYC Widget Redirection
If kycNeeded: 1, the user must be prompted to complete KYC by redirecting them to the Onramp widget dedicated to verification.
• Integration Method: While the main flow is API-driven, the KYC step uses a specialized function provided in the SDKs (Android SDK, React Native SDK) for delegation
.
• Functionality: Use the initiateOnrampKyc function and pass the necessary kyc config parametes (mandatory) to start the dedicated KYC widget
.
• Post-KYC Action: After the user completes the KYC (which could involve submitting documents like National IDs, Passports, or a video KYC, depending on the region and tier)
, they are returned to your platform, and you resume polling the order status.
Phase 4: Order Management and Completion
This phase covers auxiliary actions and final status confirmation.
4.1 Order Time Extension (Optional)
If the user requires more time to complete the fiat payment, the order time can be extended up to 2 times
.
• API Endpoint: POST https://api.onramp.money/onramp-merchants/widget/extendTime
• Request Body: {"orderId": "..."}
4.2 Order Cancellation (User/System)
If the order is cancelled, either by the user or due to system issues (like bank/KYC name mismatch, status -3)
, the Cancel Order API can be used.
• API Endpoint: POST https://api.onramp.money/onramp-merchants/widget/cancelOrder
• Request Body: {"orderId": "..."}
• Result Status: Status becomes -3 (Cancelled)
.
4.3 Final Transaction Confirmation
The transaction is complete when the crypto withdrawal has been successfully executed to the user's wallet address.
• Status Codes: Look for order status 4 or 15 (withdrawal complete)
.
• Data Confirmation: The detailed status response (via polling or webhook) will contain the transactionHash and actualCryptoAmount
.
• UI Update: Once status 4 or 15 is confirmed, update the user interface to show the successful purchase and display the final transaction hash
.
Summary of Key Onramp Status Codes (For Polling/Webhooks)
Status Code
	
Meaning
0
	
Transaction created (Waiting for Payment)
.
1
	
ReferenceId claimed (User submitted reference for fiat deposit)
.
2
	
Deposit secured (Fiat payment confirmed)
.
3, 13
	
Crypto purchased (System is buying crypto)
.
4, 15
	
Withdrawal complete (SUCCESS)
.
-3
	
Cancelled (E.g., bank and KYC name mismatch)
.
kycNeeded: 1
	
KYC needed to process this transaction
.


Design No. 2
## Detailed Implementation Plan: Transition to Seamless Whitelabel OnRamp Flow

Based on the documentation analysis, here's a comprehensive plan to transition from the current hosted widget approach to the seamless whitelabel direct API integration:

## Phase 1: Foundation Setup (Priority: Critical)

### 1.1 Webhook Configuration (Mandatory First Step)

```typescript
// Add to OnRampMoneyService
async configureWebhook(): Promise<void> {
  const webhookUrl = `${env.API_URL}/api/onramp/webhook`;
  
  const response = await axios.post(
    `${ONRAMP_BASE_URL}/onramp/api/v1/merchant/setWebhookUrl`,
    { webhookUrl },
    {
      headers: {
        'X-ONRAMP-APIKEY': env.ONRAMP_API_LIVE_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.data.success) {
    throw new Error('Failed to configure webhook URL');
  }
}
```

### 1.2 Update Environment Configuration

```bash
# Add to .env
ONRAMP_WEBHOOK_SECRET=your_webhook_secret_for_additional_security
ONRAMP_KYC_REDIRECT_URL=https://yourdomain.com/onramp/kyc/callback
```

## Phase 2: Direct API Integration (Priority: High)

### 2.1 Replace createOrder with Direct API Call

```typescript
// In OnRampMoneyService - Replace current createOrder method
async createDirectOrder(params: CreateOnRampOrderParams): Promise<DirectOnRampOrder> {
  const {
    userId,
    fiatAmount,
    fiatCurrency,
    cryptoCurrency,
    network,
    walletAddress,
    paymentMethod,
  } = params;

  // Get coinId and chainId from supported assets
  const { coinId, chainId } = await this.getAssetIds(cryptoCurrency, network);
  
  // Create order using direct API
  const orderData = {
    coinId,
    chainId,
    coinAmount: await this.calculateCryptoAmount(fiatAmount, fiatCurrency, coinId, chainId),
  };

  const response = await axios.post(
    `${ONRAMP_BASE_URL}/onramp-merchants/widget/createOrder`,
    orderData,
    {
      headers: {
        'X-ONRAMP-APIKEY': env.ONRAMP_API_LIVE_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const { orderId, address: depositAddress, endTime } = response.data.data;

  return {
    orderId,
    depositAddress,
    endTime: new Date(endTime * 1000), // Convert Unix timestamp
    fiatAmount,
    cryptoCurrency,
    network,
    walletAddress,
  };
}
```

### 2.2 Add Order Status Polling

```typescript
// Add to OnRampMoneyService
async pollOrderStatus(orderId: string): Promise<OrderStatus> {
  const response = await axios.post(
    `${ONRAMP_BASE_URL}/onramp-merchants/widget/getOrder`,
    { orderId },
    {
      headers: {
        'X-ONRAMP-APIKEY': env.ONRAMP_API_LIVE_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    status: response.data.data.status,
    kycNeeded: response.data.data.kycNeeded,
    transactionHash: response.data.data.transactionHash,
    actualCryptoAmount: response.data.data.actualCryptoAmount,
  };
}
```

## Phase 3: Hybrid KYC Implementation (Priority: High)

### 3.1 Add KYC Detection and Redirection

```typescript
// Add to frontend - useEffect for polling
useEffect(() => {
  if (!orderId) return;

  const pollInterval = setInterval(async () => {
    const status = await onrampApi.pollOrderStatus(orderId);
    
    if (status.kycNeeded === 1) {
      // Stop polling and initiate KYC
      clearInterval(pollInterval);
      initiateKYC(orderId);
    } else if (status.status === 4 || status.status === 15) {
      // Transaction complete
      clearInterval(pollInterval);
      handleSuccess(status);
    }
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(pollInterval);
}, [orderId]);
```

### 3.2 Implement KYC Widget Integration

```typescript
// Add new API endpoint for KYC initiation
router.post('/onramp/kyc/initiate', authenticate, async (req, res) => {
  const { orderId } = req.body;
  
  // Get KYC parameters from OnRamp API
  const kycConfig = await onrampMoneyService.getKYCConfig(orderId);
  
  // Generate signature for KYC widget
  const signature = generateKYCSignature(kycConfig);
  
  res.json({
    success: true,
    kycConfig: {
      appId: env.ONRAMP_APP_LIVE_ID,
      payload: kycConfig.payload,
      signature: signature,
      customerId: req.user.id,
      apiKey: env.ONRAMP_API_LIVE_KEY,
      redirectUrl: `${env.FRONTEND_URL}/onramp/kyc/callback`,
    },
  });
});
```

## Phase 4: Enhanced Frontend (Priority: Medium)

### 4.1 New UI Components

```typescript
// Create PaymentInstructions component
interface PaymentInstructionsProps {
  depositAddress: string;
  endTime: Date;
  fiatAmount: number;
  fiatCurrency: string;
  paymentMethod: number;
}

function PaymentInstructions({ depositAddress, endTime, fiatAmount, fiatCurrency, paymentMethod }: PaymentInstructionsProps) {
  const timeLeft = useCountdown(endTime);
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Payment Instructions</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Deposit Address</label>
          <div className="flex items-center gap-2 mt-1">
            <Input value={depositAddress} readOnly className="font-mono" />
            <Button onClick={() => navigator.clipboard.writeText(depositAddress)}>
              Copy
            </Button>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium">Amount to Send</label>
          <div className="text-2xl font-bold mt-1">
            {fiatAmount} {fiatCurrency}
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Complete payment within {timeLeft}
            </span>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {paymentMethod === 1 ? 'Use UPI/Instant Transfer' : 'Use Bank Transfer (IMPS/FAST)'}
        </div>
      </div>
    </Card>
  );
}
```

### 4.2 Order Status Tracking Component

```typescript
// Create OrderStatusTracker component
function OrderStatusTracker({ orderId }: { orderId: string }) {
  const { data: status, isLoading } = useOnRampOrderStatus(orderId);
  
  const getStatusInfo = (status: number) => {
    const statusMap = {
      0: { label: 'Waiting for Payment', icon: Clock, color: 'text-yellow-600' },
      1: { label: 'Reference Claimed', icon: CheckCircle, color: 'text-blue-600' },
      2: { label: 'Deposit Secured', icon: Shield, color: 'text-green-600' },
      3: { label: 'Purchasing Crypto', icon: ShoppingCart, color: 'text-blue-600' },
      4: { label: 'Complete!', icon: PartyPopper, color: 'text-green-600' },
    };
    
    return statusMap[status] || { label: 'Processing', icon: Loader2, color: 'text-gray-600' };
  };
  
  if (isLoading) return <LoadingSpinner />;
  
  const statusInfo = getStatusInfo(status?.status);
  const Icon = statusInfo.icon;
  
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 ${statusInfo.color}`} />
        <div>
          <h3 className="font-semibold">{statusInfo.label}</h3>
          {status?.transactionHash && (
            <p className="text-sm text-muted-foreground">
              Transaction: {truncateHash(status.transactionHash)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
```

## Phase 5: Advanced Features (Priority: Low)

### 5.1 Order Time Extension

```typescript
// Add to OnRampMoneyService
async extendOrderTime(orderId: string): Promise<boolean> {
  const response = await axios.post(
    `${ONRAMP_BASE_URL}/onramp-merchants/widget/extendTime`,
    { orderId },
    {
      headers: {
        'X-ONRAMP-APIKEY': env.ONRAMP_API_LIVE_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data.success;
}
```

### 5.2 Order Cancellation

```typescript
// Add to OnRampMoneyService
async cancelOrder(orderId: string): Promise<boolean> {
  const response = await axios.post(
    `${ONRAMP_BASE_URL}/onramp-merchants/widget/cancelOrder`,
    { orderId },
    {
      headers: {
        'X-ONRAMP-APIKEY': env.ONRAMP_API_LIVE_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data.success;
}
```

## Implementation Timeline

__Week 1__: Phase 1 (Webhook configuration) + Phase 2 (Direct API) __Week 2__: Phase 3 (KYC integration) + Frontend updates __Week 3__: Testing, bug fixes, and optimization __Week 4__: Advanced features and production deployment

## Key Success Metrics

1. __Webhook Reliability__: 99%+ webhook delivery success rate
2. __KYC Completion__: <2 minute KYC redirection time
3. __Status Updates__: Real-time order status within 5 seconds
4. __User Experience__: Complete flow within your UI (no external redirects)
5. __Transaction Success__: >95% successful transaction completion rate
