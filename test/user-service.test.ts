import { UserService } from '../src/common/services/user-service';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('UserService', () => {
  let userService: UserService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock DynamoDBDocumentClient
    mockSend = jest.fn();
    const mockDocClient = {
      send: mockSend
    };
    
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDocClient);
    
    // Set environment variables
    process.env.USER_TABLE_NAME = 'test-user-table';
    
    userService = new UserService();
  });

  describe('getUser', () => {
    it('should return user when exists', async () => {
      const mockUser = {
        userId: 'test-user-id',
        userName: 'Test User',
        familyId: 'test-family-id',
        email: 'test@example.com'
      };

      mockSend.mockResolvedValueOnce({
        Item: mockUser
      });

      const result = await userService.getUser('test-user-id');

      expect(result).toEqual(mockUser);
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(GetCommand)
      );
    });

    it('should return null when user does not exist', async () => {
      mockSend.mockResolvedValueOnce({
        Item: undefined
      });

      const result = await userService.getUser('non-existent-user');

      expect(result).toBeFalsy();
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user', async () => {
      const existingUser = {
        userId: 'test-user-id',
        userName: 'Existing User',
        familyId: 'test-family-id',
        email: 'existing@example.com'
      };

      mockSend.mockResolvedValueOnce({
        Item: existingUser
      });

      const result = await userService.getOrCreateUser('test-user-id', 'New Name', 'new@example.com');

      expect(result).toEqual(existingUser);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should create new user when not exists', async () => {
      // First call returns no user
      mockSend.mockResolvedValueOnce({
        Item: undefined
      });

      // Second call is the PutCommand
      mockSend.mockResolvedValueOnce({});

      const result = await userService.getOrCreateUser('new-user-id', 'New User', 'new@example.com');

      expect(result).toMatchObject({
        userId: 'new-user-id',
        userName: 'New User',
        familyId: 'new-user-id', // Same as userId for new users
        email: 'new@example.com'
      });
      
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateUserFamily', () => {
    it('should update user family ID', async () => {
      mockSend.mockResolvedValueOnce({});

      await userService.updateUserFamily('test-user-id', 'new-family-id');

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(UpdateCommand)
      );
    });
  });

  describe('updateUserName', () => {
    it('should update user name', async () => {
      mockSend.mockResolvedValueOnce({});

      await userService.updateUserName('test-user-id', 'Updated Name');

      expect(mockSend).toHaveBeenCalledWith(
        expect.any(UpdateCommand)
      );
    });
  });

  describe('getFamilyMembers', () => {
    it('should return family members', async () => {
      const familyMembers = [
        {
          userId: 'user1',
          userName: 'User 1',
          familyId: 'family-id'
        },
        {
          userId: 'user2',
          userName: 'User 2',
          familyId: 'family-id'
        }
      ];

      mockSend.mockResolvedValueOnce({
        Items: familyMembers
      });

      const result = await userService.getFamilyMembers('family-id');

      expect(result).toEqual(familyMembers);
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(ScanCommand)
      );
    });

    it('should return empty array when no family members', async () => {
      mockSend.mockResolvedValueOnce({
        Items: []
      });

      const result = await userService.getFamilyMembers('family-id');

      expect(result).toEqual([]);
    });
  });
});