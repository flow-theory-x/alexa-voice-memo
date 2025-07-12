import { MemoItem } from './types';
export declare class MemoService {
    private docClient;
    private tableName;
    constructor();
    addMemo(userId: string, text: string): Promise<MemoItem>;
    getActiveMemos(userId: string): Promise<MemoItem[]>;
    deleteMemo(userId: string, memoId: string): Promise<void>;
}
