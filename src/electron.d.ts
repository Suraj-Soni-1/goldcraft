// Global type declarations for Electron API exposed via preload
export {}

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      getCustomers: () => Promise<any[]>
      getCustomer: (id: number) => Promise<{ customer: any; bills: any[] }>
      addCustomer: (data: any) => Promise<number>
      updateCustomer: (id: number, data: any) => Promise<boolean>
      deleteCustomer: (id: number) => Promise<boolean>
      adjustCustomerBalance: (id: number, amount: number, isDeduction: boolean, notes: string) => Promise<boolean>
      getBills: () => Promise<any[]>
      getBill: (id: number) => Promise<{ bill: any; items: any[] }>
      addBill: (bill: any, items: any[]) => Promise<number>
      updateBill: (id: number, bill: any, items: any[]) => Promise<boolean>
      deleteBill: (id: number) => Promise<boolean>
      getHistory: (filters?: any) => Promise<any[]>
      getRates: () => Promise<any[]>
      getLatestRates: () => Promise<any>
      addRate: (data: any) => Promise<boolean>
      getSettings: () => Promise<Record<string, string>>
      saveSettings: (settings: Record<string, string>) => Promise<boolean>
      fetchLiveRates: () => Promise<{
        ok: boolean; error?: string;
        gold24k: number | null; gold22k: number | null; gold18k: number | null;
        silver: number | null; goldChange: number; silverChange: number;
        fxRate: number; marketState: string; timestamp: number;
      }>
    }
  }
}
