module.exports = 'test-file-stub';

// Add a simple test to make this a valid test file
describe('File Mock', () => {
  test('should export a string', () => {
    expect(module.exports).toBe('test-file-stub');
  });
});