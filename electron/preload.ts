import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Customers
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  getCustomer: (id: number) => ipcRenderer.invoke('get-customer', id),
  addCustomer: (data: any) => ipcRenderer.invoke('add-customer', data),
  updateCustomer: (id: number, data: any) => ipcRenderer.invoke('update-customer', id, data),
  deleteCustomer: (id: number) => ipcRenderer.invoke('delete-customer', id),
  adjustCustomerBalance: (id: number, amount: number, isDeduction: boolean, notes: string) => ipcRenderer.invoke('adjust-customer-balance', id, amount, isDeduction, notes),

  // Bills
  getBills: () => ipcRenderer.invoke('get-bills'),
  getBill: (id: number) => ipcRenderer.invoke('get-bill', id),
  addBill: (bill: any, items: any[]) => ipcRenderer.invoke('add-bill', bill, items),
  updateBill: (id: number, bill: any, items: any[]) => ipcRenderer.invoke('update-bill', id, bill, items),
  deleteBill: (id: number) => ipcRenderer.invoke('delete-bill', id),

  // History
  getHistory: (filters?: any) => ipcRenderer.invoke('get-history', filters),

  // Metal Rates
  getRates: () => ipcRenderer.invoke('get-rates'),
  getLatestRates: () => ipcRenderer.invoke('get-latest-rates'),
  addRate: (data: any) => ipcRenderer.invoke('add-rate', data),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),

  // Live Market Rates
  fetchLiveRates: () => ipcRenderer.invoke('fetch-live-rates'),

  // Clear Database
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
})
