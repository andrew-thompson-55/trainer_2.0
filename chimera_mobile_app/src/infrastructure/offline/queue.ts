import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueueItem {
  id: string;       // Unique ID for this queue action
  type: 'UPDATE' | 'DELETE' | 'CREATE';
  endpoint: string; // e.g., '/workouts/123'
  payload: any;     // The data we tried to send
  timestamp: number;
}

const QUEUE_KEY = 'offline_mutation_queue';

export const OfflineQueue = {
  // 1. Add an item to the Outbox (With Optimization)
  
  addToQueue: async (item: Omit<QueueItem, 'id' | 'timestamp'>) => {
    let queue = await OfflineQueue.getQueue();
    
    // ⚡️ OPTIMIZATION: If deleting a temp item, wipe its ENTIRE history
    if (item.type === 'DELETE' && item.endpoint.includes('temp-')) {
        const tempId = item.endpoint.split('/').pop(); // Extract "temp-123"
        
        const initialLength = queue.length;

        // 🧹 Wipe EVERYTHING related to this ID (Creates, Updates, Deletes)
        queue = queue.filter(q => {
            // 1. Check if it's the CREATE for this ID
            if (q.type === 'CREATE' && q.payload.id === tempId) return false;
            
            // 2. Check if it's an UPDATE/DELETE for this ID
            if (q.endpoint.includes(tempId || '_____')) return false;
            
            return true; // Keep everything else
        });

        if (queue.length < initialLength) {
            console.log(`✨ Optimization: Nuked all traces of ${tempId}`);
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
            return; // Don't add the DELETE to the queue, we are done.
        }
    }

    // Normal behavior
    const newItem: QueueItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    queue.push(newItem);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`🔌 Added to Offline Queue: ${item.type} ${item.endpoint}`);
  },

  // 2. Get the whole Outbox
  getQueue: async (): Promise<QueueItem[]> => {
    const json = await AsyncStorage.getItem(QUEUE_KEY);
    return json ? JSON.parse(json) : [];
  },

  // 3. Clear the Outbox
  clearQueue: async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  // 4. Remove a specific item
  removeFromQueue: async (id: string) => {
    const queue = await OfflineQueue.getQueue();
    const newQueue = queue.filter(q => q.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
  }
};