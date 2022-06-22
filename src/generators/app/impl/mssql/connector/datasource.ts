import { createHash } from 'crypto';
import { IProcedureResult, MSSQLError, RequestError } from 'mssql';
import { Parameter } from './parameter';
import globalPoolManager from './pool-manager';
import { Procedure } from "./procedure";
import { Query } from './query';
import { IResult, SqlConnectionPool, SqlRequest } from './types';

export class DatabaseError extends Error {
    public readonly number?: number;
    public readonly internalMessage: string;
    public readonly name: string;
    public readonly code?: string;

    constructor(error: MSSQLError) {
        super('Received and error while executing a database operation');
        this.code = error.code;
        this.internalMessage = error.message;
        this.name = error.name;

        if (error instanceof RequestError) {
            this.number = error.number;
        }
    }
}

export class Datasource {
    private url: string;
    private poolName: string;

    constructor(url: string) {
        this.url = url;
    }

    public async getPool(): Promise<SqlConnectionPool> {
        if (!this.poolName) {
            this.poolName = this.makePoolName(this.url);
        }
        return await globalPoolManager.getPool(this.poolName, this.url);
    }

    private async connectAndExecute<ResultType extends IResult<RowType>, RowType = unknown>(
        func: (request: SqlRequest) => Promise<ResultType>,
    ): Promise<ResultType> {
        try {
            const pool: SqlConnectionPool = await this.getPool(); // Connect successfully or throw an exception.
            const request = new SqlRequest(pool);
            const result = await func(request); // Run successfully or throw an exception.
            return result;
        } catch (e) {
            this.onError(<MSSQLError>e);
        }
    }

    public async execute<RowType = unknown>(query: string, ...params: Parameter[]): Promise<IResult<RowType>> {
        return await this.execQuery(new Query<RowType>(query).withParameters(params));
    }

    public async execQuery<RowType = unknown>(query: Query<RowType>): Promise<IResult<RowType>> {
        return await this.connectAndExecute(async (request: SqlRequest) => query.execute(request));
    }

    public async execProcedure<RowType = unknown>(procedure: Procedure<RowType>): Promise<IProcedureResult<RowType>> {
        return await this.connectAndExecute(async (request) => procedure.execute(request));
    }

    /**
     * Log the real error and throw a generic error to avoid revealing any details to the end user.
     *
     * @param {MSSQLError} error - The exception object.
     */
    private onError(error: MSSQLError): never {
        if (error instanceof RequestError) {
            process.stderr.write(
                `Caught an exception during MSSQL query execution: name=${error.name}, code=${error.code}, message=${error.message}, number=${error.number}\n`,
            );
        } else {
            process.stderr.write(
                `Caught an exception during MSSQL query execution: name=${error.name}, code=${error.code}, message=${error.message}\n`,
            );
        }
        throw new DatabaseError(error);
    }

    private makePoolName(url: string): string {
        if (!url) {
            throw Error('database connection string cannot be null or empty');
        }
        const hash = createHash('SHA1');
        hash.update(url, 'ascii');
        return hash.digest('hex');
    }
}
