import { RateLimiter, rateLimiter } from './rateLimiter';

describe('RateLimiter', () => {
    beforeEach(() => {
        // Clear state before each test
        rateLimiter.resetAllStates();
        localStorage.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should allow initial attempts', () => {
        const result = rateLimiter.isAllowed('test-user', 'password');
        expect(result.allowed).toBe(true);
        expect(result.remainingAttempts).toBe(5); // Default password limit
    });

    it('should block after max attempts', () => {
        const identifier = 'bad-actor';
        const type = 'password'; // max 5

        // Fail 5 times
        for (let i = 0; i < 5; i++) {
            rateLimiter.recordAttempt(identifier, type, false);
        }

        const result = rateLimiter.isAllowed(identifier, type);
        expect(result.allowed).toBe(false);
        expect(result.blockedUntil).toBeDefined();
    });

    it('should reset on success', () => {
        const identifier = 'user';
        const type = 'password';

        rateLimiter.recordAttempt(identifier, type, false);
        rateLimiter.recordAttempt(identifier, type, false);

        let result = rateLimiter.isAllowed(identifier, type);
        expect(result.remainingAttempts).toBe(3);

        // Success attempt
        rateLimiter.recordAttempt(identifier, type, true);

        result = rateLimiter.isAllowed(identifier, type);
        expect(result.allowed).toBe(true);
        expect(result.remainingAttempts).toBe(5);
    });

    it('should unblock after time passes', () => {
        const identifier = 'temp-blocked';
        const type = 'password'; // 30 min block

        // Trigger block
        for (let i = 0; i < 5; i++) {
            rateLimiter.recordAttempt(identifier, type, false);
        }

        expect(rateLimiter.isAllowed(identifier, type).allowed).toBe(false);

        // Advance time by 31 minutes
        jest.advanceTimersByTime(31 * 60 * 1000);

        expect(rateLimiter.isAllowed(identifier, type).allowed).toBe(true);
    });

    it('should use correct config for "password" type', () => {
        const config = rateLimiter.getConfig('password');
        expect(config).toBeDefined();
        expect(config?.maxAttempts).toBe(5);
    });
});
