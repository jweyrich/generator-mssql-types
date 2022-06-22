import { IGeneratorImpl } from '@src/shared/i-generator-impl';
import 'dotenv/config'; // To load the .env file.
import * as path from 'path';
import * as fs from 'fs';
import Generator from 'yeoman-generator';
import { MSSQLImpl } from './impl/mssql';

const { DB_CONNECTION_STRING } = process.env;

type ThisGeneratorOptions = {
    moduleName: string;
    templatesDirectory: string;
};

class ThisGenerator extends Generator<ThisGeneratorOptions> {
    readonly _implementations: Array<IGeneratorImpl>;
    private _templatesDirectory: string;

    constructor(args, opts) {
        super(args, opts);

        this.argument('templatesDirectory', { type: String, required: false, default: null });

        this._implementations = [
            new MSSQLImpl(this, DB_CONNECTION_STRING)
        ];
    }

    public async initializing(): Promise<void> {
        this._templatesDirectory = this.sourceRoot();

        if (this.options.templatesDirectory) {
            this._templatesDirectory = this.options.templatesDirectory;
            // Override the default templates directory with the specified one.
            this.sourceRoot = (rootPath?: string): string => {
                return this._templatesDirectory;
            }
        }

        // Check whether the provided path exists and that this process can read it.
        // If it does not, it will throw an ENOENT.
        fs.accessSync(this._templatesDirectory, fs.constants.R_OK);

        // Check whether the provided path is a directory.
        if (!fs.lstatSync(this._templatesDirectory).isDirectory()) {
            this.log(`ENOTDIR: not a directory: ${this._templatesDirectory}`);
            process.exit(20); // 20 = ENOTDIR
        }

        const relativeTemplatesPath = path.relative(process.cwd(), this._templatesDirectory);
        this.log(`Using templates from ${relativeTemplatesPath}`);
    }

    public prompting(): void {
        //this.log('Prompting...');
    }

    public configuring(): void {
        //this.log('Configuring...');
    }

    public default(): void {
        //this.log('Default.');
    }

    public async writing(): Promise<void> {
        this.log('Generating...');
        for (const impl of this._implementations) {
            await impl.generate();
        }
    }

    public conflicts(): void {
        this.log('No conflicts.');
    }

    public install(): void {
        this.log('Nothing to install.');
    }

    public async end(): Promise<void> {
        for (const impl of this._implementations) {
            await impl.shutdown();
        }
    }
}

module.exports = ThisGenerator;
