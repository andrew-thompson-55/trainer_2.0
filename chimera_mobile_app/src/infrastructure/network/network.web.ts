// Network adapter for web (assumes always online, lets fetch handle errors)

import type { NetworkAdapter, NetworkState } from './network';

export const networkAdapter: NetworkAdapter = {
  async getNetworkState(): Promise<NetworkState> {
    return { isConnected: true };
  },
};
