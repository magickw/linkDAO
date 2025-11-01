/**
 * Mock IndexedDB for Testing
 * Provides comprehensive mock implementation of IndexedDB API
 */

// Mock IDBRequest
class MockIDBRequest<T = any> implements IDBRequest<T> {
  result: T = null as any;
  error: DOMException | null = null;
  source: IDBObjectStore | IDBIndex | IDBCursor | null = null;
  transaction: IDBTransaction | null = null;
  readyState: IDBRequestReadyState = 'pending';
  
  onsuccess: ((this: IDBRequest<T>, ev: Event) => any) | null = null;
  onerror: ((this: IDBRequest<T>, ev: Event) => any) | null = null;
  
  addEventListener(type: string, listener: EventListener): void {
    if (type === 'success') {
      this.onsuccess = listener as any;
    } else if (type === 'error') {
      this.onerror = listener as any;
    }
  }
  
  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'success') {
      this.onsuccess = null;
    } else if (type === 'error') {
      this.onerror = null;
    }
  }
  
  dispatchEvent(event: Event): boolean {
    return true;
  }
  
  // Helper methods for testing
  _triggerSuccess(result: T): void {
    this.result = result;
    this.readyState = 'done';
    if (this.onsuccess) {
      this.onsuccess.call(this, new Event('success'));
    }
  }
  
  _triggerError(error: DOMException): void {
    this.error = error;
    this.readyState = 'done';
    if (this.onerror) {
      this.onerror.call(this, new Event('error'));
    }
  }
}

// Mock IDBObjectStore
class MockIDBObjectStore implements IDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  indexNames: DOMStringList;
  transaction: IDBTransaction;
  autoIncrement: boolean;
  
  private data = new Map<any, any>();
  private indexes = new Map<string, MockIDBIndex>();
  
  constructor(name: string, options: { keyPath?: string | string[] | null; autoIncrement?: boolean } = {}) {
    this.name = name;
    this.keyPath = options.keyPath || null;
    this.autoIncrement = options.autoIncrement || false;
    this.indexNames = [] as any;
    this.transaction = null as any;
  }
  
  add(value: any, key?: any): IDBRequest<IDBValidKey> {
    const request = new MockIDBRequest<IDBValidKey>();
    
    setTimeout(() => {
      try {
        const storeKey = key || this._extractKey(value);
        
        if (this.data.has(storeKey)) {
          request._triggerError(new DOMException('Key already exists', 'ConstraintError'));
        } else {
          this.data.set(storeKey, value);
          this._updateIndexes(storeKey, value);
          request._triggerSuccess(storeKey);
        }
      } catch (error) {
        request._triggerError(error as DOMException);
      }
    }, 0);
    
    return request;
  }
  
  put(value: any, key?: any): IDBRequest<IDBValidKey> {
    const request = new MockIDBRequest<IDBValidKey>();
    
    setTimeout(() => {
      try {
        const storeKey = key || this._extractKey(value);
        this.data.set(storeKey, value);
        this._updateIndexes(storeKey, value);
        request._triggerSuccess(storeKey);
      } catch (error) {
        request._triggerError(error as DOMException);
      }
    }, 0);
    
    return request;
  }
  
  get(key: any): IDBRequest<any> {
    const request = new MockIDBRequest<any>();
    
    setTimeout(() => {
      const value = this.data.get(key);
      request._triggerSuccess(value);
    }, 0);
    
    return request;
  }
  
  getAll(query?: any, count?: number): IDBRequest<any[]> {
    const request = new MockIDBRequest<any[]>();
    
    setTimeout(() => {
      let values = Array.from(this.data.values());
      
      if (count !== undefined) {
        values = values.slice(0, count);
      }
      
      request._triggerSuccess(values);
    }, 0);
    
    return request;
  }
  
  getAllKeys(query?: any, count?: number): IDBRequest<IDBValidKey[]> {
    const request = new MockIDBRequest<IDBValidKey[]>();
    
    setTimeout(() => {
      let keys = Array.from(this.data.keys());
      
      if (count !== undefined) {
        keys = keys.slice(0, count);
      }
      
      request._triggerSuccess(keys);
    }, 0);
    
    return request;
  }
  
  delete(key: any): IDBRequest<undefined> {
    const request = new MockIDBRequest<undefined>();
    
    setTimeout(() => {
      this.data.delete(key);
      request._triggerSuccess(undefined);
    }, 0);
    
    return request;
  }
  
  clear(): IDBRequest<undefined> {
    const request = new MockIDBRequest<undefined>();
    
    setTimeout(() => {
      this.data.clear();
      this.indexes.forEach(index => index._clear());
      request._triggerSuccess(undefined);
    }, 0);
    
    return request;
  }
  
  count(key?: any): IDBRequest<number> {
    const request = new MockIDBRequest<number>();
    
    setTimeout(() => {
      request._triggerSuccess(this.data.size);
    }, 0);
    
    return request;
  }
  
  openCursor(range?: any, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue | null> {
    const request = new MockIDBRequest<IDBCursorWithValue | null>();
    
    setTimeout(() => {
      // Simple cursor implementation
      const entries = Array.from(this.data.entries());
      if (entries.length > 0) {
        const [key, value] = entries[0];
        const cursor = new MockIDBCursorWithValue(key, value, this);
        request._triggerSuccess(cursor as any);
      } else {
        request._triggerSuccess(null);
      }
    }, 0);
    
    return request;
  }
  
  openKeyCursor(range?: any, direction?: IDBCursorDirection): IDBRequest<IDBCursor | null> {
    const request = new MockIDBRequest<IDBCursor | null>();
    
    setTimeout(() => {
      const keys = Array.from(this.data.keys());
      if (keys.length > 0) {
        const cursor = new MockIDBCursor(keys[0], this);
        request._triggerSuccess(cursor as any);
      } else {
        request._triggerSuccess(null);
      }
    }, 0);
    
    return request;
  }
  
  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): IDBIndex {
    const index = new MockIDBIndex(name, keyPath, this, options);
    this.indexes.set(name, index);
    return index as any;
  }
  
  deleteIndex(name: string): void {
    this.indexes.delete(name);
  }
  
  index(name: string): IDBIndex {
    const index = this.indexes.get(name);
    if (!index) {
      throw new DOMException(`Index '${name}' does not exist`, 'NotFoundError');
    }
    return index as any;
  }
  
  private _extractKey(value: any): any {
    if (this.keyPath) {
      if (typeof this.keyPath === 'string') {
        return value[this.keyPath];
      } else if (Array.isArray(this.keyPath)) {
        return this.keyPath.map(path => value[path]);
      }
    }
    return Math.random(); // Auto-generated key
  }
  
  private _updateIndexes(key: any, value: any): void {
    this.indexes.forEach(index => {
      index._updateEntry(key, value);
    });
  }
  
  // Helper methods for testing
  _getData(): Map<any, any> {
    return this.data;
  }
  
  _setData(data: Map<any, any>): void {
    this.data = data;
  }
}

// Mock IDBIndex
class MockIDBIndex implements IDBIndex {
  name: string;
  objectStore: IDBObjectStore;
  keyPath: string | string[];
  multiEntry: boolean;
  unique: boolean;
  
  private indexData = new Map<any, Set<any>>();
  
  constructor(
    name: string,
    keyPath: string | string[],
    objectStore: IDBObjectStore,
    options: IDBIndexParameters = {}
  ) {
    this.name = name;
    this.keyPath = keyPath;
    this.objectStore = objectStore;
    this.multiEntry = options.multiEntry || false;
    this.unique = options.unique || false;
  }
  
  get(key: any): IDBRequest<any> {
    const request = new MockIDBRequest<any>();
    
    setTimeout(() => {
      const keys = this.indexData.get(key);
      if (keys && keys.size > 0) {
        const firstKey = Array.from(keys)[0];
        const value = (this.objectStore as MockIDBObjectStore)._getData().get(firstKey);
        request._triggerSuccess(value);
      } else {
        request._triggerSuccess(undefined);
      }
    }, 0);
    
    return request;
  }
  
  getAll(query?: any, count?: number): IDBRequest<any[]> {
    const request = new MockIDBRequest<any[]>();
    
    setTimeout(() => {
      const allValues: any[] = [];
      this.indexData.forEach((keys) => {
        keys.forEach(key => {
          const value = (this.objectStore as MockIDBObjectStore)._getData().get(key);
          if (value) {
            allValues.push(value);
          }
        });
      });
      
      const result = count !== undefined ? allValues.slice(0, count) : allValues;
      request._triggerSuccess(result);
    }, 0);
    
    return request;
  }
  
  getAllKeys(query?: any, count?: number): IDBRequest<IDBValidKey[]> {
    const request = new MockIDBRequest<IDBValidKey[]>();
    
    setTimeout(() => {
      const allKeys: any[] = [];
      this.indexData.forEach((keys) => {
        allKeys.push(...Array.from(keys));
      });
      
      const result = count !== undefined ? allKeys.slice(0, count) : allKeys;
      request._triggerSuccess(result);
    }, 0);
    
    return request;
  }
  
  getKey(key: any): IDBRequest<IDBValidKey | undefined> {
    const request = new MockIDBRequest<IDBValidKey | undefined>();
    
    setTimeout(() => {
      const keys = this.indexData.get(key);
      const result = keys && keys.size > 0 ? Array.from(keys)[0] : undefined;
      request._triggerSuccess(result);
    }, 0);
    
    return request;
  }
  
  count(key?: any): IDBRequest<number> {
    const request = new MockIDBRequest<number>();
    
    setTimeout(() => {
      if (key !== undefined) {
        const keys = this.indexData.get(key);
        request._triggerSuccess(keys ? keys.size : 0);
      } else {
        let total = 0;
        this.indexData.forEach(keys => total += keys.size);
        request._triggerSuccess(total);
      }
    }, 0);
    
    return request;
  }
  
  openCursor(range?: any, direction?: IDBCursorDirection): IDBRequest<IDBCursorWithValue | null> {
    const request = new MockIDBRequest<IDBCursorWithValue | null>();
    
    setTimeout(() => {
      // Simple implementation
      request._triggerSuccess(null);
    }, 0);
    
    return request;
  }
  
  openKeyCursor(range?: any, direction?: IDBCursorDirection): IDBRequest<IDBCursor | null> {
    const request = new MockIDBRequest<IDBCursor | null>();
    
    setTimeout(() => {
      // Simple implementation
      request._triggerSuccess(null);
    }, 0);
    
    return request;
  }
  
  // Helper methods
  _updateEntry(objectKey: any, value: any): void {
    const indexKey = this._extractIndexKey(value);
    if (indexKey !== undefined) {
      if (!this.indexData.has(indexKey)) {
        this.indexData.set(indexKey, new Set());
      }
      this.indexData.get(indexKey)!.add(objectKey);
    }
  }
  
  _clear(): void {
    this.indexData.clear();
  }
  
  private _extractIndexKey(value: any): any {
    if (typeof this.keyPath === 'string') {
      return value[this.keyPath];
    } else if (Array.isArray(this.keyPath)) {
      return this.keyPath.map(path => value[path]);
    }
    return undefined;
  }
}

// Mock IDBCursor
class MockIDBCursor implements IDBCursor {
  source: IDBObjectStore | IDBIndex;
  direction: IDBCursorDirection = 'next';
  key: IDBValidKey;
  primaryKey: IDBValidKey;
  request: IDBRequest;
  
  constructor(key: IDBValidKey, source: IDBObjectStore | IDBIndex) {
    this.key = key;
    this.primaryKey = key;
    this.source = source;
    this.request = null as any;
  }
  
  advance(count: number): void {
    // Simple implementation
  }
  
  continue(key?: IDBValidKey): void {
    // Simple implementation
  }
  
  continuePrimaryKey(key: IDBValidKey, primaryKey: IDBValidKey): void {
    // Simple implementation
  }
  
  delete(): IDBRequest<undefined> {
    return new MockIDBRequest<undefined>();
  }
  
  update(value: any): IDBRequest<IDBValidKey> {
    return new MockIDBRequest<IDBValidKey>();
  }
}

// Mock IDBCursorWithValue
class MockIDBCursorWithValue extends MockIDBCursor implements IDBCursorWithValue {
  value: any;
  
  constructor(key: IDBValidKey, value: any, source: IDBObjectStore | IDBIndex) {
    super(key, source);
    this.value = value;
  }
}

// Mock IDBTransaction
class MockIDBTransaction implements IDBTransaction {
  db: IDBDatabase;
  durability: IDBTransactionDurability = 'default';
  error: DOMException | null = null;
  mode: IDBTransactionMode;
  objectStoreNames: DOMStringList;
  
  onabort: ((this: IDBTransaction, ev: Event) => any) | null = null;
  oncomplete: ((this: IDBTransaction, ev: Event) => any) | null = null;
  onerror: ((this: IDBTransaction, ev: Event) => any) | null = null;
  
  private stores = new Map<string, MockIDBObjectStore>();
  
  constructor(db: IDBDatabase, storeNames: string[], mode: IDBTransactionMode) {
    this.db = db;
    this.mode = mode;
    this.objectStoreNames = storeNames as any;
  }
  
  abort(): void {
    if (this.onabort) {
      this.onabort.call(this, new Event('abort'));
    }
  }
  
  commit(): void {
    if (this.oncomplete) {
      this.oncomplete.call(this, new Event('complete'));
    }
  }
  
  objectStore(name: string): IDBObjectStore {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MockIDBObjectStore(name));
    }
    return this.stores.get(name)! as any;
  }
  
  addEventListener(type: string, listener: EventListener): void {
    if (type === 'abort') {
      this.onabort = listener as any;
    } else if (type === 'complete') {
      this.oncomplete = listener as any;
    } else if (type === 'error') {
      this.onerror = listener as any;
    }
  }
  
  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'abort') {
      this.onabort = null;
    } else if (type === 'complete') {
      this.oncomplete = null;
    } else if (type === 'error') {
      this.onerror = null;
    }
  }
  
  dispatchEvent(event: Event): boolean {
    return true;
  }
}

// Mock IDBDatabase
class MockIDBDatabase implements IDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;
  
  onabort: ((this: IDBDatabase, ev: Event) => any) | null = null;
  onclose: ((this: IDBDatabase, ev: Event) => any) | null = null;
  onerror: ((this: IDBDatabase, ev: Event) => any) | null = null;
  onversionchange: ((this: IDBDatabase, ev: IDBVersionChangeEvent) => any) | null = null;
  
  private stores = new Map<string, MockIDBObjectStore>();
  
  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    this.objectStoreNames = [] as any;
  }
  
  close(): void {
    if (this.onclose) {
      this.onclose.call(this, new Event('close'));
    }
  }
  
  createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore {
    const store = new MockIDBObjectStore(name, options);
    this.stores.set(name, store);
    return store as any;
  }
  
  deleteObjectStore(name: string): void {
    this.stores.delete(name);
  }
  
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = new MockIDBTransaction(this, names, mode || 'readonly');
    
    // Set up stores in transaction
    names.forEach(name => {
      if (this.stores.has(name)) {
        const store = this.stores.get(name)!;
        store.transaction = transaction;
      }
    });
    
    return transaction as any;
  }
  
  addEventListener(type: string, listener: EventListener): void {
    // Implementation for event listeners
  }
  
  removeEventListener(type: string, listener: EventListener): void {
    // Implementation for event listeners
  }
  
  dispatchEvent(event: Event): boolean {
    return true;
  }
  
  // Helper methods for testing
  _getStore(name: string): MockIDBObjectStore | undefined {
    return this.stores.get(name);
  }
  
  _hasStore(name: string): boolean {
    return this.stores.has(name);
  }
}

// Mock IDBFactory
class MockIDBFactory implements IDBFactory {
  open(name: string, version?: number): IDBOpenDBRequest {
    const request = new MockIDBRequest<IDBDatabase>() as any;
    
    setTimeout(() => {
      const db = new MockIDBDatabase(name, version || 1);
      
      // Trigger onupgradeneeded if needed
      if (request.onupgradeneeded) {
        const event = new Event('upgradeneeded') as any;
        event.target = request;
        event.oldVersion = 0;
        event.newVersion = version || 1;
        request.result = db;
        request.onupgradeneeded.call(request, event);
      }
      
      request._triggerSuccess(db as any);
    }, 0);
    
    return request;
  }
  
  deleteDatabase(name: string): IDBOpenDBRequest {
    const request = new MockIDBRequest<undefined>() as any;
    
    setTimeout(() => {
      request._triggerSuccess(undefined);
    }, 0);
    
    return request;
  }
  
  databases(): Promise<IDBDatabaseInfo[]> {
    return Promise.resolve([]);
  }
  
  cmp(first: any, second: any): number {
    if (first < second) return -1;
    if (first > second) return 1;
    return 0;
  }
}

// Set up global IndexedDB mock
const mockIndexedDB = new MockIDBFactory();

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Also set up IDBKeyRange if needed
if (typeof global.IDBKeyRange === 'undefined') {
  global.IDBKeyRange = {
    bound: (lower: any, upper: any, lowerOpen?: boolean, upperOpen?: boolean) => ({
      lower, upper, lowerOpen: !!lowerOpen, upperOpen: !!upperOpen
    }),
    only: (value: any) => ({ lower: value, upper: value, lowerOpen: false, upperOpen: false }),
    lowerBound: (bound: any, open?: boolean) => ({ lower: bound, lowerOpen: !!open }),
    upperBound: (bound: any, open?: boolean) => ({ upper: bound, upperOpen: !!open })
  } as any;
}

// Export mocks for direct access in tests
export {
  MockIDBRequest,
  MockIDBObjectStore,
  MockIDBIndex,
  MockIDBTransaction,
  MockIDBDatabase,
  MockIDBFactory,
  mockIndexedDB
};