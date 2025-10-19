/* Minimal shim for TypeChain generated type imports used across the project.
   This provides lightweight definitions so the frontend TypeScript build can proceed.
   These are intentionally permissive to avoid tightly coupling to specific generated shapes.
*/

/* Minimal common types for TypeChain-generated files used by the frontend.
   These are permissive placeholders so the frontend build can typecheck
   without depending on the exact generated helpers. */

export type PromiseOrValue<T> = T | Promise<T>;

export type TypedEventFilter<T = any> = any;
export type TypedEvent<TArgs extends any[] = any, TReturn = any> = any;
export type TypedListener<TEvent = any> = (...args: any[]) => void;

// OnEvent is used as an overloaded function type in generated contracts; a permissive
// function signature is sufficient for the frontend compile-time checks.
export type OnEvent<TContract = any> = (event: any, listener: TypedListener) => TContract;

export type Listener = (...args: any[]) => void;

export {};
