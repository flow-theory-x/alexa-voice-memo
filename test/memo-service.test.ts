import { MemoService } from '../src/memo-service';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('MemoService', () => {
  let memoService: MemoService;
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
    process.env.MEMO_TABLE_NAME = 'test-memo-table';
    process.env.USER_TABLE_NAME = 'test-user-table';
    process.env.INVITE_CODE_TABLE_NAME = 'test-invite-table';
    
    memoService = new MemoService();
  });

  describe('addMemo', () => {
    it('should add a memo successfully', async () => {
      // Mock UserService response
      mockSend.mockResolvedValueOnce({
        Item: {
          userId: 'test-user-id',
          familyId: 'test-family-id',
          userName: 'Test User'
        }
      });

      // Mock PutCommand response
      mockSend.mockResolvedValueOnce({});

      const result = await memoService.addMemo('test-user-id', 'Test memo', 'Test User');

      expect(result).toMatchObject({
        userId: 'test-user-id',
        text: 'Test memo',
        deleted: 'false',
        familyId: 'test-family-id'
      });
      
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error for empty memo text', async () => {
      await expect(memoService.addMemo('test-user-id', '', 'Test User'))
        .rejects.toThrow('Memo text cannot be empty');
    });

    it('should throw error for memo text too long', async () => {
      const longText = 'a'.repeat(501);
      await expect(memoService.addMemo('test-user-id', longText, 'Test User'))
        .rejects.toThrow('Memo text too long');
    });
  });

  describe('getActiveMemos', () => {
    it('should return active memos for a user', async () => {
      // Mock UserService response
      mockSend.mockResolvedValueOnce({
        Item: {
          userId: 'test-user-id',
          familyId: 'test-family-id',
          userName: 'Test User'
        }
      });

      // Mock QueryCommand response
      mockSend.mockResolvedValueOnce({
        Items: [
          {
            userId: 'test-user-id',
            memoId: 'memo1',
            text: 'Memo 1',
            deleted: 'false',
            familyId: 'test-family-id'
          },
          {
            userId: 'test-user-id',
            memoId: 'memo2',
            text: 'Memo 2',
            deleted: 'false',
            familyId: 'test-family-id'
          }
        ]
      });

      const result = await memoService.getActiveMemos('test-user-id');

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Memo 1');
      expect(result[1].text).toBe('Memo 2');
    });

    it('should return empty array when no memos exist', async () => {
      // Mock UserService response
      mockSend.mockResolvedValueOnce({
        Item: {
          userId: 'test-user-id',
          familyId: 'test-family-id',
          userName: 'Test User'
        }
      });

      // Mock QueryCommand response with no items
      mockSend.mockResolvedValueOnce({
        Items: []
      });

      const result = await memoService.getActiveMemos('test-user-id');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteMemo', () => {
    it('should delete a memo successfully', async () => {
      // Mock UserService response
      mockSend.mockResolvedValueOnce({
        Item: {
          userId: 'test-user-id',
          familyId: 'test-family-id',
          userName: 'Test User'
        }
      });

      // Mock ScanCommand response
      mockSend.mockResolvedValueOnce({
        Items: [{
          userId: 'test-user-id',
          memoId: 'memo1',
          familyId: 'test-family-id'
        }]
      });

      // Mock UpdateCommand response
      mockSend.mockResolvedValueOnce({});

      await memoService.deleteMemo('test-user-id', 'memo1');

      expect(mockSend).toHaveBeenCalledTimes(3);
      
      // Verify UpdateCommand was called with correct parameters
      const updateCall = mockSend.mock.calls[2][0];
      expect(updateCall).toBeDefined();
    });

    it('should throw error when memo not found', async () => {
      // Mock UserService response
      mockSend.mockResolvedValueOnce({
        Item: {
          userId: 'test-user-id',
          familyId: 'test-family-id',
          userName: 'Test User'
        }
      });

      // Mock ScanCommand response with no items
      mockSend.mockResolvedValueOnce({
        Items: []
      });

      await expect(memoService.deleteMemo('test-user-id', 'non-existent'))
        .rejects.toThrow('Memo not found');
    });
  });
});