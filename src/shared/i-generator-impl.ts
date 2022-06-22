export interface IGeneratorImplOptions {
    [name: string]: any;
}

export interface IGeneratorImpl {
    generate(options?: IGeneratorImplOptions): Promise<void>;
    shutdown(): Promise<void>;
}
