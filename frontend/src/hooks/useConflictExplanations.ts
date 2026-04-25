import { useMemo } from 'react'

export interface ConflictExplanation {
  title: string
  rootCause: string
  severity: 'critical' | 'warning' | 'info'
  recommendations: {
    title: string
    description: string
    confidence: number
    steps: string[]
  }[]
  relatedMappings?: {
    tableName: string
    confidence: number
  }[]
  examples?: {
    before: string
    after: string
  }
}

export interface ConflictData {
  severity?: string
  description?: string
  colAName?: string
  colBName?: string
  colAType?: string
  colBType?: string
  sourceTable?: string
  targetTable?: string
  confidence?: number
  alternativeMatches?: { name: string; confidence: number }[]
}

export function useConflictExplanations(conflict: ConflictData): ConflictExplanation | null {
  return useMemo(() => {
    if (!conflict) return null

    const severity = (conflict.severity || 'warning').toLowerCase() as 'critical' | 'warning' | 'info'
    const description = conflict.description || ''

    // Analyze type mismatches
    if (conflict.colAType && conflict.colBType && conflict.colAType !== conflict.colBType) {
      return generateTypeConflictExplanation(conflict, severity)
    }

    // Analyze name mismatches
    if (conflict.colAName && conflict.colBName && conflict.colAName !== conflict.colBName) {
      return generateNameConflictExplanation(conflict, severity)
    }

    // Analyze ambiguous mappings
    if (conflict.alternativeMatches && conflict.alternativeMatches.length > 0) {
      return generateAmbiguityConflictExplanation(conflict, severity)
    }

    // Default explanation
    return {
      title: 'Mapping Conflict Detected',
      rootCause: description || 'The mapping between columns has a potential conflict that requires review.',
      severity: severity,
      recommendations: [
        {
          title: 'Manual Review Required',
          description: 'Carefully review the column mappings to ensure they align with your data model.',
          confidence: 0.8,
          steps: [
            'Compare source and target column properties',
            'Check if the mapping makes semantic sense',
            'Verify data compatibility between columns',
          ],
        },
      ],
    }
  }, [conflict])
}

function generateTypeConflictExplanation(conflict: ConflictData, severity: 'critical' | 'warning' | 'info'): ConflictExplanation {
  const charDiff = Math.abs((conflict.colAType || '').length - (conflict.colBType || '').length)
  const confidence = 1 - Math.min(charDiff / 10, 0.5)

  return {
    title: 'Type Mismatch Conflict',
    rootCause: `Column types are incompatible: ${conflict.colAType} (source) cannot be directly mapped to ${conflict.colBType} (target). This will require type conversion or casting.`,
    severity: severity,
    recommendations: [
      {
        title: 'Apply Type Conversion',
        description: `Use database functions to safely convert ${conflict.colAType} to ${conflict.colBType}. The conversion may result in data loss depending on the conversion method.`,
        confidence: confidence,
        steps: [
          `Identify compatible conversion functions for ${conflict.colAType} → ${conflict.colBType}`,
          'Test conversion on sample data',
          'Document potential data loss scenarios',
          'Apply conversion in migration script',
        ],
      },
      {
        title: 'Review Mapping Semantics',
        description: 'Verify that mapping these columns makes semantic sense despite the type difference. Sometimes type mismatches indicate incorrect column pairing.',
        confidence: 0.7,
        steps: [
          'Review source column purpose and usage',
          'Compare with target column purpose',
          'Check if other columns might be better matches',
        ],
      },
      {
        title: 'Use NULL Handling Strategy',
        description: 'Plan for NULL values and conversion failures in the target system.',
        confidence: 0.8,
        steps: [
          'Define NULL value handling policy',
          'Create error handling for failed conversions',
          'Document fallback values if needed',
        ],
      },
    ],
    examples: {
      before: `${conflict.colAType} column value: "2024-01-15"`,
      after: `${conflict.colBType} converted value: 1705315200 (Unix timestamp) or 2024-01-15 (DATE type)`,
    },
  }
}

function generateNameConflictExplanation(conflict: ConflictData, severity: 'critical' | 'warning' | 'info'): ConflictExplanation {
  const nameSimilarity = calculateStringSimilarity(conflict.colAName || '', conflict.colBName || '')
  const charDiff = Math.abs((conflict.colAName || '').length - (conflict.colBName || '').length)

  let rootCause = `Column names differ between source and target: "${conflict.colAName}" vs "${conflict.colBName}".`
  if (charDiff <= 3 && nameSimilarity > 0.7) {
    rootCause += ' The names are very similar, suggesting this is likely the correct mapping.'
  } else if (charDiff > 5 || nameSimilarity < 0.5) {
    rootCause += ' The significant name difference could indicate an incorrect mapping.'
  }

  return {
    title: 'Column Name Mismatch',
    rootCause,
    severity: severity,
    recommendations: [
      {
        title: 'Accept Despite Name Difference',
        description: 'If semantic analysis confirms this is the correct mapping, accept it despite the name difference. Database migrations often rename columns.',
        confidence: nameSimilarity > 0.6 ? 0.85 : 0.6,
        steps: [
          'Verify column data types are compatible',
          'Check if column semantics match',
          'Confirm this is intentional renaming',
        ],
      },
      {
        title: 'Review Alternative Mappings',
        description: 'Check if other columns might be a better match with more similar names.',
        confidence: 0.7,
        steps: [
          'List all candidate columns in target schema',
          'Compare name similarity scores',
          'Review semantic similarity for alternatives',
        ],
      },
    ],
    relatedMappings: conflict.alternativeMatches?.slice(0, 2).map(m => ({
      tableName: m.name,
      confidence: m.confidence,
    })),
  }
}

function generateAmbiguityConflictExplanation(conflict: ConflictData, severity: 'critical' | 'warning' | 'info'): ConflictExplanation {
  const topAlternative = (conflict.alternativeMatches || [])[0]
  const highConfidenceAlternatives = (conflict.alternativeMatches || []).filter(m => m.confidence > 0.85)

  return {
    title: 'Ambiguous Mapping',
    rootCause: `Multiple columns match with high confidence (>0.85). The system cannot automatically determine the correct mapping. Found ${conflict.alternativeMatches?.length || 0} potential matches.`,
    severity: severity,
    recommendations: [
      {
        title: 'Review All Candidates',
        description: `You have ${highConfidenceAlternatives.length} high-confidence alternatives to consider. Examine each option carefully.`,
        confidence: 0.9,
        steps: [
          'Compare properties of all candidate columns',
          'Check data samples from each column',
          'Verify semantic meaning for each option',
          'Choose the most appropriate mapping',
        ],
      },
      {
        title: `Confirm Primary Match (${conflict.colBName || 'Unknown'})`,
        description: `The system recommended "${conflict.colBName}" with ${(conflict.confidence || 0).toFixed(2)} confidence. This may be the best choice if other differences are minor.`,
        confidence: conflict.confidence || 0.75,
        steps: [
          'Accept if confidence score and properties look correct',
          'Proceed with migration if satisfied',
        ],
      },
      {
        title: 'Create Custom Mapping Rule',
        description: 'If none of the automatic suggestions are correct, define a custom mapping rule based on your business logic.',
        confidence: 0.8,
        steps: [
          'Document the business rule',
          'Create custom rule in rule manager',
          'Test rule against sample data',
          'Apply to similar conflicts',
        ],
      },
    ],
    relatedMappings: (conflict.alternativeMatches || []).map(m => ({
      tableName: m.name,
      confidence: m.confidence,
    })),
  }
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = getEditDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function getEditDistance(s1: string, s2: string): number {
  const costs = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

export function getConflictSeverityColor(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical':
      return 'text-rose-300'
    case 'warning':
      return 'text-amber-300'
    case 'info':
      return 'text-blue-300'
  }
}

export function getConflictSeverityBg(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500/10 border-rose-500/30'
    case 'warning':
      return 'bg-amber-500/10 border-amber-500/30'
    case 'info':
      return 'bg-blue-500/10 border-blue-500/30'
  }
}
