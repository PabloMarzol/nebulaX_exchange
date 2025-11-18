/example/index.html
<!DOCTYPE HTML>
<html lang="en">
<head>
    <meta charset = "UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body>

</body>
</html>

Add two script references into the <head> section:

<script src="charting_library/charting_library.standalone.js"></script>
<script src="datafeeds/udf/dist/bundle.js"></script>

charting_library/charting_library.standalone.js contains the code that creates the chart widget.
datafeeds/udf/dist/bundle.js contains a sample datafeed implementation that loads data to the chart.
Define the container for the chart in the <body> section:

<div id="chartContainer"></div>

To create a chart, you should initialize the Widget Constructor in <body>. To do this, configure some basic Widget Constructor parameters:

<script>
    new TradingView.widget({
        container: 'chartContainer',
        locale: 'en',
        library_path: 'charting_library/',
        datafeed: new Datafeeds.UDFCompatibleDatafeed("https://demo-feed-data.tradingview.com"),
        symbol: 'AAPL',
        interval: '1D',
        fullscreen: true,
        debug: true
    });
</script>

container is set to the container ID from the previous step.
library_path specifies a path to additional HTML, JavaScript, and CSS files that allow you to render the chart. In this tutorial, the charting_library folder stores these files.
datafeed is set to the UDFCompatibleDatafeed sample that TradingView provides.
Run the library
Execute the following command in the example folder to run the library locally.

# Python 2.x
python -m SimpleHTTPServer 9090

# Python 3.x
python -m http.server 9090

In this tutorial, the Python http.server module is used. You can use any server/port that you prefer. The tips below explain how to run the most common HTTP servers.

Node.js

Install http-server.

npm install http-server -g

Start http-server using the following command in the library folder.

http-server -p 9090

NGINX

Install NGINX.

Open the nginx.conf file and insert the following code into the http section of the file:

server {
    listen       9090;
    server_name  localhost;

    location / {
        root ABSOLUTE_PATH_TO_THE_TUTORIAL_FOLDER;
    }
}

Replace ABSOLUTE_PATH_TO_THE_TUTORIAL_FOLDER with the absolute path to the tutorial folder (example in this tutorial).

Run NGINX.

Open http://localhost:9090/ in your web browser to see the result.

Running Library

Complete code
/example/index.html
<!DOCTYPE HTML>
<html lang="en">
    <head>
        <meta charset = "UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TradingView - Advanced Charts</title>


        <script src="charting_library/charting_library.standalone.js"></script>
        <script src="datafeeds/udf/dist/bundle.js"></script>
    </head>
    <body>

        <div id="chartContainer"></div>

        <script>
            new TradingView.widget({
                container: 'chartContainer',
                locale: 'en',
                library_path: 'charting_library/',
                datafeed: new Datafeeds.UDFCompatibleDatafeed("https://demo-feed-data.tradingview.com"),
                symbol: 'AAPL',
                interval: '1D',
                fullscreen: true,
                debug: true,
            });
        </script>
    </body>
</html>

How to enable debug mode
This article will guide you through enabling debug mode in the library. This feature provides detailed logs and error messages in the browser's Developer Tools, helping you identify issues and ensure your application runs smoothly.

The library offers two debug options:

Logging messages related to connecting data using the Datafeed API.
Logging messages related to trading features in the Trading Platform.
Enable debug mode for data connection
The Datafeed API is a set of methods that allow you to connect market data to the library. The debug mode in the Datafeed API is useful for identifying how the library loads, processes, and resolves data. You can also check the number of bars requested versus the number of bars received.

You can enable the debug mode in two ways:

Set the debug property to true in the Widget Constructor.

const datafeed = new Datafeeds.UDFCompatibleDatafeed("https://demo-feed-data.tradingview.com");
new TradingView.widget({
    container: "chartContainer",
    locale: "en",
    library_path: "charting_library/",
    datafeed: datafeed,
    symbol: "AAPL",
    interval: "1D",
    debug: true,
})

Call the setDebugMode method after the chart is initialized.

var widget = window.tvWidget = new TradingView.widget({ /* Widget Constructor properties */});

widget.onChartReady(() => {
    widget.setDebugMode(true);
});

Once the debug mode is enabled and you run your app, you can access the console logs in the Developer Tools of your browser. Below is an example of the generated logs.

2024-08-20T13:36:56.244Z Symbol resolve requested: `AAPL`
2024-08-20T13:36:56.504Z FEED [AAPL|1D]: Processing pending subscribers, count=2
2024-08-20T13:36:56.504Z FEED [AAPL|1D]: Leftmost subscriber requires 329 bars prior 2024-08-20T00:00:00.000Z
2024-08-20T13:36:56.505Z FEED [AAPL|1D]: Requesting data: [2023-05-18T00:00:00.000Z ... 2024-08-21T00:00:00.000Z, 330 bars]
2024-08-20T13:36:56.735Z FEED [AAPL|1D]: Receiving bars: total 330 bars in  [2016-11-30T00:00:00.000Z ... 2018-03-27T00:00:00.000Z], requested range: [2023-05-18T00:00:00.000Z ... 2024-08-21T00:00:00.000Z, 330 bars]


Enable debug mode for trading
If you are working with Trading Platform, you can also enable the debug mode for the trading part of your implementation. This mode allows you to check which methods are triggered based on user actions, what data the library sends, and what it expects to receive.

Trading is based on two key components: the Broker API and the Trading Host. The Broker API acts as a bridge between the library and your backend trading server, transmitting data between them. The Trading Host provides the library with updates that it did not request, but these updates are necessary to display up-to-date information. Therefore, the debug mode in trading offers several options, allowing you to choose which logs you want to see.

To enable debug mode, use the debug_broker property in the Widget Constructor. You can set this property to one of the debug levels defined by the BrokerDebugMode type:

all: logs all possible debug messages.
broker-only: logs only messages related to the Broker API.
host-only: logs only messages related to the Trading Host.
normal: logs messages for the Broker API and Trading Host but excludes frequently called methods, such as connectionStatus.
In the example below, the debug mode enables messages related to the Broker API.

const datafeed = new Datafeeds.UDFCompatibleDatafeed("https://demo-feed-data.tradingview.com");
new TradingView.widget({
    container: "chartContainer",
    locale: "en",
    library_path: "charting_library/",
    datafeed: datafeed,
    symbol: "AAPL",
    interval: "1D",
    debug_broker: "broker-only",
})

Once the debug mode is enabled and you run your app, you can access the console logs in the Developer Tools of your browser. Below is an example of the generated logs.

2024-08-22T09:18:12.344Z Broker API   | id: 1 | method: placeOrder | CALLED with arguments: [{"symbol":"AAPL","type":2,"qty":100,"side":1,"seenPrice":173.68,"currentQuotes":{"ask":173.68,"bid":173.68},"stopType":0,"customFields":{}},null]
2024-08-22T09:18:12.344Z Broker API   | id: 1 | method: placeOrder |  RETURNED (async): {}

How to connect data via datafeed API
This tutorial explains how to implement real-time data streaming to Advanced Charts / Trading Platform step-by-step. As an example, the tutorial describes connection via free CryptoCompare API that provides data from several crypto exchanges.

After completing this tutorial, you will learn how to implement datafeed using Datafeed API, display historical data using ordinary HTTP requests, and stream real-time data via WebSocket.

The tutorial is divided into three parts:

Widget Constructor set-up
Datafeed implementation
Streaming implementation
Tips
You can find the final code for this tutorial on the GitHub repository.
At the end of each section, you will find the complete code blocks related to a specific step.
Before proceeding with the tutorial, we recommend checking the Prerequisites section.
Prerequisites
Get repository access
The Advanced Charts repository is private. Refer to the Getting Access section for more information.

Use external data source
The library is used to display financial data but it does not contain or provide any data. You need to implement your own data source to display data in the library. It can be a web API, a database, or a CSV file.

This tutorial uses the CryptoCompare API, which has a wide range of market data. Note that CryptoCompare requires an API key to request their stream data. You need to get such key to complete the tutorial. Refer to the CryptoCompare documentation for more information.

caution
We cannot guarantee that CryptoCompare works in your region. If you see the ERR_CONNECTION_REFUSED error when running the tutorial, try to use a proxy or VPN.

See results on the fly
If you want to see the results of this tutorial right away, take the following steps:

Clone the tutorial repository. Note that for the real project, it is better to use this repository as a submodule in yours.

git clone https://github.com/tradingview/charting-library-tutorial.git

Go to the repository folder and initialize the Git submodule with the library:

git submodule update --init --recursive

Alternatively, you can download the library repository from a ZIP file or clone it using Git.

Run the following command to serve static files:

npx serve

Step 1. Clone the library
Create a directory for your project:

mkdir chart-project
cd chart-project

Clone the library repository 🔐 (access is restricted).

git clone https://github.com/tradingview/charting_library charting_library_cloned_data

Step 2. Add a container
To display the chart, you need to add a DOM container. To do this, create an initial index.html file in your project directory (chart‑project in this tutorial) and add the following code:

/chart‑project/index.html
<!DOCTYPE HTML>
<html>
    <head>
        <title>TradingView Advanced Charts example</title>

        <!-- The script that loads the library -->
        <script
            type="text/javascript"
            src="charting_library_cloned_data/charting_library/charting_library.js">
        </script>

        <!-- Custom datafeed module -->
        <script type="module" src="src/main.js"></script>
    </head>

    <body style="margin:0px;">
        <!-- A container for the the library widget -->
        <div id="tv_chart_container">
        </div>
    </body>
</html>

At this point, you added a script that is used to load the library and a container that will be used as a placeholder for the chart.

Step 3. Create Widget Constructor
Add the src folder to your project directory.

Create a main.js file in src and add the following code that creates Widget Constructor. Widget Constructor is the library entry point that allows embedding the library widget into your web page.

/chart‑project/src/main.js
// Datafeed implementation that you will add later
import Datafeed from './datafeed.js';

window.tvWidget = new TradingView.widget({
    symbol: 'BTC/EUR',                     // Default symbol pair
    interval: '1D',                        // Default interval
    fullscreen: true,                      // Displays the chart in the fullscreen mode
    container: 'tv_chart_container',       // Reference to an attribute of a DOM element
    datafeed: Datafeed,
    library_path: '../charting_library_cloned_data/charting_library/',
});

tip
This tutorial uses only the required Widget Constructor parameters that will be enabled when the chart is first loaded. However, Widget Constructor has many different parameters to manage. You can find the full list in the ChartingLibraryWidgetOptions interface.

Next steps
At this stage, you have set up Widget Constructor. Next, you will implement your own datafeed and methods.

Complete code
Click the following sections to reveal the complete code for the examples at this stage of the tutorial.

index.html
<!DOCTYPE HTML>
<html>
    <head>
        <title>TradingView Advanced Charts example</title>

        <!-- The script that loads the library -->
        <script
            type="text/javascript"
            src="charting_library_cloned_data/charting_library/charting_library.js">
        </script>

        <!-- Custom datafeed module -->
        <script type="module" src="src/main.js"></script>
    </head>

    <body style="margin:0px;">
        <!-- A container for the the library widget -->
        <div id="tv_chart_container">
        </div>
    </body>
</html>

main.js
// Datafeed implementation that you will add later
import Datafeed from './datafeed.js';

window.tvWidget = new TradingView.widget({
    symbol: 'BTC/EUR',                     // Default symbol pair
    interval: '1D',                        // Default interval
    fullscreen: true,                      // Displays the chart in the fullscreen mode
    container: 'tv_chart_container',       // Reference to the attribute of the DOM element
    datafeed: Datafeed,
    library_path: '../charting_library_cloned_data/charting_library/',
});

Implement datafeed
tip
This article is part of a tutorial about implementing Datafeed API. We recommend that you follow the guide from the start.

At this stage, you will know how the Datafeed API works and implement your own datafeed and methods.

How the datafeed works
Datafeed API is a set of methods that you should implement and assign to the datafeed object in Widget Constructor. The library calls these methods to access and process data and fill the current chart with it. The datafeed returns results using callback functions. Refer to the Datafeed API topic for more information.

Step 1. Create a datafeed mock
Create a datafeed.js file in src and add the following code:

/chart‑project/src/datafeed.js
export default {
    onReady: (callback) => {
        console.log('[onReady]: Method call');
    },
    searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
        console.log('[searchSymbols]: Method call');
    },
    resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback, extension) => {
        console.log('[resolveSymbol]: Method call', symbolName);
    },
    getBars: (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        console.log('[getBars]: Method call', symbolInfo);
    },
    subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
        console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
    },
    unsubscribeBars: (subscriberUID) => {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
    },
};


This code sample represents a datafeed that writes a message to the console when any method is called. Now this is only a mock implementation, but you will implement all the methods in the next steps.

Step 2. Implement methods
onReady
The onReady method is the first datafeed method that is called when the chart is initialized. The library uses it to get datafeed configuration such as supported resolutions and exchanges.

Add the following DatafeedConfiguration implementation for the datafeed sample:

/chart‑project/src/datafeed.js
const configurationData = {
    // Represents the resolutions for bars supported by your datafeed
    supported_resolutions: ['1D', '1W', '1M'],
    // The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
    exchanges: [
        { value: 'Bitfinex', name: 'Bitfinex', desc: 'Bitfinex'},
        { value: 'Kraken', name: 'Kraken', desc: 'Kraken bitcoin exchange'},
    ],
    // The `symbols_types` arguments are used for the `searchSymbols` method if a user selects this symbol type
    symbols_types: [
        { name: 'crypto', value: 'crypto'}
    ]
};


Call the OnReadyCallback asynchronously and pass a DatafeedConfiguration object as a parameter:

/chart‑project/src/datafeed.js
onReady: (callback) => {
    console.log('[onReady]: Method call');
    setTimeout(() => callback(configurationData));
},

resolveSymbol
The resolveSymbol method is called once the datafeed is configured. The library uses it to retrieve symbol information such as exchange, time zone, price scale, and etc.

As mentioned before, the library does not contain or provide any data. For this reason, this tutorial uses the CryptoCompare API.

Create a helpers.js file for the CryptoCompare API functions and add the following code:

/chart‑project/src/helpers.js
// Your CryptoCompare API key
export const apiKey = "<api-key>";

// Makes requests to CryptoCompare API
export async function makeApiRequest(path) {
    try {
        const url = new URL(`https://min-api.cryptocompare.com/${path}`);
        url.searchParams.append('api_key',apiKey)
        const response = await fetch(url.toString());
        return response.json();
    } catch (error) {
        throw new Error(`CryptoCompare request error: ${error.status}`);
    }
}

// Generates a symbol ID from a pair of the coins
export function generateSymbol(exchange, fromSymbol, toSymbol) {
    const short = `${fromSymbol}/${toSymbol}`;
    return {
        short,
    };
}

At this step, you need a CryptoCompare API key (line 2). If you have not got this key yet, consider the CryptoCompare documentation. Also, note that the makeApiRequest and generateSymbol functions are specific to CryptoCompare API and will be used in resolveSymbol. You might not need them when implementing your own datafeed.

Import the functions from helpers.js into datafeed.js:

/chart‑project/src/datafeed.js
import { makeApiRequest, generateSymbol } from './helpers.js';

Implement the getAllSymbols function to obtain all symbols for all supported exchanges.

/chart‑project/src/datafeed.js
// DatafeedConfiguration implementation
// ...
// Obtains all symbols for all exchanges supported by CryptoCompare API
async function getAllSymbols() {
    const data = await makeApiRequest('data/v3/all/exchanges');
    let allSymbols = [];

    for (const exchange of configurationData.exchanges) {
        const pairs = data.Data[exchange.value].pairs;

        for (const leftPairPart of Object.keys(pairs)) {
            const symbols = pairs[leftPairPart].map(rightPairPart => {
                const symbol = generateSymbol(exchange.value, leftPairPart, rightPairPart);
                return {
                    symbol: symbol.short,
                    ticker: symbol.short,
                    description: symbol.short,
                    exchange: exchange.value,
                    type: 'crypto',
                };
            });
            allSymbols = [...allSymbols, ...symbols];
        }
    }
    return allSymbols;
}

Implement the resolveSymbol method and specify symbol information in a symbolInfo object according to LibrarySymbolInfo.

/chart‑project/src/datafeed.js
resolveSymbol: async (
    symbolName,
    onSymbolResolvedCallback,
    onResolveErrorCallback,
    extension
) => {
    console.log('[resolveSymbol]: Method call', symbolName);
    const symbols = await getAllSymbols();
    const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);
    if (!symbolItem) {
        console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
        onResolveErrorCallback('Cannot resolve symbol');
        return;
    }
    // Symbol information object
    const symbolInfo = {
        ticker: symbolItem.ticker,
        name: symbolItem.symbol,
        description: symbolItem.description,
        type: symbolItem.type,
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: symbolItem.exchange,
        minmov: 1,
        pricescale: 100,
        has_intraday: false,
        visible_plots_set: 'ohlc',
        has_weekly_and_monthly: false,
        supported_resolutions: configurationData.supported_resolutions,
        volume_precision: 2,
        data_status: 'streaming',
    };
    console.log('[resolveSymbol]: Symbol resolved', symbolName);
    onSymbolResolvedCallback(symbolInfo);
},

info
In this tutorial, you specified supported_resolutions: ['1D', '1W', '1M'] in the onReady method. The library can build weekly and monthly resolutions from the daily ones (1D). However, you need to directly specify that the datafeed does not have these resolutions by setting has_weekly_and_monthly to false.

getBars
The library uses getBars to get historical data for a symbol within a certain range. Historical data will be retrieved from the CryptoCompare API.

In helpers.js, implement a parseFullSymbol function that will parse a crypto pair symbol and return all parts of this symbol. Note that the full value is returned from generateSymbol.

/chart‑project/src/helpers.js
// makeApiRequest and generateSymbol implementation
// ...
// Returns all parts of the symbol
export function parseFullSymbol(fullSymbol) {
    const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
    if (!match) {
        return null;
    }
    return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}

Import parseFullSymbol into datafeed.js.

/chart‑project/src/datafeed.js
import { makeApiRequest, generateSymbol, parseFullSymbol } from './helpers.js';

Implement getBars using parseFullSymbol and CryptoCompare's Daily Pair OHLCV to retrieve historic OHLCV data.

caution
The CryptoCompare API does not allow specifying the from date, so you have to filter bars on the client side.

/chart‑project/src/datafeed.js
getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    const { from, to, firstDataRequest } = periodParams;
    console.log('[getBars]: Method call', symbolInfo, resolution, from, to);
    const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
    const urlParameters = {
        e: parsedSymbol.exchange,
        fsym: parsedSymbol.fromSymbol,
        tsym: parsedSymbol.toSymbol,
        toTs: to,
        limit: 2000,
    };
    const query = Object.keys(urlParameters)
        .map(name => `${name}=${encodeURIComponent(urlParameters[name])}`)
            .join('&');
    try {
        const data = await makeApiRequest(`data/histoday?${query}`);
        if (data.Response && data.Response === 'Error' || data.Data.length === 0) {
            // "noData" should be set if there is no data in the requested period
            onHistoryCallback([], { noData: true });
            return;
        }
        let bars = [];
        data.Data.forEach(bar => {
            if (bar.time >= from && bar.time < to) {
                bars = [...bars, {
                    time: bar.time * 1000,
                    low: bar.low,
                    high: bar.high,
                    open: bar.open,
                    close: bar.close,
                }];
            }
        });
        console.log(`[getBars]: returned ${bars.length} bar(s)`);
        onHistoryCallback(bars, { noData: false });
    } catch (error) {
        console.log('[getBars]: Get error', error);
        onErrorCallback(error);
    }
},

searchSymbols
The library uses the searchSymbols method to request symbols that match some user input.

/chart‑project/src/datafeed.js
searchSymbols: async (
    userInput,
    exchange,
    symbolType,
    onResultReadyCallback
) => {
    console.log('[searchSymbols]: Method call');
    const symbols = await getAllSymbols();
    const newSymbols = symbols.filter(symbol => {
        const isExchangeValid = exchange === '' || symbol.exchange === exchange;
        const fullName = `${symbol.exchange}:${symbol.ticker}`;
        const isFullSymbolContainsInput = fullName
            .toLowerCase()
            .indexOf(userInput.toLowerCase()) !== -1;
        return isExchangeValid && isFullSymbolContainsInput;
    });
    onResultReadyCallback(newSymbols);
},

In this case, you will request all available symbols from the API and filter them in datafeed.js. If a user has not selected an exchange, the exchange argument will be equal to an empty string.

Result
At this point, you have implemented datafeed. Save all your changes and run the following command from your project directory (chart‑project in this tutorial):

npx serve

Open the library locally in your web browser to see the results. You should see a chart plotted and be able to search symbols and display historical data.

Implement streaming
tip
This article is part of a tutorial about implementing Datafeed API. We recommend that you follow the guide from the start.

At this stage, you will implement real-time data updates via WebSocket. You will know how to:

Connect to streaming and unsubscribe from it.
Subscribe for data updates and handle them.
Step 1. Connect to streaming
To connect your datafeed to the streaming API:

Import apiKey from helpers.js into streaming.js.

/chart‑project/src/streaming.js
import { apiKey } from './helpers.js';

Create a new file called streaming.js, where you will implement a connection to WebSocket.

/chart‑project/src/streaming.js
const socket = new WebSocket(
    'wss://streamer.cryptocompare.com/v2?api_key=' + apiKey
);

const channelToSubscription = new Map();

socket.addEventListener('open', () => {
    console.log('[socket] Connected');
});

socket.addEventListener('close', (reason) => {
    console.log('[socket] Disconnected:', reason);
});

socket.addEventListener('error', (error) => {
    console.log('[socket] Error:', error);
});

export function subscribeOnStream() {
    // To Do
}

export function unsubscribeFromStream() {
    // To Do
}

Import the functions from streaming.js into datafeed.js:

/chart‑project/src/datafeed.js
import { subscribeOnStream, unsubscribeFromStream } from './streaming.js';

To subscribe for real-time data updates for a symbol, implement subscribeBars. the library calls it every time the chart symbol or resolution is changed, or when the chart needs to subscribe to a new symbol.

/chart‑project/src/datafeed.js
// ...
// Use it to keep a record of the most recent bar on the chart
const lastBarsCache = new Map();
// ...
export default {
    // ...
    subscribeBars: (
        symbolInfo,
        resolution,
        onRealtimeCallback,
        subscriberUID,
        onResetCacheNeededCallback
    ) => {
        console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
        subscribeOnStream(
            symbolInfo,
            resolution,
            onRealtimeCallback,
            subscriberUID,
            onResetCacheNeededCallback,
            lastBarsCache.get(symbolInfo.full_name),
        );
    },
};

Implement unsubscribeBars to stop receiving updates for the symbol when a user selects another symbol on the chart.

/chart‑project/src/datafeed.js
unsubscribeBars: (subscriberUID) => {
    console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
    unsubscribeFromStream(subscriberUID);
},

Step 2. Subscribe for updates
On the previous step, you connected your datafeed to WebSocket. Now, you need to subscribe to the channels to receive updates:

Import parseFullSymbol from helpers.js into streaming.js.

/chart‑project/src/streaming.js
import { parseFullSymbol, apiKey } from './helpers.js';

Implement subscribeOnStream to subscribe for updates.

/chart‑project/src/streaming.js
// ...
const channelToSubscription = new Map();
// ...
export function subscribeOnStream(
    symbolInfo,
    resolution,
    onRealtimeCallback,
    subscriberUID,
    onResetCacheNeededCallback,
    lastDailyBar
)
{
    const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
    const channelString = `0~${parsedSymbol.exchange}~${parsedSymbol.fromSymbol}~${parsedSymbol.toSymbol}`;
    const handler = {
        id: subscriberUID,
        callback: onRealtimeCallback,
    };
    let subscriptionItem = channelToSubscription.get(channelString);
    if (subscriptionItem) {
        // Already subscribed to the channel, use the existing subscription
        subscriptionItem.handlers.push(handler);
        return;
    }
    subscriptionItem = {
        subscriberUID,
        resolution,
        lastDailyBar,
        handlers: [handler],
    };
    channelToSubscription.set(channelString, subscriptionItem);
    console.log(
        '[subscribeBars]: Subscribe to streaming. Channel:',
        channelString
    );
    const subRequest = {
        action: 'SubAdd',
        subs: [channelString],
    };
    socket.send(JSON.stringify(subRequest));
}


Step 3. Unsubscribe from streaming
Implement unsubscribeFromStream to unsubscribe from streaming:

/chart‑project/src/streaming.js
export function unsubscribeFromStream(subscriberUID) {
    // Find a subscription with id === subscriberUID
    for (const channelString of channelToSubscription.keys()) {
        const subscriptionItem = channelToSubscription.get(channelString);
        const handlerIndex = subscriptionItem.handlers.findIndex(
            (handler) => handler.id === subscriberUID
        );
        if (handlerIndex !== -1) {
            // Remove from handlers
            subscriptionItem.handlers.splice(handlerIndex, 1);
            if (subscriptionItem.handlers.length === 0) {
                // Unsubscribe from the channel if it was the last handler
                console.log(
                    '[unsubscribeBars]: Unsubscribe from streaming. Channel:',
                    channelString
                );
                const subRequest = {
                    action: 'SubRemove',
                    subs: [channelString],
                };
                socket.send(JSON.stringify(subRequest));
                channelToSubscription.delete(channelString);
                break;
            }
        }
    }
}

Step 4. Handle updates
The responses for requests look like this:

0~Bitfinex~BTC~USD~2~335394436~1548837377~0.36~3504.1~1261.4759999999999~1f

To handle updates coming from the WebSocket:

Implement the following function in streaming.js:

/chart‑project/src/streaming.js
    // ...
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('[socket] Message:', data);
    const {
        TYPE: eventTypeStr,
        M: exchange,
        FSYM: fromSymbol,
        TSYM: toSymbol,
        TS: tradeTimeStr,
        P: tradePriceStr,
    } = data;

    if (parseInt(eventTypeStr) !== 0) {
        // Skip all non-trading events
        return;
    }
    const tradePrice = parseFloat(tradePriceStr);
    const tradeTime = parseInt(tradeTimeStr);
    const channelString = `0~${exchange}~${fromSymbol}~${toSymbol}`;
    const subscriptionItem = channelToSubscription.get(channelString);
    if (subscriptionItem === undefined) {
        return;
    }
    const lastDailyBar = subscriptionItem.lastDailyBar;
    let bar = {
        ...lastDailyBar,
        high: Math.max(lastDailyBar.high, tradePrice),
        low: Math.min(lastDailyBar.low, tradePrice),
        close: tradePrice,
    };
    console.log('[socket] Update the latest bar by price', tradePrice);
    subscriptionItem.lastDailyBar = bar;

    // Send data to every subscriber of that symbol
    subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
});

Adjust the getBars method in datafeed.js to save the last bar data for the current symbol.

/chart‑project/src/datafeed.js
//...
data.Data.forEach( ... );
if (firstDataRequest) {
    lastBarsCache.set(symbolInfo.full_name, {
        ...bars[bars.length - 1],
    });
}
console.log(`[getBars]: returned ${bars.length} bar(s)`);
// ...

Add getNextDailyBarTime function to streaming.js.

/chart‑project/src/streaming.js
function getNextDailyBarTime(barTime) {
    const date = new Date(barTime * 1000);
    date.setDate(date.getDate() + 1);
    return date.getTime() / 1000;
}

CryptoCompare API provides a streaming of ticks, not bars. So, you need to check that the new trade is related to the new daily bar.

Note that you might need a more comprehensive check for the production version.

Adjust the socket.on listener in streaming.js.

socket.on('m', data => {
    //...
    const lastDailyBar = subscriptionItem.lastDailyBar;
    const nextDailyBarTime = getNextDailyBarTime(lastDailyBar.time);

    let bar;
    if (tradeTime >= nextDailyBarTime) {
        bar = {
            time: nextDailyBarTime,
            open: tradePrice,
            high: tradePrice,
            low: tradePrice,
            close: tradePrice,
        };
        console.log('[socket] Generate new bar', bar);
    } else {
        bar = {
            ...lastDailyBar,
            high: Math.max(lastDailyBar.high, tradePrice),
            low: Math.min(lastDailyBar.low, tradePrice),
            close: tradePrice,
        };
        console.log('[socket] Update the latest bar by price', tradePrice);
    }
    subscriptionItem.lastDailyBar = bar;
    //...
});