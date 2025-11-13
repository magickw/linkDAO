/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./public/sw-simple.js":
/*!*****************************!*\
  !*** ./public/sw-simple.js ***!
  \*****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval(__webpack_require__.ts("importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');\nif (workbox) {\n  workbox.precaching.precacheAndRoute([{'revision':'e7e6cbe757f52bf9c942dc446919e49a','url':'/_next/fallback-build-manifest.json'},{'revision':'6e0c9998451d6568eefc94afe4c914eb','url':'/_next/react-loadable-manifest.json'},{'revision':'1058c35b6aa774f7b527a938cedcc4e9','url':'/_next/server/middleware-build-manifest.js'},{'revision':'e250d9bdb5c0918941a067b953219a91','url':'/_next/server/middleware-react-loadable-manifest.js'},{'revision':'f7097bf7c93c1cbb4c118491ca6d2b04','url':'/_next/server/next-font-manifest.js'},{'revision':'d51420cd4aa5d37d6719849cf36d0d6f','url':'/_next/server/next-font-manifest.json'},{'revision':'d936ce502768985fb59cb432ebbafc6b','url':'/_next/static/chunks/fallback/_pages-dir-browser_node_modules_next_dist_pages__app_js.js'},{'revision':'3bb184a1ddbdfd98c86fa62f55127b22','url':'/_next/static/chunks/fallback/_pages-dir-browser_node_modules_next_dist_pages__error_js.js'},{'revision':'dbccd0528130d0adb13c4beb340d2bdc','url':'/_next/static/chunks/fallback/amp.js'},{'revision':'8808a5a57b2486c11c708205cf97b411','url':'/_next/static/chunks/fallback/pages/_app.js'},{'revision':'493a6d0797adc48afdb2d186f0936b5f','url':'/_next/static/chunks/fallback/pages/_error.js'},{'revision':'7f2540bea49362c08c9bc706d8587401','url':'/_next/static/chunks/fallback/react-refresh.js'},{'revision':'c475f3780e602235b08a104fc2c80895','url':'/_next/static/chunks/fallback/webpack.js'},{'revision':'846118c33b2c0e922d7b3a7676f81f6f','url':'/_next/static/chunks/polyfills.js'}] || []);\n}\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wdWJsaWMvc3ctc2ltcGxlLmpzIiwibWFwcGluZ3MiOiJBQUFBQSxhQUFhLENBQUMseUVBQXlFLENBQUM7QUFFeEYsSUFBSUMsT0FBTyxFQUFFO0VBQ1hBLE9BQU8sQ0FBQ0MsVUFBVSxDQUFDQyxnQkFBZ0IsQ0FBQ0MsSUFBSSxDQUFDQyxhQUFhLElBQUksRUFBRSxDQUFDO0FBQy9EIiwic291cmNlcyI6WyIvVXNlcnMvYmZndW8vRHJvcGJveC9NYWMvRG9jdW1lbnRzL0xpbmtEQU8vYXBwL2Zyb250ZW5kL3B1YmxpYy9zdy1zaW1wbGUuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0U2NyaXB0cygnaHR0cHM6Ly9zdG9yYWdlLmdvb2dsZWFwaXMuY29tL3dvcmtib3gtY2RuL3JlbGVhc2VzLzcuMC4wL3dvcmtib3gtc3cuanMnKTtcblxuaWYgKHdvcmtib3gpIHtcbiAgd29ya2JveC5wcmVjYWNoaW5nLnByZWNhY2hlQW5kUm91dGUoc2VsZi5fX1dCX01BTklGRVNUIHx8IFtdKTtcbn0iXSwibmFtZXMiOlsiaW1wb3J0U2NyaXB0cyIsIndvcmtib3giLCJwcmVjYWNoaW5nIiwicHJlY2FjaGVBbmRSb3V0ZSIsInNlbGYiLCJfX1dCX01BTklGRVNUIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./public/sw-simple.js\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./public/sw-simple.js");
/******/ 	
/******/ })()
;