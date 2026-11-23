export type Status = 'within range' | 'below range' | 'above range' | 'review'

export type Parameter = {
  name: string
  canonicalName: string
  value: number
  unit: string
  low?: number
  high?: number
  status: Status
  confidence: number
  explanation: string
}

export type Report = {
  id: string
  type: string
  laboratory: string
  date: string
  dateLabel: string
  quality: 'Excellent' | 'Good' | 'Review suggested'
  qualityNote: string
  summary: string
  keyFinding: string
  parameters: Parameter[]
  isDemo?: boolean
}

const parameterInfo: Record<string, Omit<Parameter, 'value' | 'status' | 'confidence'>> = {
  HbA1c: {
    name: 'HbA1c', canonicalName: 'hba1c', unit: '%', low: 4, high: 5.6,
    explanation: 'HbA1c reflects your average blood sugar level over roughly the last two to three months.',
  },
  Hemoglobin: {
    name: 'Hemoglobin', canonicalName: 'hemoglobin', unit: 'g/dL', low: 12, high: 15.5,
    explanation: 'Hemoglobin is a protein in red blood cells that helps carry oxygen through the body.',
  },
  LDL: {
    name: 'LDL cholesterol', canonicalName: 'ldl', unit: 'mg/dL', low: 0, high: 100,
    explanation: 'LDL is one type of cholesterol. Reference targets can depend on your wider health context.',
  },
  VitaminD: {
    name: 'Vitamin D', canonicalName: 'vitamin d', unit: 'ng/mL', low: 30, high: 100,
    explanation: 'Vitamin D supports bone health and several other body functions. Laboratories may use different ranges.',
  },
  TSH: {
    name: 'TSH', canonicalName: 'tsh', unit: 'mIU/L', low: 0.4, high: 4,
    explanation: 'TSH is a hormone commonly measured when assessing thyroid function. It is interpreted with your clinical context.',
  },
}

const entry = (key: keyof typeof parameterInfo, value: number, status: Status): Parameter => ({
  ...parameterInfo[key], value, status, confidence: 0.98,
})

export const initialReports: Report[] = [
  {
    id: 'aug-2026', type: 'Comprehensive blood panel', laboratory: 'Aster Diagnostics', date: '2026-08-12', dateLabel: '12 Aug 2026',
    quality: 'Excellent', qualityNote: 'All report values were read clearly.',
    summary: 'Most results are stable. HbA1c and LDL are above this laboratory’s reference range, while vitamin D remains below range.',
    keyFinding: 'Three results are worth reviewing in your next healthcare conversation.',
    parameters: [entry('HbA1c', 6.4, 'above range'), entry('Hemoglobin', 11.9, 'below range'), entry('LDL', 121, 'above range'), entry('VitaminD', 27, 'below range'), entry('TSH', 2.1, 'within range')],
    isDemo: true,
  },
  {
    id: 'may-2026', type: 'Routine blood work', laboratory: 'Aster Diagnostics', date: '2026-05-02', dateLabel: '02 May 2026',
    quality: 'Excellent', qualityNote: 'All report values were read clearly.',
    summary: 'Vitamin D has improved since January. LDL and HbA1c were still above the laboratory reference range.',
    keyFinding: 'Two results were outside the reference range.',
    parameters: [entry('HbA1c', 5.8, 'above range'), entry('Hemoglobin', 12.3, 'within range'), entry('LDL', 142, 'above range'), entry('VitaminD', 21, 'below range'), entry('TSH', 2.3, 'within range')],
    isDemo: true,
  },
  {
    id: 'jan-2026', type: 'Annual wellness panel', laboratory: 'Aster Diagnostics', date: '2026-01-14', dateLabel: '14 Jan 2026',
    quality: 'Good', qualityNote: 'One page had minor scan noise; values were confirmed.',
    summary: 'Vitamin D and LDL were outside this laboratory’s reference range. Other shown results were within range.',
    keyFinding: 'This is the first report in your current timeline.',
    parameters: [entry('HbA1c', 5.6, 'within range'), entry('Hemoglobin', 12.2, 'within range'), entry('LDL', 151, 'above range'), entry('VitaminD', 18, 'below range'), entry('TSH', 2.2, 'within range')],
    isDemo: true,
  },
]

export const doctorQuestions = [
  { tag: 'HbA1c', text: 'What could explain the change in HbA1c between my recent reports?' },
  { tag: 'LDL cholesterol', text: 'How should my LDL result be interpreted alongside my other health information?' },
  { tag: 'Vitamin D', text: 'Should my vitamin D result be monitored again, and when?' },
]

export function getParameter(report: Report, canonicalName: string) {
  return report.parameters.find((item) => item.canonicalName === canonicalName)
}

