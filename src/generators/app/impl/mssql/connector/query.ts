import { Parameter } from './parameter';
import { IResult, ISqlExecutable, ISqlParametrizable, ISqlType, SqlRequest } from './types';

export class Query<RowType = unknown> implements
    ISqlExecutable<SqlRequest, IResult<RowType>>,
    ISqlParametrizable<Parameter, Query<RowType>>
{
    private _sql: string;
    private _parameters: Parameter[];

    /**
     * Represents a Query to be executed.
     *
     * @constructor
     * @param {string} query - SQL statements to be executed.
     */
    constructor(query: string) {
        this._sql = query;
        this._parameters = [];
    }

    /**
     * Returns the SQL query.
     */
    get sql(): string {
        return this._sql;
    }

    /**
     * Returns a shallow-copy of the parameters.
     */
    get parameters(): Parameter[] {
        return [...this._parameters];
    }

    /**
     * Adds 1 or more parameters to be used when the query is executed.
     *
     * @param {Parameter[]} params - Parameters to be added.
     */
    public withParameters(params: Parameter[]): this {
        if (params) {
            params.forEach((v) => this._parameters.push(v));
        }
        return this;
    }

    /**
     * Adds 1 parameter to be used when the query is executed.
     *
     * @param {Parameter} param - Parameter to be added.
     */
    public withParameter(param: Parameter): this {
        if (param) {
            this._parameters.push(param);
        }
        return this;
    }

    /**
     * Adds 1 parameter to be used when the query is executed.
     *
     * @param {string} name - Parameter name.
     * @param {<T>} value - Parameter value.
     * @param {ISqlType?} type - Parameter type.
     *                           Available types: https://github.com/tediousjs/node-mssql#data-types
     */
    public addParameter<T>(name: string, value: T, type: ISqlType): this {
        const param = new Parameter(name, value, type);
        return this.withParameter(param);
    }

    /**
     * Executes the SQL query using the given instance of `SqlRequest`.
     *
     * @param {SqlRequest} request - Instance of `SqlRequest` where the query will be executed.
     */
    public async execute(request: SqlRequest): Promise<IResult<RowType>> {
        for (const p of this._parameters) {
            request = request.input(p.name, p.type, p.value);
        }
        // console.debug('Parameters:', request.parameters);
        const result = await request.query<RowType>(this._sql);
        return result;
    }
}
