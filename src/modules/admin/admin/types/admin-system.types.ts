export interface SystemStats {
  database: {
    totalUsers: number;
    totalMasters: number;
    totalLeads: number;
    totalReviews: number;
    totalPayments: number;
  };
  system: {
    memory: {
      total: string;
      used: string;
      free: string;
      usage: string;
    };
    cpu: {
      load: number[];
      cores: number;
    };
    uptime: string;
    platform: string;
  };
  redis: {
    connectedClients: number;
    usedMemory: string;
    totalCommands: number;
  };
  daily: {
    newUsers: number;
    newLeads: number;
    newReviews: number;
  };
}
