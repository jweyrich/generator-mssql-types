import { ISqlType } from './types';

export class Parameter {
    public readonly name: string;
    public readonly value: unknown;
    public readonly type?: ISqlType;

    /**
     * Represents a parameter to be used by a Query or Stored Procedure.
     *
     * @param {string} name - Parameter name.
     * @param {unknown} value - Parameter value.
     * @param {ISqlType} type - Parameter type. Available types: https://github.com/tediousjs/node-mssql#data-types
     */
    constructor(name: string, value: unknown, type: ISqlType) {
        this.name = name;
        this.value = value;
        this.type = type;
    }
}
