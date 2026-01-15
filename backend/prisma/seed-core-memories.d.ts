/**
 * Seeds the Core Memories category for a specific user
 * @param userId - The user ID to seed the category for
 * @returns The created category or existing category
 */
export declare function seedCoreMemoriesCategory(userId: string): Promise<{
    name: string;
    icon: string | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    groupId: string | null;
    color: string | null;
    isProtected: boolean;
}>;
/**
 * Seeds Core Memories category for all existing users
 */
export declare function seedAllUsersCoreMemories(): Promise<void>;
//# sourceMappingURL=seed-core-memories.d.ts.map