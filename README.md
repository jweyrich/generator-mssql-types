# generator-mssql-types

[![npm version](https://badge.fury.io/js/generator-mssql-types.svg)](https://badge.fury.io/js/generator-mssql-types) [![Build Status](https://travis-ci.org/jweyrich/generator-mssql-types.svg?branch=master)](https://travis-ci.org/jweyrich/generator-mssql-types)

A Yeoman code generator that inspects your Stored Procedures and generates strongly typed TypeScript code for them.
Currently supports only Microsoft SQL Server.
You can customize the templates according to your needs. See [templates](src/generators/app/templates/) for references.

## What it does

See the description above :-)

## How to install

```sh
yarn global add yo generator-mssql-types
# or
npm install -g yo generator-mssql-types
```

## How to run

You have 2 options to run the generator.

### 1. Run using an `.env` file

Have an `.env` file containing the following:

```bash
DB_CONNECTION_STRING=mssql://username:password@localhost/DATABASE_NAME
```
Then just run:

```bash
yo mssql-types
```

### 2. Run manually specifying environment variables

```bash
DB_CONNECTION_STRING=mssql://username:password@localhost/DATABASE_NAME yo mssql-types
```
## Arguments & Options

Here's the `--help` output:

```bash
Usage:
  yo mssql-types:app [<templatesDirectory>] [options]

Options:
  -h,   --help           # Print the generator's options and usage
        --skip-cache     # Do not remember prompt answers               Default: false
        --skip-install   # Do not automatically install dependencies    Default: false
        --force-install  # Fail on install dependencies error           Default: false
        --ask-answered   # Show prompts for already configured options  Default: false

Arguments:
  templatesDirectory    Type: String  Required: false
```

### templatesDirectory

You can specify an alternative template directory. Example:

```bash
yo mssql-types ./my-templates
```

## TODO

- Discover whether a stored procedure parameter has a default value or not. It's currently not possible without parsing the procedure definition. For more information see https://docs.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-parameters-transact-sql?view=sql-server-ver16
