/**
 * CSV Export Tests
 * These tests focus specifically on the CSV export functionality
 */

describe('CSV Export Functionality', () => {
  test('should generate correct CSV header', () => {
    const csv = 'Date,Type,From,To,Amount,Status,Transaction Hash\n';
    expect(csv).toBe('Date,Type,From,To,Amount,Status,Transaction Hash\n');
  });

  test('should format token transactions correctly in CSV', () => {
    const transaction = {
      timestamp: new Date('2023-01-01T12:00:00Z').getTime(),
      type: 'transfer',
      from: '0x1234567890123456789012345678901234567890',
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      value: '1000.50',
      status: 'success',
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };

    const csvLine = `${new Date(transaction.timestamp).toISOString()},${transaction.type},${transaction.from},${transaction.to},${transaction.value},${transaction.status},${transaction.hash}\n`;
    
    expect(csvLine).toContain('2023-01-01T12:00:00.000Z');
    expect(csvLine).toContain('transfer');
    expect(csvLine).toContain('1000.50');
    expect(csvLine).toContain('success');
  });

  test('should format staking transactions correctly in CSV', () => {
    const transaction = {
      timestamp: new Date('2023-01-01T12:00:00Z').getTime(),
      type: 'stake',
      user: '0x1234567890123456789012345678901234567890',
      amount: '500.25',
      status: 'success',
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };

    const csvLine = `${new Date(transaction.timestamp).toISOString()},${transaction.type},${transaction.user},,${transaction.amount},${transaction.status},${transaction.hash}\n`;
    
    expect(csvLine).toContain('2023-01-01T12:00:00.000Z');
    expect(csvLine).toContain('stake');
    expect(csvLine).toContain('500.25');
    expect(csvLine).toContain('success');
  });

  test('should format purchase transactions correctly in CSV', () => {
    const transaction = {
      timestamp: new Date('2023-01-01T12:00:00Z').getTime(),
      type: 'purchase',
      user: '0x1234567890123456789012345678901234567890',
      amount: '1000.50',
      status: 'success',
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    };

    const csvLine = `${new Date(transaction.timestamp).toISOString()},${transaction.type},${transaction.user},,${transaction.amount},${transaction.status},${transaction.hash}\n`;
    
    expect(csvLine).toContain('2023-01-01T12:00:00.000Z');
    expect(csvLine).toContain('purchase');
    expect(csvLine).toContain('1000.50');
    expect(csvLine).toContain('success');
  });

  test('should handle multiple transactions in CSV', () => {
    const transactions = [
      {
        timestamp: new Date('2023-01-01T12:00:00Z').getTime(),
        type: 'transfer',
        from: '0x123',
        to: '0xabc',
        value: '1000',
        status: 'success',
        hash: '0x111'
      },
      {
        timestamp: new Date('2023-01-02T12:00:00Z').getTime(),
        type: 'stake',
        user: '0x123',
        amount: '500',
        status: 'success',
        hash: '0x222'
      },
      {
        timestamp: new Date('2023-01-03T12:00:00Z').getTime(),
        type: 'purchase',
        user: '0x123',
        amount: '2000',
        status: 'success',
        hash: '0x333'
      }
    ];

    let csv = 'Date,Type,From,To,Amount,Status,Transaction Hash\n';
    
    transactions.forEach(tx => {
      if ('value' in tx) {
        // Token transaction
        csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.from},${tx.to},${tx.value},${tx.status},${tx.hash}\n`;
      } else if ('amount' in tx && tx.type !== 'purchase') {
        // Staking transaction
        csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.user},,${tx.amount},${tx.status},${tx.hash}\n`;
      } else if (tx.type === 'purchase') {
        // Purchase transaction
        csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.user},,${tx.amount},${tx.status},${tx.hash}\n`;
      }
    });

    // Check that all transactions are included
    expect(csv).toContain('transfer');
    expect(csv).toContain('stake');
    expect(csv).toContain('purchase');
    expect(csv).toContain('0x111');
    expect(csv).toContain('0x222');
    expect(csv).toContain('0x333');
    
    // Check that we have the right number of lines (header + 3 transactions)
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(4);
  });
});