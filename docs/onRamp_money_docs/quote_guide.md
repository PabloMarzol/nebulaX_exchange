Technical Plan: Real-Time Quote Generation (Onramp)
I. Data Pre-Requisites (Backend Lookup)
Before generating a quote, your application must possess the necessary identifiers (coinId, chainId, fiatType) corresponding to the user's selections (e.g., buying "USDT" on "MATIC20" using "INR").
1.1 Retrieve Supported Asset and Network Identifiers
The developer must use a configuration endpoint to fetch the mappings necessary to construct the request body.
• API Endpoint: GET https://api.onramp.money/onramp/api/v2/sell/public/allConfig
• Purpose: This API provides comprehensive token/coin and price information
. The developer must parse this response to obtain the coinId and chainId values for the assets selected by the user (e.g., USDT on MATIC20)
.
• Alternative Mapping: Use the All Config Mapping API (POST /v2/common/transaction/allConfigMapping) to retrieve JSON mappings for fiatSymbol to fiatId, coinSymbol to coinId, and chainSymbol to chainId
.
II. Quotes API Implementation
This process executes every time the user modifies the input (e.g., changes the fiat amount, cryptocurrency, or network).
2.1 API Endpoint and Method
The quote request uses the dedicated Quotes API for Onramp transactions.
• Endpoint: POST https://api.onramp.money/onramp/api/v2/common/transaction/quotes
• Headers: Secure the request using your credentials:
    ◦ X-ONRAMP-APIKEY: .. (Your live key)
    ◦ X-ONRAMP-PAYLOAD
    ◦ X-ONRAMP-SIGNATURE
2.2 Constructing the Request Body
The request must specify the transaction type and define the assets using either their IDs or codes.
Parameter
	
Type
	
Mandatory Requirement
	
Source of Value
fiatAmount
	
Float
	
Required (*)
	
User input (the amount of fiat currency they want to spend).
type
	
Integer
	
Required (*)
	
Must be set to 1 (denotes Onramp transaction)
.
coinId or coinCode
	
Integer or String
	
At least one is required
	
Looked up from configuration APIs (e.g., usdt).
chainId or network
	
Integer or String
	
At least one is required
	
Looked up from configuration APIs (e.g., matic20).
fiatType or countryCode
	
Integer or String
	
At least one is required
	
Looked up from configuration APIs (e.g., 1 for INR, 2 for TRY)
.
Example Request Body (Hypothetical): If a user inputs 1000 INR to buy USDT on MATIC20:

{
    "fiatAmount": 1000.00,
    "fiatType": 1,         
    "coinCode": "USDT",      
    "network": "MATIC20",    
    "type": 1              
}

III. Processing and Displaying the Quote
Upon receiving a successful response (status 1)
, the application should immediately display the estimates and fee breakdown in the user interface.
3.1 Extracting Response Data
The Quote API response provides all necessary figures for the quote calculation:
Response Field
	
Description
	
Purpose in UI
quantity
	
The amount of crypto estimate
.
	
The final crypto amount the user is expected to receive.
rate
	
The expected price estimate shown at the beginning of the transaction
.
	
Used to calculate the exchange rate applied.
onRampFee
	
Fee charged by Onramp (in percentage)
.
	
Detail Onramp's cut.
clientFee
	
Fee charged by the partner/client
.
	
Detail your own optional fee customization
.
gatewayFee
	
Fee charged by the payment gateway
.
	
Detail payment processor costs.
gasFee
	
Onchain transaction fee charged
.
	
Detail network costs.
3.2 UI Logic and Display
The developer should present the input amount, the estimated output (quantity), and the total estimated fees (sum of onRampFee, clientFee, gatewayFee, and gasFee) to provide a complete pre-order confirmation to the user. This transparency is crucial before proceeding to the Create Order step.