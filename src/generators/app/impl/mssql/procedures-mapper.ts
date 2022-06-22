import { Datasource } from "@src/generators/app/impl/mssql/connector/datasource";
import { Query } from "@src/generators/app/impl/mssql/connector/query";
import { SQLMapper } from "@src/generators/app/impl/mssql/sql-mapper";

export type IStoredProceduresQueryRecord = {
    ROUTINE_SCHEMA: string;
    ROUTINE_NAME: string;
}

export type IStoredProceduresOutputRecord = {
    name: string;
}

export type IStoredProceduresOutput = Array<IStoredProceduresOutputRecord> | null;

export class StoredProceduresMapper extends SQLMapper<IStoredProceduresOutput> {
    constructor(readonly db: Datasource) {
        super();
    }

    public async execute(): Promise<IStoredProceduresOutput> {
        const query = new Query<IStoredProceduresQueryRecord>(this.RAW_QUERY_ALL_PROCEDURES);
        const result = await this.db.execQuery(query);
        const mapped = result.recordset
            .filter(this.isNotTemporaryProcedure)
            .map((record) => this.makeProcedure(record));
        return mapped;
    }

    public makeProcedure(record: IStoredProceduresQueryRecord): IStoredProceduresOutputRecord {
        const name = this.cleanProcedureName(record.ROUTINE_NAME);
        return { name };
    }

    public cleanProcedureName(name: string): string {
        // MSSQL stored procedure names must comply with the rules for identifiers and must be unique within the schema.
        // REFERENCE: https://docs.microsoft.com/en-us/sql/t-sql/statements/create-procedure-transact-sql?view=sql-server-ver16#procedure_name
        const result = name;
        return result;
    }

    public isNotTemporaryProcedure(record: IStoredProceduresQueryRecord): boolean {
        const isTemporary = record.ROUTINE_NAME.startsWith('#');
        return !isTemporary;
    }

    private readonly RAW_QUERY_ALL_PROCEDURES = `
        SELECT
            ROUTINE_SCHEMA,
            ROUTINE_NAME
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_TYPE = 'PROCEDURE';
    `;
}
