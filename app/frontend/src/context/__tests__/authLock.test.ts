import {
  isHardwareConnector,
  getAuthLockTimeout,
  acquireAuthLock,
  releaseAuthLock,
  isAuthLocked,
  EFFECTIVE_HARDWARE_LOCK_TIMEOUT_MS,
  EFFECTIVE_SOFTWARE_LOCK_TIMEOUT_MS
} from '../AuthContext';

describe('Auth lock helpers', () => {
  afterEach(() => {
    // Ensure lock is released between tests
    try {
      releaseAuthLock();
    } catch (e) {
      // ignore
    }
  });

  test('isHardwareConnector detects known hardware connectors', () => {
    expect(isHardwareConnector({ id: 'ledger' })).toBe(true);
    expect(isHardwareConnector({ name: 'Ledger Live' })).toBe(true);
    expect(isHardwareConnector({ id: 'trezor-1' })).toBe(true);
    expect(isHardwareConnector({ name: 'MetaMask' })).toBe(false);
    expect(isHardwareConnector(undefined)).toBe(false);
  });

  test('getAuthLockTimeout returns hardware timeout for hardware connectors', () => {
    const hwTimeout = getAuthLockTimeout({ id: 'ledger' });
    const swTimeout = getAuthLockTimeout({ id: 'metamask' });

    expect(hwTimeout).toBe(EFFECTIVE_HARDWARE_LOCK_TIMEOUT_MS);
    expect(swTimeout).toBe(EFFECTIVE_SOFTWARE_LOCK_TIMEOUT_MS);
  });

  test('acquireAuthLock enforces single lock', () => {
    // Ensure clean state
    releaseAuthLock();

    const first = acquireAuthLock();
    expect(first).toBe(true);
    expect(isAuthLocked()).toBe(true);

    const second = acquireAuthLock();
    expect(second).toBe(false);

    // Release and ensure we can acquire again
    releaseAuthLock();
    expect(isAuthLocked()).toBe(false);

    const third = acquireAuthLock({ id: 'ledger' });
    expect(third).toBe(true);
    expect(isAuthLocked()).toBe(true);

    releaseAuthLock();
  });
});
