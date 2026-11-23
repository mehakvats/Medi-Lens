import type { Parameter, Report, Status } from './data'

type Definition = {
  name: string
  canonicalName: string
  unit: string
  low?: number
  high?: number
  expression: RegExp
  explanation: string
}

const definitions: Definition[] = [
  {
    name: 'HbA1c', canonicalName: 'hba1c', unit: '%', low: 4, high: 5.6,
    expression: /(?:hba1c|hb\s*a1c|glycated\s+(?:ha?emoglobin|hb))\s*[:\-]?\s*(\d{1,2}(?:[.,]\d{1,2})?)/i,
    explanation: 'HbA1c reflects your average blood sugar level over roughly the last two to three months.',
  },
  {
    name: 'Hemoglobin', canonicalName: 'hemoglobin', unit: 'g/dL', low: 12, high: 15.5,
    expression: /(?:(?:ha?emoglobin)|(?:\bhgb\b)|(?:\bhb\b))\s*[:\-]?\s*(\d{1,2}(?:[.,]\d{1,2})?)/i,
    explanation: 'Hemoglobin is a protein in red blood cells that helps carry oxygen through the body.',
  },
  {
    name: 'LDL cholesterol', canonicalName: 'ldl', unit: 'mg/dL', low: 0, high: 100,
    expression: /(?:ldl(?:\s+cholesterol)?)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{1,2})?)/i,
    explanation: 'LDL is one type of cholesterol. Reference targets can depend on your wider health context.',
  },
  {
    name: 'Vitamin D', canonicalName: 'vitamin d', unit: 'ng/mL', low: 30, high: 100,
    expression: /(?:vitamin\s*d(?:\s*(?:25[- ]?oh))?)\s*[:\-]?\s*(\d{1,3}(?:[.,]\d{1,2})?)/i,
    explanation: 'Vitamin D supports bone health and several other body functions. Laboratories may use different ranges.',
  },
  {
    name: 'TSH', canonicalName: 'tsh', unit: 'mIU/L', low: 0.4, high: 4,
    expression: /(?:\btsh\b|thyroid\s+stimulating\s+hormone)\s*[:\-]?\s*(\d{1,2}(?:[.,]\d{1,2})?)/i,
    explanation: 'TSH is a hormone commonly measured when assessing thyroid function. It is interpreted with your clinical context.',
  },
]

function statusFor(value: number, definition: Definition): Status {
  if (definition.low !== undefined && value < definition.low) return 'below range'
  if (definition.high !== undefined && value > definition.high) return 'above range'
  return 'within range'
}

function readableDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(date)
    .replace(',', '')
}

export type ExtractionProgress = { stage: 'reading' | 'extracting'; progress: number }

export async function extractReportFromImage(
  file: File,
  onProgress: (update: ExtractionProgress) => void,
): Promise<Report> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress({ stage: 'reading', progress: Math.round((message.progress || 0) * 100) })
    },
  })

  try {
    const { data } = await worker.recognize(file)
    onProgress({ stage: 'extracting', progress: 100 })
    const normalized = data.text.replace(/\s+/g, ' ').trim()
    const parameters: Parameter[] = definitions.flatMap((definition) => {
      const match = normalized.match(definition.expression)
      if (!match) return []
      const value = Number(match[1].replace(',', '.'))
      if (!Number.isFinite(value)) return []
      return [{
        name: definition.name,
        canonicalName: definition.canonicalName,
        value,
        unit: definition.unit,
        low: definition.low,
        high: definition.high,
        status: statusFor(value, definition),
        confidence: Math.max(.55, Math.min(.94, data.confidence / 100)),
        explanation: definition.explanation,
      }]
    })

    if (parameters.length === 0) {
      throw new Error('We read the image, but could not confidently find common lab values. Try a clearer, straight-on photo with the result name and number visible.')
    }

    const outsideRange = parameters.filter((parameter) => parameter.status !== 'within range')
    const summary = outsideRange.length
      ? `${parameters.length} common lab values were found locally in this image. ${outsideRange.length} are outside the default reference ranges shown here and may be worth discussing with a healthcare professional.`
      : `${parameters.length} common lab values were found locally in this image. The extracted values are within the default reference ranges shown here.`
    const today = new Date()
    return {
      id: `local-ocr-${Date.now()}`,
      type: file.name.replace(/\.[^.]+$/, '') || 'Lab report image',
      laboratory: 'Uploaded image',
      date: today.toISOString().slice(0, 10),
      dateLabel: readableDate(today),
      quality: data.confidence >= 80 ? 'Excellent' : 'Good',
      qualityNote: `OCR confidence ${Math.round(data.confidence)}%. Review each extracted value against your original report.`,
      summary,
      keyFinding: outsideRange.length ? `${outsideRange.length} extracted result${outsideRange.length === 1 ? '' : 's'} outside the default reference range.` : 'Extracted results are within the default reference ranges.',
      parameters,
      isDemo: false,
    }
  } finally {
    await worker.terminate()
  }
}

