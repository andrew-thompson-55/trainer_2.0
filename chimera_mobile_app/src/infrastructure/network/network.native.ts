// Network adapter for native (uses expo-network)

import * as Network from 'expo-network';
import type { NetworkAdapter, NetworkState } from './network';

export const networkAdapter: NetworkAdapter = {
  async getNetworkState(): Promise<NetworkState> {
    return await Network.getNetworkStateAsync();
  },
};
