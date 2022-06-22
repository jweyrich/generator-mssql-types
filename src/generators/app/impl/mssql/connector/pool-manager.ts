import { ConnectionStringParser } from './connection-string-parser';
import { SqlConnectionConfig, SqlConnectionPool } from './types';

export class PoolManager {
    private _managedPools = new Map<string, SqlConnectionPool>();

    /**
     * Manage a set of connection pools by name.
     * Requesting a given pool name for the first time causes it to be created and added to a global Map.
     * After that, all requests for the same pool name will return the existing pool.
     * A pool will be removed from the global Map when it's closed. To achieve that, at pool creation time
     * we overwrite the default `ConnectionPool.close` method to also remove the pool from the Map.
     *
     * @param {string} name - Name for the pool.
     * @param {string} config - Config for the pool.
     */
    public async getPool(name: string, config: string): Promise<SqlConnectionPool> {
        let pool: SqlConnectionPool = this._managedPools.get(name);
        if (!pool) {
            pool = this.createPool(name, config);
            await pool.connect();
            // Add the pool to the global Map only after it's connected.
            this._managedPools.set(name, pool);
        } else {
            // Reconnect the pool if it's disconnected for some reason.
            // Disconnect reasons include: network error, database restart, etc.
            if (!pool.connected) {
                await pool.connect();
            }
        }
        return pool;
    }

    /**
     * Close all existing connection pools and remove them from the global Map.
     */
    public async closeAll(): Promise<void> {
        const pools: SqlConnectionPool[] = Array.from(this._managedPools.values());
        this._managedPools.clear();
        await Promise.all(
            pools.map(async (pool: SqlConnectionPool): Promise<void> => pool.close())
        );
    }

    /**
     * Create a new connection pool.
     *
     * @param {string} name - Name for the pool.
     * @param {string} config - Config for the pool.
     * @returns The newly created SqlConnectionPool.
     */
    private createPool(name: string, config: string): SqlConnectionPool {
        const configObj: SqlConnectionConfig = ConnectionStringParser.parseConnectString(config);
        const pool = new SqlConnectionPool(configObj);
        const close = pool.close.bind(pool);
        // Overwrite the default `ConnectionPool.close` method to also remove the pool from the global Map.
        pool.close = async (...args): Promise<void> => {
            this._managedPools.delete(name);
            return await close(...args);
        };
        return pool;
    }
}

const globalPoolManager: PoolManager = new PoolManager();

export default globalPoolManager;
