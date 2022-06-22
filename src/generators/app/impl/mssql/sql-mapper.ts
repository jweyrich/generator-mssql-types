export type MappedType = {
    nativeType: string;
    sqlType: string;
    commentSqlType: string;
};

export type ITypeSize = {
    nativeTypeSize: string;
    sqlTypeSize: string;
}

export abstract class SQLMapper<ResultType> {
    abstract execute(): Promise<ResultType>;

    public supportsType(dataType: string): boolean {
        switch (dataType) {
            default:
                return false;
            case 'bigint':
            case 'bit':
            case 'decimal':
            case 'int':
            case 'money':
            case 'numeric':
            case 'smallint':
            case 'smallmoney':
            case 'tinyint':
            case 'float':
            case 'real':
            case 'date':
            case 'datetime2':
            case 'datetime':
            case 'datetimeoffset':
            case 'smalldatetime':
            case 'time':
            case 'char':
            case 'varchar':
            case 'nchar':
            case 'nvarchar':
            case 'binary':
            case 'varbinary':
            case 'uniqueidentifier':
                return true;
        }
    }

    public mapFromSqlType(dataType: string, size: number, precision: number, scale: number): MappedType {
        // REFERENCE: https://docs.microsoft.com/en-us/sql/t-sql/data-types/data-types-transact-sql?view=sql-server-ver16
        switch (dataType) {
            default:
                throw Error(`Type is not supported: dataType=${dataType}, size=${size}, precision=${precision}, scale=${scale}`);

            /* Exact numerics */
            case 'bigint':
                return { nativeType: 'number', sqlType: `BigInt()`, commentSqlType: `bigint` };
            case 'bit':
                return { nativeType: 'boolean', sqlType: `Bit()`, commentSqlType: `bit` };
            case 'decimal':
                return {
                    nativeType: 'number',
                    sqlType: `Decimal(${precision}, ${scale})`,
                    commentSqlType: `decimal(${precision}, ${scale})`,
                };
            case 'int':
                return { nativeType: 'number', sqlType: `Int()`, commentSqlType: `int` };
            case 'money':
                return { nativeType: 'number', sqlType: `Money()`, commentSqlType: `money` };
            case 'numeric':
                return {
                    nativeType: 'number',
                    sqlType: `Numeric(${precision}, ${scale})`,
                    commentSqlType: `numeric(${precision}, ${scale})`,
                };
            case 'smallint':
                return { nativeType: 'number', sqlType: `SmallInt()`, commentSqlType: `smallint` };
            case 'smallmoney':
                return { nativeType: 'number', sqlType: `SmallMoney()`, commentSqlType: `smallmoney` };
            case 'tinyint':
                return { nativeType: 'number', sqlType: `TinyInt()`, commentSqlType: `tinyint` };

            /* Approximate numerics */
            case 'float': {
                const sizes = this.cleanSqlTypeSize(size);
                return { nativeType: 'number', sqlType: `Float()`, commentSqlType: `float(${sizes.sqlTypeSize})` };
            }
            case 'real': {
                const sizes = this.cleanSqlTypeSize(size);
                return { nativeType: 'number', sqlType: `Real()`, commentSqlType: `real(${sizes.sqlTypeSize})` };
            }

            /* Date and time */
            case 'date':
                return { nativeType: 'Date', sqlType: `Date()`, commentSqlType: `date` };
            case 'datetime2':
                return { nativeType: 'Date', sqlType: `DateTime2()`, commentSqlType: `datetime2` };
            case 'datetime':
                return { nativeType: 'Date', sqlType: `DateTime()`, commentSqlType: `datetime` };
            case 'datetimeoffset':
                return { nativeType: 'number', sqlType: `DateTimeOffset(${scale})`, commentSqlType: `datetimeoffset(${scale})` };
            case 'smalldatetime':
                return { nativeType: 'Date', sqlType: `SmallDateTime()`, commentSqlType: `smalldatetime` };
            // TODO: Check whether the SQL `time` type works with the native `Date` type or not.
            case 'time':
                return { nativeType: 'Date', sqlType: `Time(${scale})`, commentSqlType: `time(${scale})` };

            /* Character strings */
            case 'char': {
                const sizes = this.cleanSqlTypeSize(size);
                return { nativeType: 'string', sqlType: `Char(${sizes.nativeTypeSize})`, commentSqlType: `char(${sizes.sqlTypeSize})` };
            }
            // case 'text': // Will be removed in a future version of SQL Server
            case 'varchar': {
                const sizes = this.cleanSqlTypeSize(size);
                return { nativeType: 'string', sqlType: `VarChar(${sizes.nativeTypeSize})`, commentSqlType: `varchar(${sizes.sqlTypeSize})` };
            }

            /* Unicode character strings */
            case 'nchar': {
                const sizes = this.cleanSqlUnicodeTypeSize(size);
                return { nativeType: 'string', sqlType: `NChar(${sizes.nativeTypeSize})`, commentSqlType: `nchar(${sizes.sqlTypeSize})` };
            }
            // case 'ntext': // Will be removed in a future version of SQL Server
            case 'nvarchar': {
                const sizes = this.cleanSqlUnicodeTypeSize(size);
                return { nativeType: 'string', sqlType: `NVarChar(${sizes.nativeTypeSize})`, commentSqlType: `nvarchar(${sizes.sqlTypeSize})` };
            }

            /* Binary strings */
            case 'binary': {
                const sizes = this.cleanSqlTypeSize(size);
                return { nativeType: 'Buffer', sqlType: `Binary()`, commentSqlType: `binary(${sizes.sqlTypeSize})` };
            }
            // case 'image': // Will be removed in a future version of SQL Server
            case 'varbinary': {
                const sizes = this.cleanSqlTypeSize(size);
                return { nativeType: 'Buffer', sqlType: `VarBinary(${sizes.nativeTypeSize})`, commentSqlType: `varbinary(${sizes.sqlTypeSize})` };
            }

            /* Other data types */
            // case 'cursor': // Do we need this?
            // case 'hierarchyid': // Do we need this?
            // case 'sql_variant': // Do we need this?
            // Spatial Geometry Types -- we don't use it.
            // case 'table': // Do we need this?
            // case 'rowversion': // Do we need this?
            case 'uniqueidentifier':
                return { nativeType: 'string', sqlType: `UniqueIdentifier()`, commentSqlType: `uniqueidentifier` };
            // case 'xml': // Do we need this?
            // Spatial Geography Types -- we don't use it.
        }
    }

    /**
     * Helps converting sizes of SQL types.
     *
     * @param paramSize The size to be converted.
     * @returns The converted size.
     */
    public cleanSqlTypeSize(paramSize: number): ITypeSize {
        switch (paramSize) {
            case -1: // -1 is equal to max size
                return {
                    nativeTypeSize: '',
                    sqlTypeSize: 'max',
                }
            default:
                return {
                    nativeTypeSize: String(paramSize),
                    sqlTypeSize: String(paramSize),
                }
        }
    }

    /**
     * Helps converting sizes of SQL Unicode types.
     *
     * Quoting the docs:
     * > A common misconception is to think that NCHAR(n) and NVARCHAR(n), the n defines the number of characters.
     * > But in NCHAR(n) and NVARCHAR(n) the n defines the string length in byte-pairs (0-4,000).
     * > n never defines numbers of characters that can be stored. This is similar to the definition of CHAR(n) and VARCHAR(n).
     * REFERENCE: https://docs.microsoft.com/en-us/sql/t-sql/data-types/nchar-and-nvarchar-transact-sql?view=sql-server-ver16#remarks
     *
     * @param paramSize The size to be converted.
     * @returns The converted size.
     */
    public cleanSqlUnicodeTypeSize(paramSize: number): ITypeSize {
        switch (paramSize) {
            case -1: // -1 is equal to max size
                return {
                    nativeTypeSize: '',
                    sqlTypeSize: 'max',
                }
            default:
                return {
                    nativeTypeSize: String(paramSize / 2),
                    sqlTypeSize: String(paramSize / 2),
                }
        }
    }
}
