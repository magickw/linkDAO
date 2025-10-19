// Ambient declarations for TypeChain "../common" imports used by generated types
// These are permissive placeholders so the frontend build can typecheck.

export type PromiseOrValue<T> = T | Promise<T>;
export type TypedEventFilter<T = any> = any;
export type TypedEvent<TArgs extends any[] = any, TReturn = any> = any;
export type TypedListener<TEvent = any> = (...args: any[]) => void;
export type OnEvent<TContract = any> = (event: any, listener: TypedListener) => TContract;
export type Listener = (...args: any[]) => void;

export {};
