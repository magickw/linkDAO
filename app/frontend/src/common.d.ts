// Ambient declarations for TypeChain imports to ../../common used by generated files
// Provide permissive types to satisfy the compiler during frontend builds.

export type PromiseOrValue<T> = T | Promise<T>;
export type TypedEventFilter<T = any> = any;
export type TypedEvent<TArgs extends any[] = any, TReturn = any> = any;
export type TypedListener<TEvent = any> = (...args: any[]) => void;
export type OnEvent<TContract = any> = (event: any, listener: TypedListener) => TContract;
export type Listener = (...args: any[]) => void;

export {};
