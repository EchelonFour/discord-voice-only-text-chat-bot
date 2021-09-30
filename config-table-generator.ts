// eslint-disable-next-line import/no-extraneous-dependencies -- its cool, this is a dev only file
import { markdownTable } from 'markdown-table'
import config from './src/config.js'

export function configSchemaAsTable(): string {
  const schema = config.getSchema() as any
  const configValuesInTables = Object.keys(schema._cvtProperties).map((key) => {
    const propertySchema = schema._cvtProperties[key]
    const format = `${propertySchema.format}${propertySchema.nullable ? ' (nullable)' : ''}`
    return [key, propertySchema.env, propertySchema.doc, format, propertySchema.default] as string[]
  })
  return markdownTable([['Field', 'Environment', 'Description', 'Format', 'Default'], ...configValuesInTables], {
    padding: false,
    alignDelimiters: false,
  })
}

console.log(configSchemaAsTable())
