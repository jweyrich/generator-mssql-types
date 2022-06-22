import { Datasource } from "@src/generators/app/impl/mssql/connector/datasource";
import { Parameter } from "@src/generators/app/impl/mssql/connector/parameter";
import { Query } from "@src/generators/app/impl/mssql/connector/query";
import { SqlTypes } from '@src/generators/app/impl/mssql/connector/types';
import { MappedType, SQLMapper } from '@src/generators/app/impl/mssql/sql-mapper';

export type IStoredProcedureParametersQueryRecord = {
    Schema: string;
    ObjectName: string;
    ObjectType: string;
    ParameterID: number;
    ParameterName: string;
    ParameterTypeName: string;
    Size: number;
    Precision: number;
    Scale: number;
    IsOutput: boolean;
    IsNullable: boolean;
    HasDefaultValue: boolean;
    DefaultValue: string;
};

export type IStoredProcedureParametersOutputRecord = {
    name: string;
    type: MappedType;
    optional: boolean;
};

export type IStoredProcedureParametersOutput = {
    isEmptyType: boolean;
    isPlainType: boolean;
    attributes: Array<IStoredProcedureParametersOutputRecord>;
} | null;

export class StoredProcedureParametersMapper extends SQLMapper<IStoredProcedureParametersOutput> {
    constructor(readonly db: Datasource, readonly procedureName: string) {
        super();
    }

    public async execute(): Promise<IStoredProcedureParametersOutput> {
        const query = new Query<IStoredProcedureParametersQueryRecord>(this.RAW_QUERY_ALL_PROCEDURE_PARAMETERS)
            .withParameter(
                new Parameter('stored_procedure_name', this.procedureName, SqlTypes.VarChar(255))
            );
        const result = await this.db.execQuery(query);

        // If the Stored Procedure has no parameteres, we have an empty type.
        const isEmptyType = result.recordset.length === 0;

        // If the Stored Procedure has a single parameters with no name, we have a plain type.
        const isPlainType = result.recordset.length === 1 && !result.recordset[0].ParameterName;

        const hasUnsupportedType = result.recordset.some((record) => this.hasUnsupportedType(record));
        if (hasUnsupportedType) {
            // Return `null` so the caller can skip this procedure.
            return null;
        }

        return {
            isEmptyType,
            isPlainType,
            attributes: result.recordset.map((record) => this.makeParameter(record)),
        };
    }

    public hasUnsupportedType(record: IStoredProcedureParametersQueryRecord): boolean {
        const name = this.cleanParameterName(record.ParameterName);
        const typeName = record.ParameterTypeName;
        const supportsType = this.supportsType(typeName);
        if (!supportsType) {
            console.warn(`Failed to generate code for ${this.procedureName}: parameter ${name} has unsupported type ${typeName}`);
            return true;
        }
        return false;
    }

    public makeParameter(record: IStoredProcedureParametersQueryRecord): IStoredProcedureParametersOutputRecord {
        const name = this.cleanParameterName(record.ParameterName);
        const typeName = record.ParameterTypeName;
        const type = this.mapFromSqlType(typeName, record.Size, record.Precision, record.Scale);
        const optional = record.IsNullable;
        return { name, type, optional };
    }

    public cleanParameterName(paramName: string): string {
        let result = paramName;
        if (result) {
            result = result.replace('@', ''); // Transform '@vParam1' to 'vParam1'
        }
        return result;
    }

    // Original code from: https://www.mssqltips.com/sqlservertip/1669/generate-a-parameter-list-for-all-sql-server-stored-procedures-and-functions/
    private readonly RAW_QUERY_ALL_PROCEDURE_PARAMETERS = `
        SELECT
            SCHEMA_NAME(SO.schema_id) AS [Schema],
            SO.name AS [ObjectName],
            SO.type_desc AS [ObjectType],
            PM.parameter_id AS [ParameterID],
            CASE
                WHEN PM.parameter_id = 0 THEN 'Returns'
                ELSE PM.name
                END AS [ParameterName],
            TYPE_NAME(PM.user_type_id) AS [ParameterTypeName],
            PM.max_length AS [Size], -- in bytes
            PM.precision AS [Precision],
            PM.scale AS [Scale],
            PM.is_output AS [IsOutput],
            PM.is_nullable AS [IsNullable],
            PM.has_default_value AS [HasDefaultValue],
            PM.default_value AS [DefaultValue]
        FROM sys.objects AS SO
        INNER JOIN sys.parameters AS PM ON SO.object_id = PM.object_id
        WHERE SO.type IN ('P','FN')
        AND SO.type_desc = 'SQL_STORED_PROCEDURE'
        AND SO.name = @stored_procedure_name
        ORDER BY SO.type_desc, [Schema], SO.Name, PM.parameter_id;
    `;
}
