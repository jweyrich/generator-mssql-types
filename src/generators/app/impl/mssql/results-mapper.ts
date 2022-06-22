import { Datasource } from "@src/generators/app/impl/mssql/connector/datasource";
import { Parameter } from "@src/generators/app/impl/mssql/connector/parameter";
import { Query } from "@src/generators/app/impl/mssql/connector/query";
import { SqlTypes } from "@src/generators/app/impl/mssql/connector/types";
import { MappedType, SQLMapper } from '@src/generators/app/impl/mssql/sql-mapper';

export type IStoredProcedureResultsQueryRecord = {
    is_hidden: boolean;
    column_ordinal: number;
    name: string;
    is_nullable: boolean;
    system_type_id: number;
    system_type_name: string;
    max_length: number;
    precision: number;
    scale: number;
    collation_name: string | null; // Example: SQL_Latin1_General_CP1_CI_AS
    // user_type_id: null;
    // user_type_database: null;
    // user_type_schema: null;
    // user_type_name: null;
    // assembly_qualified_type_name: null;
    // xml_collection_id: null;
    // xml_collection_database: null;
    // xml_collection_schema: null;
    // xml_collection_name: null;
    is_xml_document: boolean;
    is_case_sensitive: boolean;
    is_fixed_length_clr_type: boolean;
    // source_server: null;
    // source_database: null;
    // source_schema: null;
    // source_table: null;
    // source_column: null;
    is_identity_column: boolean;
    // is_part_of_unique_key: null;
    is_updateable: boolean;
    is_computed_column: boolean;
    is_sparse_column_set: boolean;
    // ordinal_in_order_by_list: null;
    // order_by_is_descending: null;
    // order_by_list_length: null;
    // error_number: null;
    // error_severity: null;
    error_state: boolean;
    // error_message: string;
    // error_type: null;
    error_type_desc: string;
};

export type IStoredProcedureResultsOutputRecord = {
    name: string;
    type: MappedType;
    optional: boolean;
};

export type IStoredProcedureResultsOutput = {
    isEmptyType: boolean;
    isPlainType: boolean;
    attributes: Array<IStoredProcedureResultsOutputRecord>;
    errorMessage?: string;
};

export class StoredProcedureResultsMapper extends SQLMapper<IStoredProcedureResultsOutput> {
    constructor(readonly db: Datasource, readonly procedureName: string) {
        super();
    }

    public async execute(): Promise<IStoredProcedureResultsOutput> {
        const query = new Query<IStoredProcedureResultsQueryRecord>(this.RAW_QUERY_PROCEDURE_RESULTS)
            .withParameter(
                new Parameter('stored_procedure_name', this.procedureName, SqlTypes.VarChar(255))
            );
        const result = await this.db.execQuery(query);
        if (result.recordset.length > 0) {
            // The inspection failed with an error!
            const hasError = result.recordset[0].error_state;
            if (hasError) {
                const errorMessage = result.recordset[0].error_type_desc;
                const msg = `Failed to inspect the results of ${this.procedureName}: ${errorMessage}`;
                console.warn(msg);
                return {
                    isEmptyType: false,
                    isPlainType: false,
                    attributes: [],
                    errorMessage: msg,
                };
            }
        }

        // If the Stored Procedure returns nothing, we have an empty type.
        const isEmptyType = result.recordset.length === 0;

        // If the Stored Procedure returns a single value with no name, we have a plain type.
        const isPlainType = result.recordset.length === 1 && !result.recordset[0].name;

        const hasUnsupportedType = result.recordset.some((record) => this.hasUnsupportedType(record));
        if (hasUnsupportedType) {
            // Return `null` so the caller can skip this procedure.
            return null;
        }

        return {
            isEmptyType,
            isPlainType,
            attributes: result.recordset.map((record) => this.makeResultColumn(record)),
        };
    }

    public hasUnsupportedType(record: IStoredProcedureResultsQueryRecord): boolean {
        const name = this.cleanResultColumnName(record.name);
        const typeName = this.cleanResultColumnTypeName(record.system_type_name)
        const supportsType = this.supportsType(typeName);
        if (!supportsType) {
            console.warn(`Failed to generate code for ${this.procedureName}: result column ${name} has unsupported type ${typeName}`);
            return true;
        }
        return false;
    }

    public makeResultColumn(record: IStoredProcedureResultsQueryRecord): IStoredProcedureResultsOutputRecord {
        const name = this.cleanResultColumnName(record.name);
        const typeName = this.cleanResultColumnTypeName(record.system_type_name)
        const type = this.mapFromSqlType(
            typeName,
            record.max_length,
            record.precision,
            record.scale,
        );
        const optional = record.is_nullable;
        return { name, type, optional };
    }

    public cleanResultColumnName(paramName: string): string {
        return paramName;
    }

    public cleanResultColumnTypeName(typeName: string): string {
        let result = typeName;
        if (result) {
            result = result.toLocaleLowerCase().replace(/\(.+\)/, ''); // Transform 'varchar(80)' to 'varchar'
        }
        return result;
    }

    private readonly RAW_QUERY_PROCEDURE_RESULTS = `
        SELECT * FROM sys.dm_exec_describe_first_result_set_for_object(
            OBJECT_ID(@stored_procedure_name),
            0
        );
    `;
}
