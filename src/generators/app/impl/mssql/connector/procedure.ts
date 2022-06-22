import { v4 as uuidv4 } from 'uuid';
import { Parameter } from './parameter';
import { IProcedureResult, ISqlExecutable, ISqlParametrizable, ISqlType, SqlRequest, SqlTypes } from './types';

export class Procedure<RowType = unknown> implements
    ISqlExecutable<SqlRequest, IProcedureResult<RowType>>,
    ISqlParametrizable<Parameter, Procedure<RowType>>
{
    private _procedureName: string;
    private _parameters: Parameter[];

    /**
     * Reprents a Stored Procedure to be executed.
     *
     * @constructor
     * @param {string} procedureName - Name of the Stored Procedure to be executed.
     */
    constructor(procedureName: string) {
        this._procedureName = procedureName;
        this._parameters = [];
    }

    /**
     * Returns the Stored Procedure name.
     */
    get procedureName(): string {
        return this.procedureName;
    }

    /**
     * Returns a shallow-copy of the parameters.
     */
    get parameters(): Parameter[] {
        return [...this._parameters];
    }

    /**
     * Add 1 or more parameters to be used when the Stored Procedure is executed.
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
     * Add 1 parameter to be used when the Stored Procedure is executed.
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
     * Add 1 parameter to be used when the Stored Procedure is executed.
     *
     * @param {string} name - Parameter name.
     * @param {<T>} value - Parameter value.
     * @param {ISqlType?} type - Paremeter type.
     *                           Available types: https://github.com/tediousjs/node-mssql#data-types
     */
    public addParameter<T>(name: string, value: T, type: ISqlType): this {
        const param = new Parameter(name, value, type);
        return this.withParameter(param);
    }

    /**
     * Add 1 parameter of type  UniqueIdentifier (UUID) to be used when the Stored Procedure is executed.
     *
     * @param {string} name - Parameter name.
     * @param {string?} value - Parameter value. Optional. If not provided, it will be a value generated by
     * the function `uuidv4()`.
     */
    public addUuidParameter(name: string, value?: string): this {
        const param = new Parameter(name, value || uuidv4(), SqlTypes.UniqueIdentifier());
        return this.withParameter(param);
    }

    /**
     * Executes the Stored Procedure using the given instance of `SqlRequest`.
     *
     * @param {SqlRequest} request - Instance of `SqlRequest` where the Stored Procedure will be executed.
     */
    public async execute(request: SqlRequest): Promise<IProcedureResult<RowType>> {
        for (const p of this._parameters) {
            request = request.input(p.name, p.type, p.value);
        }
        // console.debug('Parameters:', request.parameters);
        const result = await request.execute<RowType>(this._procedureName);
        return result;
    }
}