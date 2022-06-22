import { config, ConnectionPool, IProcedureResult, IRecordSet, IResult, ISqlType, MSSQLError, Request, TYPES } from 'mssql';

interface ISqlExecutable<RequestType, ReturnType> {
    execute(request: RequestType): Promise<ReturnType>;
}

interface ISqlParametrizable<ParamType, ReturnType> {
    withParameters(params: ParamType[]): ReturnType;
    withParameter(param: ParamType): ReturnType;
    addParameter<T>(name: string, value: T, type: ISqlType): ReturnType;
    readonly parameters: ParamType[];
}

export {
    IProcedureResult,
    IRecordSet,
    IResult,
    ISqlExecutable,
    ISqlParametrizable,
    ISqlType,
    // Types from node-mssql
    ConnectionPool as SqlConnectionPool,
    Request as SqlRequest,
    MSSQLError, // Dear reader, you should install @types/mssql (see my package.json for the exact version)
    config as SqlConnectionConfig, // Dear reader, you should install @types/mssql (see my package.json for the exact version)
    TYPES as SqlTypes, // Dear reader, you should install @types/mssql (see my package.json for the exact version)
};
