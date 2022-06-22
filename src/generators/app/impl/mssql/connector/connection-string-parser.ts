import { SqlConnectionConfig, SqlConnectionPool } from './types';

export class ConnectionStringParser {
    public static readonly DEFAULT_CONNECTION_TIMEOUT = 5000; // Milliseconds - The node-mssql default is 15000
    public static readonly DEFAULT_REQUEST_TIMEOUT = 25000; // Milliseconds - The node-mssql default is 15000
    public static readonly DEFAULT_ENCRYPT = true; // The node-mssql default is false
    public static readonly DEFAULT_TRUST_SERVER_CERTIFICATE = true; // The node-mssql default is true -- In node-mssql >= 7.0.0, if not supplied, this is false

    /**
     * Parse the database connection string.
     *
     * @param {string} connectionString - The connection string in one of the following formats:
     *      1. mssql://<user>:<password>@<server>/<database>?requestTimeout=<requestTimeout>&encrypt=true&trustServerCertificate=true
     *      2. Data Source=<server>;Initial Catalog=<database>;User ID=<user>;Password=<password>;Request Timeout=<requestTimeout>;TrustServerCertificate=true
     * @returns A configuration object to be used to create the connection pool.
     */
    public static parseConnectString(connectionString: string): SqlConnectionConfig {
        let configObj: SqlConnectionConfig = null;

        //
        // NOTE: node-mssql >= 8.0.0 no longer supports connection strings using the mssql:// format.
        // Therefore we have to deal with it ourselves - or is there a better alternative?
        //
        // The supported configurations are documented at
        // https://github.com/tediousjs/node-mssql/blob/80f71d01efc77e53c9da7052f8c9c827fb07ca3f/README.md#general-same-for-all-drivers
        //
        if (connectionString.startsWith('mssql://')) {
            const url = new URL(connectionString);
            const connectionTimeout = this.getParam(url.searchParams, 'connectionTimeout', 'number', this.DEFAULT_CONNECTION_TIMEOUT);
            const requestTimeout = this.getParam(url.searchParams, 'requestTimeout', 'number', this.DEFAULT_REQUEST_TIMEOUT);
            const encrypt = this.getParam(url.searchParams, 'encrypt', 'boolean', this.DEFAULT_ENCRYPT);
            const trustServerCertificate = this.getParam(
                url.searchParams,
                'trustServerCertificate',
                'boolean',
                this.DEFAULT_TRUST_SERVER_CERTIFICATE,
            );

            configObj = {
                port: Number(url.port) || 1433,
                server: decodeURIComponent(url.hostname),
                database: decodeURIComponent(url.pathname).slice(1), // Remove the leading '/'
                user: decodeURIComponent(url.username),
                password: decodeURIComponent(url.password),
                connectionTimeout: connectionTimeout,
                requestTimeout: requestTimeout,
                options: {
                    encrypt: encrypt,
                    trustServerCertificate: trustServerCertificate,
                },
            };
        } else {
            configObj = SqlConnectionPool.parseConnectionString(connectionString);
            if (configObj.options == null) {
                configObj.options = {};
            }
            if (configObj.connectionTimeout == null || isNaN(configObj.connectionTimeout)) {
                configObj.connectionTimeout = this.DEFAULT_CONNECTION_TIMEOUT;
            }
            if (configObj.requestTimeout == null || isNaN(configObj.requestTimeout)) {
                configObj.requestTimeout = this.DEFAULT_REQUEST_TIMEOUT;
            }
            if (configObj.options.encrypt == null) {
                configObj.options.encrypt = this.DEFAULT_ENCRYPT;
            }
            if (configObj.options.trustServerCertificate == null) {
                configObj.options.trustServerCertificate = this.DEFAULT_TRUST_SERVER_CERTIFICATE;
            }
        }

        return configObj;
    }

    // The following is an example of a Function Overload - https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads
    public static getParam(params: URLSearchParams, name: string, type: 'string', defaultValue?: string): string;
    public static getParam(params: URLSearchParams, name: string, type: 'number', defaultValue?: number): number;
    public static getParam(params: URLSearchParams, name: string, type: 'boolean', defaultValue?: boolean): boolean;
    public static getParam(
        params: URLSearchParams,
        name: string,
        type: 'string' | 'number' | 'boolean',
        defaultValue?: string | number | boolean,
    ): string | number | boolean {
        const has = params.has(name);
        if (!has) {
            return defaultValue;
        }

        const value = params.get(name);

        const converter = {
            string: (): string => {
                return value;
            },
            number: (): number => {
                const num = Number(value);
                return isNaN(num) ? <number>defaultValue : num;
            },
            boolean: (): boolean => {
                const lower = value.toLocaleLowerCase();
                const isTrue = ['true', 'yes'].includes(lower);
                if (isTrue) {
                    return true;
                }
                const isFalse = ['false', 'no'].includes(lower);
                if (isFalse) {
                    return false;
                }
                return <boolean>defaultValue;
            },
        };

        const converterFn = converter[type];
        return converterFn();
    }
}
