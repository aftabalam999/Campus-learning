/**
 * Simple in-memory cache for Firestore queries
 * Reduces redundant reads by caching frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get data from cache or fetch if not cached/expired
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`📦 Cache HIT: ${key}`);
      return cached.data as T;
    }

    // Fetch fresh data
    console.log(`🔄 Cache MISS: ${key} - Fetching from Firestore...`);
    const data = await fetchFn();
    
    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): void {
    console.log(`🗑️ Cache INVALIDATE: ${key}`);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache keys matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => {
      console.log(`🗑️ Cache INVALIDATE: ${key}`);
      this.cache.delete(key);
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    console.log('🗑️ Cache CLEAR ALL');
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes - for frequently changing data
  MEDIUM: 5 * 60 * 1000,     // 5 minutes - default for most queries
  LONG: 15 * 60 * 1000,      // 15 minutes - for rarely changing data (phases, topics)
  VERY_LONG: 60 * 60 * 1000  // 1 hour - for static reference data
};
