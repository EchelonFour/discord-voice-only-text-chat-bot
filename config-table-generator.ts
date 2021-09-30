// eslint-disable-next-line import/no-extraneous-dependencies -- its cool, this is a dev only file
import { markdownTable } from 'markdown-table'
import { SchemaObj } from 'convict'
import config from './src/config.js'

export function configSchemaAsTable(): string {
  const schema = config.getSchema() as unknown as {
    _cvtProperties: {
      [key: string]: SchemaObj<string>
    }
  }
  const configValuesInTables = Object.entries(schema._cvtProperties).map(([key, propertySchema]) => {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const format = `${propertySchema.format}${propertySchema.nullable ? ' (nullable)' : ''}`
    return [key, propertySchema.env, propertySchema.doc, format, propertySchema.default] as string[]
  })
  return markdownTable([['Field', 'Environment', 'Description', 'Format', 'Default'], ...configValuesInTables], {
    padding: false,
    alignDelimiters: false,
  })
}

console.log(configSchemaAsTable())
