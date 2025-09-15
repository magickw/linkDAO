import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Early Extension Error Suppression Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress extension errors as early as possible
              (function() {
                // Common extension error patterns
                const extensionErrorPatterns = [
                  'chrome.runtime.sendMessage',
                  'Extension ID',
                  'chrome-extension://',
                  'inpage.js',
                  'content_script',
                  'injected.js',
                  'provider.js',
                  'metamask',
                  'wallet_',
                  'web3-provider',
                  'ethereum.request',
                  'window.ethereum',
                  'Non-Error promise rejection captured',
                  'Script error',
                  'TypeError: Error in invocation of runtime.sendMessage',
                  'runtime.sendMessage(optional string extensionId',
                  'must specify an Extension ID (string) for its first argument',
                  'coinbase wallet',
                  'walletlink',
                  'trust wallet',
                  'phantom',
                  'solflare',
                  'extension context invalidated',
                  'extension:///',
                  'moz-extension://',
                  'safari-extension://'
                ];
                
                function isExtensionError(message, source, stack) {
                  const textToCheck = (message + ' ' + (source || '') + ' ' + (stack || '')).toLowerCase();
                  return extensionErrorPatterns.some(pattern => 
                    textToCheck.includes(pattern.toLowerCase())
                  );
                }
                
                // Global error handler
                window.addEventListener('error', function(event) {
                  if (isExtensionError(event.message, event.filename, event.error?.stack)) {
                    console.debug('Early suppression: Extension error caught and suppressed:', event.message);
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                  }
                }, true);
                
                // Global promise rejection handler
                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason || '';
                  const message = typeof reason === 'string' ? reason : (reason?.message || reason?.toString() || '');
                  
                  if (isExtensionError(message, '', reason?.stack)) {
                    console.debug('Early suppression: Extension promise rejection caught and suppressed:', message);
                    event.preventDefault();
                    return false;
                  }
                }, true);
                
                // Override console.error to catch and suppress extension errors
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (isExtensionError(message, '', '')) {
                    console.debug('Early suppression: Extension console.error suppressed:', message);
                    return;
                  }
                  originalConsoleError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}