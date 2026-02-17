// Network state interface - Platform-agnostic

export interface NetworkState {
  isConnected: boolean | null;
}

export interface NetworkAdapter {
  getNetworkState(): Promise<NetworkState>;
}
