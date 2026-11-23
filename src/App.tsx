import { Fragment, useEffect, useRef, useState } from 'react'
import { doctorQuestions, getParameter, initialReports, type Parameter, type Report, type Status } from './data'
import { Icons } from './icons'
import { extractReportFromImage } from './reportExtractor'

type Page = 'Overview' | 'Reports' | 'Compare' | 'Trends' | 'Questions' | 'Privacy'
type Screen = 'landing' | 'workspace'

const navItems: { label: Page; icon: keyof typeof Icons }[] = [
  { label: 'Overview', icon: 'grid' },
  { label: 'Reports', icon: 'file' },
  { label: 'Compare', icon: 'compare' },
  { label: 'Trends', icon: 'trend' },
  { label: 'Questions', icon: 'chat' },
]

const statusClass: Record<Status, string> = {
  'within range': 'status--good',
  'below range': 'status--review',
  'above range': 'status--review',
  review: 'status--attention',
}

function Logo({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? 'brand--light' : ''}`}><span className="brand__mark"><i/><i/><i/></span><span>MediLens</span></div>
}

function StatusBadge({ status }: { status: Status }) {
  const label = status === 'within range' ? 'Within range' : status === 'below range' ? 'Below range' : status === 'above range' ? 'Above range' : 'Worth reviewing'
  return <span className={`status ${statusClass[status]}`}><span className="status__dot"/>{label}</span>
}

function ReportTag({ report }: { report: Report }) {
  return <span className="report-tag">{report.isDemo ? 'Demo report' : 'Uploaded report'}</span>
}

function Range({ item }: { item: Parameter }) {
  if (item.low === undefined && item.high === undefined) return <span>Not provided</span>
  if (item.low === 0 || item.low === undefined) return <span>Up to {item.high} {item.unit}</span>
  return <span>{item.low}–{item.high} {item.unit}</span>
}

function MetricValue({ item }: { item: Parameter }) {
  return <span className="metric-value">{item.value}<small>{item.unit}</small></span>
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-state__icon">{icon}</div><h3>{title}</h3><p>{body}</p>{action}</div>
}

function TrendChart({ reports, canonicalName }: { reports: Report[]; canonicalName: string }) {
  const points = reports.slice().sort((a, b) => a.date.localeCompare(b.date)).map((report) => ({
    report,
    parameter: getParameter(report, canonicalName),
  })).filter((entry): entry is { report: Report; parameter: Parameter } => Boolean(entry.parameter))
  const selected = points.at(-1)?.parameter
  if (!selected || points.length < 2) return <EmptyState icon={<Icons.trend size={23}/>} title="A trend needs two results" body="Upload another report containing this parameter to see how it changes over time." />
  const values = points.map((point) => point.parameter.value)
  const lowest = Math.min(...values, selected.low ?? Infinity)
  const highest = Math.max(...values, selected.high ?? -Infinity)
  const pad = Math.max((highest - lowest) * .25, 1)
  const min = Math.max(0, lowest - pad)
  const max = highest + pad
  const scale = (value: number) => 132 - ((value - min) / (max - min || 1)) * 104
  const x = (index: number) => 25 + index * (310 / Math.max(points.length - 1, 1))
  const polyline = points.map((point, index) => `${x(index)},${scale(point.parameter.value)}`).join(' ')
  const bandTop = selected.high ? scale(selected.high) : 132
  const bandBottom = selected.low ? scale(selected.low) : 28
  return <div className="chart-wrap">
    <svg className="trend-chart" viewBox="0 0 360 175" role="img" aria-label={`${selected.name} values over time`}>
      <line x1="25" y1="28" x2="335" y2="28" className="chart-grid"/>
      <line x1="25" y1="80" x2="335" y2="80" className="chart-grid"/>
      <line x1="25" y1="132" x2="335" y2="132" className="chart-grid"/>
      {selected.low !== undefined && selected.high !== undefined && <rect x="25" y={Math.min(bandTop, bandBottom)} width="310" height={Math.abs(bandBottom - bandTop)} className="chart-band"/>}
      <polyline points={polyline} className="chart-line"/>
      {points.map((point, index) => <g key={point.report.id}>
        <circle cx={x(index)} cy={scale(point.parameter.value)} r="4.5" className="chart-dot"/>
        <text x={x(index)} y={scale(point.parameter.value) - 10} textAnchor="middle" className="chart-value">{point.parameter.value}</text>
        <text x={x(index)} y="160" textAnchor="middle" className="chart-date">{point.report.dateLabel.split(' ')[0]} {point.report.dateLabel.split(' ')[1]}</text>
      </g>)}
    </svg>
    <div className="chart-legend"><span><i className="legend-line"/>Your result</span><span><i className="legend-band"/>Laboratory reference range</span></div>
  </div>
}

function UploadDialog({ onClose, onImport }: { onClose: () => void; onImport: (report: Report) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const stages = ['Document received', 'Reading report', 'Extracting parameters', 'Preparing your summary']
  const pickFile = (candidate?: File) => {
    if (!candidate) return
    const supported = ['image/jpeg', 'image/png'].includes(candidate.type)
    if (!supported) { setError('Image reading currently supports JPG, JPEG, and PNG files.'); return }
    if (candidate.size > 10 * 1024 * 1024) { setError('This file is over the 10 MB limit.'); return }
    setError(''); setFile(candidate)
  }
  const beginExtraction = async () => {
    if (!file) return
    setStage(0)
    setError('')
    try {
      setStage(1)
      const report = await extractReportFromImage(file, (update) => {
        setStage(update.stage === 'reading' ? 1 : 2)
        setProgress(update.progress)
      })
      setStage(3)
      onImport(report)
    } catch (reason) {
      setStage(null)
      setError(reason instanceof Error ? reason.message : 'We could not read this image. Try a clearer report photo.')
    }
  }
  return <div className="modal-backdrop" role="presentation"><section className="modal upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
    <button className="icon-button modal__close" onClick={onClose} aria-label="Close upload">{Icons.close()}</button>
    {stage === null ? <>
      <p className="eyebrow">Add a report</p><h2 id="upload-title">Bring your report into focus.</h2>
      <p className="modal__intro">Upload a lab report to add it to this private workspace.</p>
      <div className={`dropzone ${file ? 'dropzone--ready' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); pickFile(event.dataTransfer.files[0]) }}>
        <input ref={inputRef} className="sr-only" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(event) => pickFile(event.target.files?.[0])}/>
        <div className="dropzone__icon">{file ? <Icons.check/> : <Icons.upload/>}</div>
        <strong>{file ? file.name : 'Drop your report here'}</strong>
        <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ready to add` : 'or browse from your device'}</span>
      </div>
      <p className="file-note">JPG, PNG · Max 10 MB</p>
      {error && <p className="form-error"><Icons.alert size={16}/>{error}</p>}
      <div className="modal__footer"><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!file} onClick={beginExtraction}>Read image <Icons.arrow size={17}/></button></div>
      <p className="demo-note"><Icons.lock size={15}/> Your image is processed locally in this browser. It is not uploaded or retained by MediLens.</p>
    </> : <>
      <p className="eyebrow">Reading your image locally</p><h2 id="upload-title">Looking carefully at the report.</h2>
      <div className="processing-list">{stages.map((item, index) => <div className={`processing-step ${index < stage ? 'processing-step--done' : index === stage ? 'processing-step--active' : ''}`} key={item}>
        <span className="processing-step__mark">{index < stage ? <Icons.check size={16}/> : <i/>}</span><span>{item}{index === 1 && stage === 1 ? ` ${progress}%` : ''}</span>{index < stage && <small>Done</small>}
      </div>)}</div>
      <p className="demo-note"><Icons.lock size={15}/> OCR runs in this browser. It may take a moment on the first image while the local language model loads.</p>
    </>}
  </section></div>
}

function DetailDialog({ report, onClose }: { report: Report; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return <div className="modal-backdrop" role="presentation"><section className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
    <button className="icon-button modal__close" onClick={onClose} aria-label="Close report">{Icons.close()}</button>
    <div className="detail-header"><div><p className="eyebrow">{report.laboratory}</p><h2 id="report-title">{report.type}</h2><p>{report.dateLabel} · <ReportTag report={report}/></p></div><span className={`quality quality--${report.quality.toLowerCase().replace(' ', '-')}`}><Icons.check size={15}/>{report.quality} quality</span></div>
    <div className="report-summary"><span className="section-label">Summary</span><p>{report.summary}</p><small>{report.qualityNote}</small></div>
    <div className="table-wrap"><table className="parameter-table"><thead><tr><th>Parameter</th><th>Your result</th><th>Reference range</th><th>Status</th><th/></tr></thead><tbody>
      {report.parameters.map((parameter) => <Fragment key={parameter.canonicalName}>
        <tr className={expanded === parameter.canonicalName ? 'row--expanded' : ''}>
          <td><strong>{parameter.name}</strong><small>Confidence {Math.round(parameter.confidence * 100)}%</small></td><td><MetricValue item={parameter}/></td><td><Range item={parameter}/></td><td><StatusBadge status={parameter.status}/></td><td><button className="icon-button table-expand" onClick={() => setExpanded(expanded === parameter.canonicalName ? null : parameter.canonicalName)} aria-label={`About ${parameter.name}`}>{Icons.chevron({ size: 17 })}</button></td>
        </tr>
        {expanded === parameter.canonicalName && <tr className="parameter-detail"><td colSpan={5}><div><span className="section-label">What this measures</span><p>{parameter.explanation}</p><span className="care-copy">Your result is {parameter.status === 'within range' ? 'within the laboratory reference range shown in this report.' : 'outside the laboratory reference range shown in this report. Consider discussing it with a qualified healthcare professional.'}</span></div></td></tr>}
      </Fragment>)}
    </tbody></table></div>
    <p className="medical-disclaimer"><Icons.info size={15}/> MediLens provides educational information and organization of reports. It does not diagnose conditions or replace professional medical advice.</p>
  </section></div>
}

function Landing({ enter }: { enter: () => void }) {
  return <div className="landing">
    <header className="landing-nav"><Logo/><nav><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a></nav><button className="outline-button" onClick={enter}>Open demo</button></header>
    <main>
      <section className="hero"><div className="hero__copy"><p className="eyebrow">PERSONAL HEALTH INTELLIGENCE</p><h1>Your health reports,<br/><em>finally understandable.</em></h1><p className="hero__lead">MediLens turns complex medical reports into clear explanations, meaningful trends, and questions you can take to your healthcare professional.</p><div className="hero__actions"><button className="primary-button primary-button--large" onClick={enter}>Understand a report <Icons.arrow size={18}/></button><a className="text-link" href="#how-it-works">See how it works <Icons.arrow size={16}/></a></div><p className="hero__footnote"><Icons.shield size={16}/> Built to organise, explain, and keep you in control.</p></div>
      <div className="hero-report" aria-label="Example health report interpretation"><div className="paper-top"><Logo/><span>12 AUG 2026</span></div><div className="paper-title"><div><span className="section-label">LATEST REPORT</span><h3>Blood panel</h3></div><span className="quality quality--excellent"><Icons.check size={14}/> Clear extraction</span></div><p className="paper-copy">Three results are worth reviewing in your next healthcare conversation.</p><div className="paper-metric"><div><span>HbA1c</span><strong>6.4<small>%</small></strong></div><div className="range-track"><span>4.0</span><div><i style={{ left: '55%' }}/></div><span>5.6</span></div><StatusBadge status="above range"/></div><div className="paper-lines"><span/><span/><span/></div><button onClick={enter}>View report details <Icons.arrow size={15}/></button></div></section>
      <section id="how-it-works" className="process"><div><p className="eyebrow">HOW MEDILENS WORKS</p><h2>From paperwork to a clearer health story.</h2></div><div className="process-grid"><article><span>01</span><h3>Add your report</h3><p>Bring in a PDF or image from your lab, on any device.</p></article><article><span>02</span><h3>See the structure</h3><p>Results are organised alongside the range provided by the laboratory.</p></article><article><span>03</span><h3>Understand change</h3><p>Follow meaningful shifts across reports and prepare thoughtful questions.</p></article></div></section>
      <section className="feature feature--comparison"><div className="feature__art"><div className="compare-card compare-card--old"><span>JAN 2026</span><b>LDL cholesterol</b><strong>151 <small>mg/dL</small></strong></div><div className="compare-arrow">{Icons.arrow({ size: 21 })}</div><div className="compare-card"><span>AUG 2026</span><b>LDL cholesterol</b><strong>121 <small>mg/dL</small></strong><em>Improved by 30 mg/dL</em></div></div><div className="feature__copy"><p className="eyebrow">SEE THE DIFFERENCE</p><h2>Change is easier to understand in context.</h2><p>Put two reports side by side and see what improved, what shifted, and what stayed steady — without hunting through pages of lab terminology.</p><button className="text-link" onClick={enter}>Explore comparison <Icons.arrow size={16}/></button></div></section>
      <section id="privacy" className="privacy-callout"><div className="privacy-callout__icon">{Icons.shield({ size: 26 })}</div><div><p className="eyebrow">PRIVATE BY DESIGN</p><h2>Your health story belongs to you.</h2><p>Built around clear consent, understandable data controls, and a calm boundary: MediLens educates and organises. It never diagnoses.</p></div><button className="outline-button" onClick={enter}>Explore the workspace</button></section>
    </main>
    <footer className="landing-footer"><Logo/><p>Educational information, not medical advice.</p><span>© 2026 MediLens</span></footer>
  </div>
}

function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [page, setPage] = useState<Page>('Overview')
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detailReport, setDetailReport] = useState<Report | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [dark, setDark] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  const latest = reports.slice().sort((a, b) => b.date.localeCompare(a.date))[0]
  const previous = reports.slice().sort((a, b) => b.date.localeCompare(a.date))[1]
  const activate = (destination: Page) => { setPage(destination); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const importReport = (report: Report) => {
    setReports((existing) => [report, ...existing]); setUploadOpen(false); setDetailReport(report); setNotice('Your report image was processed locally and its extracted values were added to this session.')
  }
  if (screen === 'landing') return <Landing enter={() => setScreen('workspace')} />
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar--open' : ''}`}><div className="sidebar__top"><Logo/><button className="icon-button close-mobile" onClick={() => setMobileMenu(false)} aria-label="Close menu">{Icons.close()}</button></div><nav className="sidebar__nav" aria-label="Main navigation">{navItems.map(({ label, icon }) => { const Icon = Icons[icon]; return <button key={label} onClick={() => activate(label)} className={page === label ? 'is-active' : ''}><Icon size={19}/><span>{label}</span>{label === 'Questions' && <b>3</b>}</button> })}</nav><div className="sidebar__bottom"><button onClick={() => activate('Privacy')} className={page === 'Privacy' ? 'is-active' : ''}>{Icons.shield({ size: 18 })}<span>Privacy & settings</span></button><div className="profile-chip"><span>AK</span><div><strong>Aria Kumar</strong><small>Personal workspace</small></div><button className="icon-button" aria-label="Profile options">{Icons.more({ size: 18 })}</button></div></div></aside>
    <div className="app-main"><header className="app-topbar"><button className="icon-button menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu">☰</button><div className="topbar__crumb"><span>Personal workspace</span><b>/</b><strong>{page}</strong></div><div className="topbar__actions"><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{dark ? 'Light' : 'Dark'}</button><button className="primary-button primary-button--compact" onClick={() => setUploadOpen(true)}>{Icons.plus({ size: 17 })}<span>Add report</span></button></div></header>
      {notice && <div className="notice"><Icons.info size={17}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
      <main className="workspace-content">{page === 'Overview' && <Overview latest={latest} previous={previous} reports={reports} onOpen={setDetailReport} onPage={activate}/>} {page === 'Reports' && <ReportsPage reports={reports} onOpen={setDetailReport} onUpload={() => setUploadOpen(true)}/>} {page === 'Compare' && <ComparePage reports={reports} onOpen={setDetailReport}/>} {page === 'Trends' && <TrendsPage reports={reports}/>} {page === 'Questions' && <QuestionsPage/>} {page === 'Privacy' && <PrivacyPage dark={dark} setDark={setDark} onReset={() => { if (window.confirm('Restore the original demo reports?')) { setReports(initialReports); setNotice('Your demo workspace has been restored.') } }}/>}</main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.slice(0, 5).map(({ label, icon }) => { const Icon = Icons[icon]; return <button key={label} className={page === label ? 'is-active' : ''} onClick={() => activate(label)}><Icon size={19}/><span>{label}</span></button> })}</nav>
    {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} onImport={importReport}/>} {detailReport && <DetailDialog report={detailReport} onClose={() => setDetailReport(null)}/>} {mobileMenu && <button aria-label="Close menu overlay" className="mobile-overlay" onClick={() => setMobileMenu(false)}/>} 
  </div>
}

function Overview({ latest, previous, reports, onOpen, onPage }: { latest: Report; previous?: Report; reports: Report[]; onOpen: (report: Report) => void; onPage: (page: Page) => void }) {
  const latestReview = latest.parameters.filter((item) => item.status !== 'within range').length
  const changed = previous ? latest.parameters.filter((item) => { const former = getParameter(previous, item.canonicalName); return former && former.value !== item.value }).length : 0
  return <><section className="page-heading page-heading--overview"><div><p className="eyebrow">WEDNESDAY, 19 AUGUST</p><h1>Good morning, Aria.</h1><p>Here’s what has changed across your recent reports.</p></div><div className="quiet-label"><Icons.lock size={15}/> Private workspace</div></section>
    <section className="overview-grid"><article className="latest-report"><div className="latest-report__top"><div><span className="section-label">LATEST REPORT</span><h2>{latest.type}</h2><p>{latest.dateLabel} · {latest.laboratory}</p></div><ReportTag report={latest}/></div><p className="latest-report__summary">{latest.summary}</p><div className="latest-report__meta"><span><b>{latest.parameters.length}</b> parameters analysed</span><span><b>{latest.quality}</b> extraction quality</span></div><button className="text-link" onClick={() => onOpen(latest)}>Read the full report <Icons.arrow size={16}/></button></article>
      <article className="change-card"><span className="section-label">WHAT CHANGED</span><div className="change-card__number">{changed}<small>parameters<br/>changed</small></div><div className="change-card__line"><span><i className="dot dot--good"/>2 improved</span><span><i className="dot dot--review"/>{Math.max(latestReview - 2, 1)} worth discussing</span></div><button className="inline-button" onClick={() => onPage('Compare')}>Compare reports {Icons.arrow({ size: 16 })}</button></article></section>
    <section className="section-heading"><div><span className="section-label">A CLOSER LOOK</span><h2>Results worth keeping an eye on</h2></div><button className="text-link" onClick={() => onPage('Trends')}>View all trends <Icons.arrow size={16}/></button></section>
    <section className="result-strip">{latest.parameters.slice(0, 4).map((item) => <article className="result-tile" key={item.canonicalName}><div><span>{item.name}</span><StatusBadge status={item.status}/></div><MetricValue item={item}/><span className="reference">Reference <Range item={item}/></span><div className="micro-trend"><i/><i/><i className={item.status !== 'within range' ? 'is-warning' : ''}/></div></article>)}</section>
    <section className="bottom-grid"><article className="report-history"><div className="section-heading"><div><span className="section-label">REPORT HISTORY</span><h2>Recent reports</h2></div><button className="text-link" onClick={() => onPage('Reports')}>View all</button></div><div>{reports.slice(0, 3).map((report) => <button className="history-row" key={report.id} onClick={() => onOpen(report)}><span className="history-row__date"><b>{report.dateLabel.split(' ')[0]}</b><small>{report.dateLabel.split(' ')[1]}</small></span><span className="history-row__name"><strong>{report.type}</strong><small>{report.laboratory}</small></span><span className="history-row__count">{report.parameters.length} results</span>{Icons.chevron({ size: 17 })}</button>)}</div></article><article className="next-step"><div className="next-step__icon">{Icons.compare({ size: 22 })}</div><span className="section-label">A USEFUL NEXT STEP</span><h2>See your results side by side.</h2><p>Compare your latest report with a previous one to understand what changed.</p><button className="primary-button primary-button--compact" onClick={() => onPage('Compare')}>Compare reports <Icons.arrow size={16}/></button></article></section>
    <p className="medical-disclaimer page-disclaimer"><Icons.info size={15}/> MediLens organises and explains report information. It does not diagnose conditions or replace professional medical advice.</p>
  </>
}

function ReportsPage({ reports, onOpen, onUpload }: { reports: Report[]; onOpen: (report: Report) => void; onUpload: () => void }) {
  const [query, setQuery] = useState('')
  const filtered = reports.filter((report) => `${report.type} ${report.dateLabel} ${report.parameters.map((parameter) => parameter.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  return <><section className="page-heading"><div><p className="eyebrow">YOUR REPORT ARCHIVE</p><h1>All reports</h1><p>Everything you have added, kept in one calm, searchable place.</p></div><button className="primary-button" onClick={onUpload}>{Icons.plus({ size: 17 })} Add report</button></section><div className="search-field">{Icons.search({ size: 19 })}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by report, parameter, or date" aria-label="Search reports"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search">×</button>}</div><section className="reports-list">{filtered.length ? filtered.map((report) => <article className="archive-report" key={report.id}><div className="archive-report__date"><b>{report.dateLabel.split(' ')[0]}</b><span>{report.dateLabel.slice(3)}</span></div><div className="archive-report__body"><div><div className="archive-report__type"><ReportTag report={report}/><span>{report.laboratory}</span></div><h2>{report.type}</h2><p>{report.keyFinding}</p></div><div className="archive-report__results"><span>{report.parameters.length} parameters</span><div>{report.parameters.filter((item) => item.status !== 'within range').slice(0, 2).map((item) => <StatusBadge key={item.canonicalName} status={item.status}/>)}</div></div><button className="outline-button" onClick={() => onOpen(report)}>Open report <Icons.chevron size={16}/></button></div></article>) : <EmptyState icon={<Icons.search size={25}/>} title="No reports match that search" body="Try a report type, a parameter name, or a different date." action={<button className="text-button" onClick={() => setQuery('')}>Clear search</button>}/>}</section></>
}

function ComparePage({ reports, onOpen }: { reports: Report[]; onOpen: (report: Report) => void }) {
  const [leftId, setLeftId] = useState(reports.at(-1)?.id ?? '')
  const [rightId, setRightId] = useState(reports[0]?.id ?? '')
  const left = reports.find((item) => item.id === leftId) ?? reports.at(-1)!
  const right = reports.find((item) => item.id === rightId) ?? reports[0]
  const rows = right.parameters.map((current) => ({ current, earlier: getParameter(left, current.canonicalName) })).filter((item): item is { current: Parameter; earlier: Parameter } => Boolean(item.earlier))
  const deltaLabel = (current: Parameter, earlier: Parameter) => { const delta = current.value - earlier.value; if (delta === 0) return 'No change'; const word = delta < 0 ? 'decreased' : 'increased'; return `${word} by ${Math.abs(delta).toFixed(delta % 1 ? 1 : 0)} ${current.unit}` }
  return <><section className="page-heading"><div><p className="eyebrow">SIGNATURE VIEW</p><h1>Compare reports</h1><p>See what changed between two points in time, one result at a time.</p></div></section><section className="comparison-picker"><div><label htmlFor="earlier">Earlier report</label><select id="earlier" value={left.id} onChange={(event) => setLeftId(event.target.value)}>{reports.map((report) => <option key={report.id} value={report.id}>{report.dateLabel} — {report.type}</option>)}</select></div><div className="picker-swap">{Icons.compare({ size: 19 })}</div><div><label htmlFor="current">Later report</label><select id="current" value={right.id} onChange={(event) => setRightId(event.target.value)}>{reports.map((report) => <option key={report.id} value={report.id}>{report.dateLabel} — {report.type}</option>)}</select></div></section><section className="comparison-summary"><span className="section-label">WHAT CHANGED</span><h2>{right.dateLabel} compared with {left.dateLabel}</h2><p>LDL has moved closer to the laboratory reference range, while HbA1c has increased. These results are best interpreted with a healthcare professional who knows your wider health picture.</p><button className="text-link" onClick={() => onOpen(right)}>Review current report <Icons.arrow size={16}/></button></section><section className="comparison-grid">{rows.map(({ current, earlier }) => { const delta = current.value - earlier.value; const direction = delta < 0 ? 'improved' : delta > 0 ? 'changed' : 'steady'; return <article key={current.canonicalName} className="comparison-row"><div><span className={`change-label change-label--${direction}`}>{direction === 'improved' ? 'Moved down' : direction === 'steady' ? 'Little change' : 'Moved up'}</span><h3>{current.name}</h3><p>{deltaLabel(current, earlier)}</p></div><div className="comparison-values"><div><strong>{earlier.value}</strong><span>{left.dateLabel}</span></div>{Icons.arrow({ size: 17 })}<div className={current.status !== 'within range' ? 'is-review' : ''}><strong>{current.value}</strong><span>{right.dateLabel}</span></div></div><StatusBadge status={current.status}/></article> })}</section><p className="medical-disclaimer page-disclaimer"><Icons.info size={15}/> Comparisons describe reported values and reference ranges; they are not a diagnosis.</p></>
}

function TrendsPage({ reports }: { reports: Report[] }) {
  const [selected, setSelected] = useState('hba1c')
  const latest = reports[0]
  const options = latest.parameters.map((parameter) => ({ value: parameter.canonicalName, label: parameter.name }))
  const parameter = getParameter(latest, selected)!
  const allValues = reports.map((report) => getParameter(report, selected)).filter(Boolean) as Parameter[]
  const first = allValues.at(-1)!
  const change = parameter.value - first.value
  return <><section className="page-heading"><div><p className="eyebrow">YOUR HISTORY, VISUALISED</p><h1>Trends</h1><p>Follow a parameter over time, alongside the laboratory reference range.</p></div></section><section className="trends-layout"><aside className="trend-selector"><span className="section-label">TRACKED PARAMETERS</span>{options.map((option) => <button className={selected === option.value ? 'is-active' : ''} onClick={() => setSelected(option.value)} key={option.value}><span>{option.label}</span><Icons.chevron size={16}/></button>)}</aside><article className="trend-panel"><div className="trend-panel__header"><div><span className="section-label">RESULT HISTORY</span><h2>{parameter.name}</h2><p><Range item={parameter}/></p></div><div className="trend-stat"><strong>{parameter.value}<small>{parameter.unit}</small></strong><span className={change <= 0 ? 'positive' : 'review'}>{change === 0 ? 'No change' : `${change > 0 ? '+' : ''}${change.toFixed(1)} since first report`}</span></div></div><TrendChart reports={reports} canonicalName={selected}/><div className="trend-note"><Icons.info size={16}/><p>Reference ranges can vary between laboratories and are only one part of a result’s interpretation.</p></div></article></section></>
}

function QuestionsPage() {
  const [copied, setCopied] = useState<number | null>(null)
  const copyQuestion = async (text: string, index: number) => { try { await navigator.clipboard.writeText(text) } catch { /* Clipboard permissions are optional. */ } setCopied(index); window.setTimeout(() => setCopied(null), 1600) }
  return <><section className="page-heading"><div><p className="eyebrow">PREPARE FOR A CONVERSATION</p><h1>Questions for your doctor</h1><p>Thoughtful prompts based on the results in your recent reports.</p></div></section><div className="questions-intro"><div className="questions-intro__mark">{Icons.chat({ size: 25 })}</div><div><h2>A little more clarity before your appointment.</h2><p>These are discussion starters, not recommendations or diagnoses. Your healthcare professional can put them in the right context.</p></div></div><section className="questions-list">{doctorQuestions.map((question, index) => <article key={question.tag} className="question-card"><span className="question-number">0{index + 1}</span><div><span className="question-tag">Related to {question.tag}</span><h2>“{question.text}”</h2></div><button className="outline-button" onClick={() => copyQuestion(question.text, index)}>{copied === index ? <><Icons.check size={16}/> Copied</> : 'Copy question'}</button></article>)}</section><p className="medical-disclaimer page-disclaimer"><Icons.info size={15}/> MediLens does not recommend treatment or medication. These questions are here to support, not replace, a clinical conversation.</p></>
}

function PrivacyPage({ dark, setDark, onReset }: { dark: boolean; setDark: (value: boolean) => void; onReset: () => void }) {
  return <><section className="page-heading"><div><p className="eyebrow">CONTROL CENTRE</p><h1>Privacy & settings</h1><p>Understand what your workspace keeps and stay in control of it.</p></div></section><section className="privacy-grid"><article className="privacy-panel privacy-panel--lead"><div className="privacy-panel__icon">{Icons.shield({ size: 23 })}</div><span className="section-label">YOUR DATA, YOUR CONTROL</span><h2>Report images are read in your browser.</h2><p>When you choose an image, OCR runs locally on this device. MediLens does not upload or retain the image.</p><span className="privacy-state"><Icons.lock size={15}/> Local image processing</span></article><article className="settings-panel"><h2>Preferences</h2><div className="settings-row"><div><strong>Appearance</strong><span>Choose your workspace theme.</span></div><button className="toggle" onClick={() => setDark(!dark)} aria-pressed={dark}><i className={dark ? 'is-on' : ''}/><span>{dark ? 'Dark' : 'Light'}</span></button></div><div className="settings-row"><div><strong>Language</strong><span>Used for plain-language explanations.</span></div><button className="select-button">English {Icons.chevron({ size: 15 })}</button></div></article><article className="settings-panel settings-panel--wide"><h2>Demo data</h2><p>Restore the original three sample reports and remove any reports added during this session.</p><button className="danger-button" onClick={onReset}>Restore demo workspace</button></article></section><section className="privacy-faq"><span className="section-label">IN A PRODUCTION ACCOUNT</span><h2>What MediLens would store</h2><div><article><h3>Reports and structured results</h3><p>Original report metadata, extracted parameters, and your preferences would be stored in your private account.</p></article><article><h3>Deletion controls</h3><p>You would be able to delete individual reports and request account deletion from this space.</p></article><article><h3>AI processing</h3><p>Any provider processing would be disclosed before use, with structured outputs validated before they are shown.</p></article></div></section></>
}

export default App

