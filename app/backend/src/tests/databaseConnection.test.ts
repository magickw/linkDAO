import { DatabaseService } from '../services/databaseService';

describe('Database Connection', () => {
  let databaseService: DatabaseService;

  beforeAll(() => {
    databaseService = new DatabaseService();
  });

  it('should connect to the database and create a user', async () => {
    const user = await databaseService.createUser(
      '0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e',
      'testuser',
      'QmTestProfileCid'
    );
    
    expect(user).toBeDefined();
    expect(user.address).toBe('0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e');
    expect(user.handle).toBe('testuser');
  });

  it('should retrieve a user by address', async () => {
    const user = await databaseService.getUserByAddress('0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e');
    
    expect(user).toBeDefined();
    expect(user?.address).toBe('0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e');
  });
});