export interface RedisInfo {
    redis_version: string;
    used_memory: string;
    used_memory_human: string;
    connected_clients: string;
    total_commands_processed: string;
    [key: string]: string | number;
}
export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
}
