import { useMemo } from 'react'

export interface TypeConversion {
  fromType: string
  toType: string
  functions: ConversionFunction[]
  riskLevel: 'low' | 'medium' | 'high'
  dataLossWarning?: string
  example?: { source: string; result: string }
}

export interface ConversionFunction {
  name: string
  syntax: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  example?: string
  dataLoss?: string
}

const CONVERSION_LIBRARY: Record<string, Record<string, ConversionFunction[]>> = {
  'VARCHAR': {
    'INT': [
      {
        name: 'CAST',
        syntax: 'CAST(column AS INT)',
        description: 'Direct type casting. Fails if non-numeric values exist.',
        riskLevel: 'high',
        example: 'CAST("age" AS INT) → 25',
        dataLoss: 'Non-numeric strings will cause errors',
      },
      {
        name: 'CONVERT (SQL Server)',
        syntax: 'CONVERT(INT, column)',
        description: 'SQL Server specific conversion with style parameter.',
        riskLevel: 'medium',
        example: 'CONVERT(INT, "123")',
      },
    ],
    'FLOAT': [
      {
        name: 'CAST',
        syntax: 'CAST(column AS FLOAT)',
        description: 'Convert to floating point number.',
        riskLevel: 'medium',
        example: 'CAST("price" AS FLOAT) → 19.99',
      },
    ],
    'DATE': [
      {
        name: 'STR_TO_DATE (MySQL)',
        syntax: "STR_TO_DATE(column, '%Y-%m-%d')",
        description: 'Parse string to date with format specifier.',
        riskLevel: 'high',
        example: "STR_TO_DATE('2024-01-15', '%Y-%m-%d')",
        dataLoss: 'Invalid date formats will result in NULL',
      },
      {
        name: 'TO_DATE (Oracle)',
        syntax: "TO_DATE(column, 'YYYY-MM-DD')",
        description: 'Oracle date parsing function.',
        riskLevel: 'high',
        example: "TO_DATE('2024-01-15', 'YYYY-MM-DD')",
      },
    ],
    'TIMESTAMP': [
      {
        name: 'STR_TO_DATE (MySQL)',
        syntax: "STR_TO_DATE(column, '%Y-%m-%d %H:%i:%s')",
        description: 'Parse string to timestamp with format.',
        riskLevel: 'high',
        example: "STR_TO_DATE('2024-01-15 10:30:00', '%Y-%m-%d %H:%i:%s')",
      },
    ],
    'BOOLEAN': [
      {
        name: 'CASE WHEN',
        syntax: "CASE WHEN column IN ('true', 'yes', '1') THEN TRUE ELSE FALSE END",
        description: 'Map string values to boolean.',
        riskLevel: 'medium',
        example: "CASE WHEN status='active' THEN 1 ELSE 0 END",
      },
    ],
  },
  'INT': {
    'VARCHAR': [
      {
        name: 'CAST',
        syntax: 'CAST(column AS VARCHAR)',
        description: 'Safe conversion. No data loss.',
        riskLevel: 'low',
        example: 'CAST(42 AS VARCHAR) → "42"',
      },
    ],
    'FLOAT': [
      {
        name: 'CAST',
        syntax: 'CAST(column AS FLOAT)',
        description: 'Promotes integer to float. No data loss.',
        riskLevel: 'low',
        example: 'CAST(42 AS FLOAT) → 42.0',
      },
    ],
    'DATE': [
      {
        name: 'FROM_UNIXTIME',
        syntax: 'FROM_UNIXTIME(column)',
        description: 'Convert Unix timestamp to date.',
        riskLevel: 'low',
        example: 'FROM_UNIXTIME(1705315200) → 2024-01-15',
      },
    ],
  },
  'TIMESTAMP': {
    'DATE': [
      {
        name: 'CAST or DATE()',
        syntax: 'CAST(column AS DATE) or DATE(column)',
        description: 'Extract date part, dropping time.',
        riskLevel: 'low',
        example: 'DATE("2024-01-15 10:30:00") → 2024-01-15',
        dataLoss: 'Time component is discarded',
      },
    ],
    'VARCHAR': [
      {
        name: 'CAST',
        syntax: 'CAST(column AS VARCHAR)',
        description: 'Convert timestamp to string representation.',
        riskLevel: 'low',
        example: 'CAST("2024-01-15 10:30:00" AS VARCHAR)',
      },
    ],
  },
  'DATE': {
    'VARCHAR': [
      {
        name: 'CAST',
        syntax: 'CAST(column AS VARCHAR)',
        description: 'Convert date to ISO format string.',
        riskLevel: 'low',
        example: 'CAST("2024-01-15" AS VARCHAR) → "2024-01-15"',
      },
    ],
    'TIMESTAMP': [
      {
        name: 'CAST',
        syntax: 'CAST(column AS TIMESTAMP)',
        description: 'Add time component (00:00:00).',
        riskLevel: 'low',
        example: 'CAST("2024-01-15" AS TIMESTAMP) → 2024-01-15 00:00:00',
      },
    ],
  },
}

export function useTypeConversions(fromType?: string, toType?: string) {
  const conversions = useMemo(() => {
    if (!fromType || !toType || fromType === toType) return null

    const normalized_from = normalizeType(fromType)
    const normalized_to = normalizeType(toType)

    const functions = CONVERSION_LIBRARY[normalized_from]?.[normalized_to]
    if (!functions) return null

    const riskLevel = calculateRiskLevel(functions)
    const dataLossWarning = checkDataLoss(normalized_from, normalized_to)

    return {
      fromType: normalized_from,
      toType: normalized_to,
      functions,
      riskLevel,
      dataLossWarning,
    } as TypeConversion
  }, [fromType, toType])

  return conversions
}

function normalizeType(type: string): string {
  const base = type.toLowerCase().split('(')[0].trim()
  return base.charAt(0).toUpperCase() + base.slice(1)
}

function calculateRiskLevel(functions: ConversionFunction[]): 'low' | 'medium' | 'high' {
  if (functions.some(f => f.riskLevel === 'high')) return 'high'
  if (functions.some(f => f.riskLevel === 'medium')) return 'medium'
  return 'low'
}

function checkDataLoss(from: string, to: string): string | undefined {
  const dataLossMap: Record<string, Record<string, string>> = {
    'TIMESTAMP': {
      'DATE': 'Time component will be lost',
      'VARCHAR': 'Conversion may lose precision depending on format',
    },
    'FLOAT': {
      'INT': 'Decimal values will be truncated',
    },
    'VARCHAR': {
      'INT': 'Non-numeric strings will cause conversion errors',
      'DATE': 'Invalid date formats will result in NULL',
    },
  }

  return dataLossMap[from]?.[to]
}

export function getConversionRiskColor(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low':
      return 'text-emerald-300'
    case 'medium':
      return 'text-amber-300'
    case 'high':
      return 'text-rose-300'
  }
}

export function getConversionRiskBg(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low':
      return 'bg-emerald-500/10 border-emerald-500/30'
    case 'medium':
      return 'bg-amber-500/10 border-amber-500/30'
    case 'high':
      return 'bg-rose-500/10 border-rose-500/30'
  }
}
