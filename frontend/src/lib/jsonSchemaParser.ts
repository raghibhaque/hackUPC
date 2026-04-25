/**
 * JSON Schema Parser
 * Parses JSON Schema definitions and converts them to SchemaSync internal format.
 */

import type { Column, Table } from '../types'

interface JSONSchemaProperty {
  type?: string | string[]
  title?: string
  description?: string
  format?: string
  items?: JSONSchemaProperty
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  enum?: unknown[]
  default?: unknown
}

interface JSONSchemaObject {
  $schema?: string
  title?: string
  description?: string
  type: string
  properties: Record<string, JSONSchemaProperty>
  required?: string[]
}

/**
 * Normalize JSON Schema type to SQL type
 */
function mapJSONSchemaTypeToSQL(jsonType: string | string[] | undefined, format?: string): string {
  const types = Array.isArray(jsonType) ? jsonType : [jsonType]
  const primaryType = types[0]?.toLowerCase() || 'string'

  switch (primaryType) {
    case 'string':
      switch (format?.toLowerCase()) {
        case 'date':
          return 'DATE'
        case 'time':
          return 'TIME'
        case 'date-time':
        case 'datetime':
          return 'DATETIME'
        case 'email':
        case 'uri':
        case 'url':
        case 'uuid':
          return 'VARCHAR(255)'
        default:
          return 'TEXT'
      }
    case 'integer':
      return 'INT'
    case 'number':
      return 'DECIMAL(10,2)'
    case 'boolean':
      return 'BOOLEAN'
    case 'array':
      return 'JSON'
    case 'object':
      return 'JSON'
    case 'null':
      return 'VARCHAR(255)'
    default:
      return 'TEXT'
  }
}

/**
 * Parse a JSON object as a table schema
 */
function parseJSONSchemaObject(schema: JSONSchemaObject, tableName?: string): Table | null {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return null
  }

  const name = tableName || schema.title || 'UnnamedTable'

  const columns: Column[] = Object.entries(schema.properties)
    .map(([propName, propDef]) => ({
      name: propName,
      data_type: {
        base_type: mapJSONSchemaTypeToSQL(propDef.type, propDef.format),
      },
    }))

  return {
    name,
    columns,
  }
}

/**
 * Parse entire JSON Schema content (can be an object or array of objects)
 */
export function parseJSONSchema(schemaContent: string): Table[] {
  try {
    const parsed = JSON.parse(schemaContent)
    const tables: Table[] = []

    if (Array.isArray(parsed)) {
      // Array of schemas
      for (const item of parsed) {
        if (item.properties) {
          const table = parseJSONSchemaObject(item)
          if (table) tables.push(table)
        }
      }
    } else if (parsed.properties) {
      // Single schema object
      const table = parseJSONSchemaObject(parsed)
      if (table) tables.push(table)
    } else if (typeof parsed === 'object') {
      // Object where each key is a table definition
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'object' && value !== null && 'properties' in value) {
          const table = parseJSONSchemaObject(value as JSONSchemaObject, key)
          if (table) tables.push(table)
        }
      }
    }

    return tables
  } catch (err) {
    throw new Error(`Failed to parse JSON Schema: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

/**
 * Validate JSON Schema syntax
 */
export function validateJSONSchema(schemaContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    const parsed = JSON.parse(schemaContent)

    // Check for required structure
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        errors.push('Schema array is empty')
      }
      for (let i = 0; i < parsed.length; i++) {
        if (typeof parsed[i] !== 'object' || parsed[i] === null) {
          errors.push(`Item at index ${i} is not an object`)
        } else if (!parsed[i].properties) {
          errors.push(`Schema at index ${i} missing "properties" field`)
        }
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.properties) {
        // Single schema
        if (Object.keys(parsed.properties).length === 0) {
          errors.push('Schema properties object is empty')
        }
      } else {
        // Object with table definitions
        let foundProperties = false
        for (const value of Object.values(parsed)) {
          if (typeof value === 'object' && value !== null && 'properties' in value) {
            foundProperties = true
            break
          }
        }
        if (!foundProperties) {
          errors.push('No schemas with "properties" field found')
        }
      }
    } else {
      errors.push('Schema must be an object or array')
    }
  } catch (err) {
    errors.push(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get example JSON Schema for user reference
 */
export function getJSONSchemaExample(): string {
  return JSON.stringify(
    {
      Users: {
        type: 'object',
        title: 'Users',
        properties: {
          id: {
            type: 'integer',
            title: 'User ID',
            description: 'Unique identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            title: 'Email Address',
          },
          name: {
            type: 'string',
            title: 'Full Name',
          },
          age: {
            type: 'integer',
            title: 'Age',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            title: 'Created At',
          },
        },
        required: ['id', 'email', 'name'],
      },
      Posts: {
        type: 'object',
        title: 'Posts',
        properties: {
          id: {
            type: 'integer',
          },
          title: {
            type: 'string',
          },
          content: {
            type: 'string',
          },
          author_id: {
            type: 'integer',
            description: 'Reference to Users.id',
          },
          published: {
            type: 'boolean',
            default: false,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'title', 'author_id'],
      },
    },
    null,
    2
  )
}
