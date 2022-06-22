import { Datasource } from '@src/generators/app/impl/mssql/connector/datasource';
import { IGeneratorImpl, IGeneratorImplOptions } from '@src/shared/i-generator-impl';
import Generator from 'yeoman-generator';
import globalPoolManager from "./connector/pool-manager";
import { IStoredProcedureParametersOutput, StoredProcedureParametersMapper } from './parameters-mapper';
import { StoredProceduresMapper } from './procedures-mapper';
import { IStoredProcedureResultsOutput, StoredProcedureResultsMapper } from './results-mapper';

type InspectedStoredProcedure = {
    procedureName: string;
    parameters: IStoredProcedureParametersOutput;
    results: IStoredProcedureResultsOutput;
};

export class MSSQLImpl<GeneratorType extends Generator> implements IGeneratorImpl {
    readonly _generator: GeneratorType;
    readonly _db: Datasource;

    constructor(rootGenerator: GeneratorType, dbConnectionString: string) {
        this._generator = rootGenerator;
        this._db = new Datasource(dbConnectionString);
    }

    public async generate(options: IGeneratorImplOptions): Promise<void> {
        const sp_mapper = new StoredProceduresMapper(this._db);
        const procedures = await sp_mapper.execute();
        if (procedures == null) {
            return;
        }

        const procedureNames = procedures.map((p) => p.name);

        const inspections: Array<InspectedStoredProcedure> = Array(procedureNames.length);
        for (const procedureName of procedureNames) {
            console.debug(`Inpecting ${procedureName}`);
            const inspection = await this._inspectProcedure(procedureName);
            inspections.push(inspection);
        }

        for (const inspection of inspections) {
            await this._generateCodeForRepoImpl(inspection);
        }

        await this._generateCodeForIndex(procedureNames);
    }

    public async shutdown(): Promise<void> {
        await globalPoolManager.closeAll();
    }

    private async _inspectProcedure(procedureName: string): Promise<InspectedStoredProcedure> {
        if (!procedureName) {
            return null;
        }

        const sp_param_mapper = new StoredProcedureParametersMapper(this._db, procedureName);
        const sp_results_mapper = new StoredProcedureResultsMapper(this._db, procedureName);

        const parameters = await sp_param_mapper.execute();
        if (parameters == null) {
            return;
        }

        const results = await sp_results_mapper.execute();
        if (results == null) {
            return;
        }

        return {
            procedureName,
            parameters: parameters,
            results: results,
        };
    }

    private async _generateCodeForRepoImpl(inspection: InspectedStoredProcedure): Promise<void> {
        if (!inspection) {
            return;
        }

        const { procedureName, parameters, results } = inspection;

        const input_template = 'stored-procedure-repo.ts.ejs';
        const output_file = `generated/impl/${procedureName}.ts`;
        const template_vars: ejs.Data = {
            data: {
                procedure: {
                    name: procedureName,
                    parameters: parameters,
                    result: results,
                },
            },
        };

        this._generator.fs.copyTpl(
            this._generator.templatePath(input_template),
            this._generator.destinationPath(output_file),
            template_vars,
        );
    }

    private async _generateCodeForIndex(procedureNames: Array<string>): Promise<void> {
        if (!procedureNames) {
            return;
        }

        const input_template = 'stored-procedure-index.ts.ejs';
        const output_file = `generated/index.ts`;
        const template_vars: ejs.Data = {
            data: {
                procedureNames,
            },
        };

        this._generator.fs.copyTpl(
            this._generator.templatePath(input_template),
            this._generator.destinationPath(output_file),
            template_vars,
        );
    }
}
