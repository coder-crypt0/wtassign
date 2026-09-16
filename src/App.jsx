import { useEffect, useMemo, useState } from 'react'
import { resultApi } from './api.js'

const subjectFields = [
  { key: 'daa', code: 'DAA', name: 'Design and Analysis of Algorithms' },
  { key: 'dbms', code: 'DBMS', name: 'Database Management Systems' },
  { key: 'blockchain', code: 'BCT', name: 'Blockchain Technology' },
  { key: 'web', code: 'WT', name: 'Web Technology' }
]

const emptyForm = {
  prn: '',
  studentName: '',
  division: 'TY CS A',
  semester: 5,
  academicYear: '2026-27',
  daaMse: 0,
  daaEse: 0,
  dbmsMse: 0,
  dbmsEse: 0,
  blockchainMse: 0,
  blockchainEse: 0,
  webMse: 0,
  webEse: 0
}

function App() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadResults()
  }, [])

  async function loadResults() {
    setLoading(true)
    try {
      setResults(await resultApi.list())
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function notify(message, type = 'success') {
    setToast({ message, type })
    window.clearTimeout(notify.timer)
    notify.timer = window.setTimeout(() => setToast(null), 3200)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(result) {
    setEditing(result)
    setFormOpen(true)
  }

  async function handleDelete(result) {
    const okay = window.confirm(`Delete the semester result for ${result.studentName} (${result.prn})?`)
    if (!okay) return
    try {
      await resultApi.remove(result.id)
      setResults(current => current.filter(item => item.id !== result.id))
      if (viewing?.id === result.id) setViewing(null)
      notify('Result deleted successfully.')
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    return results.filter(result => {
      const matchesText = !text ||
        result.studentName.toLowerCase().includes(text) ||
        result.prn.toLowerCase().includes(text) ||
        result.division.toLowerCase().includes(text)
      const matchesStatus = statusFilter === 'ALL' || result.status === statusFilter
      return matchesText && matchesStatus
    })
  }, [results, query, statusFilter])

  const stats = useMemo(() => {
    if (!results.length) {
      return { total: 0, pass: 0, average: 0, highest: 0 }
    }
    const pass = results.filter(item => item.status === 'PASS').length
    const average = results.reduce((sum, item) => sum + item.percentage, 0) / results.length
    const highest = Math.max(...results.map(item => item.percentage))
    return { total: results.length, pass, average, highest }
  }, [results])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="vit-mark" aria-hidden="true">V</div>
          <div>
            <div className="brand-kicker">Vishwakarma Institute of Technology</div>
            <h1>Semester Result Portal</h1>
          </div>
        </div>
        <div className="stack-badge">React + Spring Boot + MySQL</div>
      </header>

      <main className="page">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Academic Result Management</p>
            <h2>One semester. Four subjects. One clear result.</h2>
            <p className="hero-copy">
              MSE contributes 30 marks and ESE contributes 70 marks for every subject. Totals,
              grades, percentage, SGPA and result status are calculated automatically.
            </p>
          </div>
          <button className="primary-btn hero-action" onClick={openCreate}>
            <span className="plus">+</span>
            Add Student Result
          </button>
        </section>

        <section className="stats-grid" aria-label="Result statistics">
          <StatCard label="Students" value={stats.total} helper="Total records" />
          <StatCard label="Passed" value={stats.pass} helper={`${stats.total ? Math.round((stats.pass / stats.total) * 100) : 0}% pass rate`} />
          <StatCard label="Average" value={`${stats.average.toFixed(1)}%`} helper="Overall percentage" />
          <StatCard label="Highest" value={`${stats.highest.toFixed(1)}%`} helper="Best result" />
        </section>

        <section className="content-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Result Register</p>
              <h3>Semester 5 Results</h3>
            </div>
            <div className="toolbar">
              <label className="search-box">
                <span className="search-icon">⌕</span>
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search name or PRN"
                  aria-label="Search students"
                />
              </label>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="ALL">All results</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="state-box">
              <div className="loader" />
              <p>Loading results from Spring Boot...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="state-box">
              <div className="empty-icon">0</div>
              <h4>No matching results</h4>
              <p>Change the search/filter or add a new student result.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>PRN</th>
                    <th>Division</th>
                    <th>Total</th>
                    <th>Percentage</th>
                    <th>SGPA</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(result => (
                    <tr key={result.id}>
                      <td>
                        <button className="student-link" onClick={() => setViewing(result)}>
                          <span className="avatar">{initials(result.studentName)}</span>
                          <span>
                            <strong>{result.studentName}</strong>
                            <small>{result.academicYear}</small>
                          </span>
                        </button>
                      </td>
                      <td className="mono">{result.prn}</td>
                      <td>{result.division}</td>
                      <td><strong>{result.grandTotal}</strong><span className="muted"> / 400</span></td>
                      <td>{result.percentage.toFixed(2)}%</td>
                      <td>{result.sgpa.toFixed(2)}</td>
                      <td><span className="grade-chip">{result.grade}</span></td>
                      <td><StatusBadge status={result.status} /></td>
                      <td>
                        <div className="row-actions">
                          <button className="ghost-btn compact" onClick={() => setViewing(result)}>View</button>
                          <button className="ghost-btn compact" onClick={() => openEdit(result)}>Edit</button>
                          <button className="danger-btn compact" onClick={() => handleDelete(result)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="footer">
          <span>VIT Semester Result Portal</span>
          <span>Frontend: React • Backend: Spring Boot REST API • Database: XAMPP MySQL</span>
        </footer>
      </main>

      {formOpen && (
        <ResultForm
          result={editing}
          onClose={() => setFormOpen(false)}
          onSaved={saved => {
            setResults(current => {
              const exists = current.some(item => item.id === saved.id)
              const next = exists
                ? current.map(item => item.id === saved.id ? saved : item)
                : [...current, saved]
              return next.sort((a, b) => a.studentName.localeCompare(b.studentName))
            })
            if (viewing?.id === saved.id) setViewing(saved)
            setFormOpen(false)
            notify(editing ? 'Result updated successfully.' : 'Result added successfully.')
          }}
        />
      )}

      {viewing && (
        <ResultDetail
          result={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setViewing(null)
            openEdit(viewing)
          }}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  )
}

function StatCard({ label, value, helper }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  )
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
}

function ResultForm({ result, onClose, onSaved }) {
  const [form, setForm] = useState(() => result ? resultToForm(result) : { ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const preview = useMemo(() => {
    const totals = subjectFields.map(subject =>
      numberValue(form[`${subject.key}Mse`]) + numberValue(form[`${subject.key}Ese`])
    )
    const grand = totals.reduce((sum, total) => sum + total, 0)
    return { grand, percentage: grand / 4 }
  }, [form])

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }))
    setFieldErrors(current => ({ ...current, [name]: undefined }))
  }

  function validate() {
    const errors = {}
    if (!form.prn.trim()) errors.prn = 'PRN is required.'
    if (!form.studentName.trim()) errors.studentName = 'Student name is required.'
    if (!form.division.trim()) errors.division = 'Division is required.'
    if (!form.academicYear.trim()) errors.academicYear = 'Academic year is required.'
    if (numberValue(form.semester) < 1 || numberValue(form.semester) > 8) errors.semester = 'Semester must be between 1 and 8.'

    subjectFields.forEach(subject => {
      const mse = numberValue(form[`${subject.key}Mse`])
      const ese = numberValue(form[`${subject.key}Ese`])
      if (mse < 0 || mse > 30) errors[`${subject.key}Mse`] = '0 to 30 only.'
      if (ese < 0 || ese > 70) errors[`${subject.key}Ese`] = '0 to 70 only.'
    })
    return errors
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    const errors = validate()
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    const payload = normalizePayload(form)
    setSaving(true)
    try {
      const saved = result
        ? await resultApi.update(result.id, payload)
        : await resultApi.create(payload)
      onSaved(saved)
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fields || {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="modal form-modal" role="dialog" aria-modal="true" aria-label={result ? 'Edit student result' : 'Add student result'}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{result ? 'Update Record' : 'New Record'}</p>
            <h3>{result ? 'Edit Student Result' : 'Add Student Result'}</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-section">
            <div className="form-section-title">
              <span>01</span>
              <div>
                <strong>Student Information</strong>
                <small>Basic semester record details</small>
              </div>
            </div>
            <div className="form-grid">
              <Field label="PRN" error={fieldErrors.prn}>
                <input value={form.prn} onChange={event => updateField('prn', event.target.value)} placeholder="112103001" />
              </Field>
              <Field label="Student Name" error={fieldErrors.studentName} wide>
                <input value={form.studentName} onChange={event => updateField('studentName', event.target.value)} placeholder="Student full name" />
              </Field>
              <Field label="Division" error={fieldErrors.division}>
                <input value={form.division} onChange={event => updateField('division', event.target.value)} placeholder="TY CS A" />
              </Field>
              <Field label="Semester" error={fieldErrors.semester}>
                <input type="number" min="1" max="8" value={form.semester} onChange={event => updateField('semester', event.target.value)} />
              </Field>
              <Field label="Academic Year" error={fieldErrors.academicYear}>
                <input value={form.academicYear} onChange={event => updateField('academicYear', event.target.value)} placeholder="2026-27" />
              </Field>
            </div>
          </div>

          <div className="form-section marks-section">
            <div className="form-section-title">
              <span>02</span>
              <div>
                <strong>Subject Marks</strong>
                <small>MSE / 30 + ESE / 70 = Subject total / 100</small>
              </div>
            </div>

            <div className="subject-form-grid">
              {subjectFields.map(subject => {
                const mseKey = `${subject.key}Mse`
                const eseKey = `${subject.key}Ese`
                const total = numberValue(form[mseKey]) + numberValue(form[eseKey])
                return (
                  <div className="subject-form-card" key={subject.key}>
                    <div className="subject-card-head">
                      <span className="subject-code">{subject.code}</span>
                      <div>
                        <strong>{subject.name}</strong>
                        <small>Total: {total}/100</small>
                      </div>
                    </div>
                    <div className="mark-inputs">
                      <Field label="MSE / 30" error={fieldErrors[mseKey]}>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={form[mseKey]}
                          onChange={event => updateField(mseKey, event.target.value)}
                        />
                      </Field>
                      <Field label="ESE / 70" error={fieldErrors[eseKey]}>
                        <input
                          type="number"
                          min="0"
                          max="70"
                          value={form[eseKey]}
                          onChange={event => updateField(eseKey, event.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="form-summary">
            <div>
              <span>Preview Total</span>
              <strong>{preview.grand} / 400</strong>
            </div>
            <div>
              <span>Percentage</span>
              <strong>{preview.percentage.toFixed(2)}%</strong>
            </div>
            <div>
              <span>Calculation</span>
              <strong>30% MSE + 70% ESE</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : result ? 'Save Changes' : 'Create Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, children, wide = false }) {
  return (
    <label className={`field ${wide ? 'wide' : ''} ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

function ResultDetail({ result, onClose, onEdit }) {
  return (
    <div className="modal-backdrop result-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="modal result-modal printable-result" role="dialog" aria-modal="true" aria-label="Student result details">
        <div className="modal-head no-print">
          <div>
            <p className="eyebrow">Result Sheet</p>
            <h3>Semester Result Details</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="result-sheet">
          <div className="sheet-header">
            <div className="sheet-logo">VIT</div>
            <div>
              <h2>Vishwakarma Institute of Technology</h2>
              <p>Semester Examination Result • Academic Year {result.academicYear}</p>
            </div>
            <StatusBadge status={result.status} />
          </div>

          <div className="student-meta">
            <Meta label="Student Name" value={result.studentName} />
            <Meta label="PRN" value={result.prn} mono />
            <Meta label="Division" value={result.division} />
            <Meta label="Semester" value={`Semester ${result.semester}`} />
          </div>

          <div className="subject-table-wrap">
            <table className="subject-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>MSE / 30</th>
                  <th>ESE / 70</th>
                  <th>Total / 100</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.subjects.map(subject => (
                  <tr key={subject.code}>
                    <td>
                      <strong>{subject.code}</strong>
                      <span>{subject.name}</span>
                    </td>
                    <td>{subject.mse}</td>
                    <td>{subject.ese}</td>
                    <td><strong>{subject.total}</strong></td>
                    <td><span className="grade-chip">{subject.grade}</span></td>
                    <td><StatusBadge status={subject.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="result-summary-grid">
            <div>
              <span>Grand Total</span>
              <strong>{result.grandTotal}<small> / 400</small></strong>
            </div>
            <div>
              <span>Percentage</span>
              <strong>{result.percentage.toFixed(2)}%</strong>
            </div>
            <div>
              <span>SGPA</span>
              <strong>{result.sgpa.toFixed(2)}</strong>
            </div>
            <div>
              <span>Overall Grade</span>
              <strong>{result.grade}</strong>
            </div>
          </div>

          <div className="sheet-note">
            <strong>Assessment pattern:</strong> MSE marks are evaluated out of 30 and ESE marks out of 70 for each of the four subjects.
            A minimum total of 40/100 in every subject is required for an overall PASS status.
          </div>
        </div>

        <div className="modal-actions no-print">
          <button className="ghost-btn" onClick={onEdit}>Edit Result</button>
          <button className="primary-btn" onClick={() => window.print()}>Print Result</button>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value, mono = false }) {
  return (
    <div className="meta-item">
      <span>{label}</span>
      <strong className={mono ? 'mono' : ''}>{value}</strong>
    </div>
  )
}

function resultToForm(result) {
  const form = { ...emptyForm }
  Object.keys(form).forEach(key => {
    if (result[key] !== undefined && result[key] !== null) form[key] = result[key]
  })
  return form
}

function normalizePayload(form) {
  const payload = {
    ...form,
    prn: form.prn.trim(),
    studentName: form.studentName.trim(),
    division: form.division.trim(),
    academicYear: form.academicYear.trim(),
    semester: numberValue(form.semester)
  }
  subjectFields.forEach(subject => {
    payload[`${subject.key}Mse`] = numberValue(form[`${subject.key}Mse`])
    payload[`${subject.key}Ese`] = numberValue(form[`${subject.key}Ese`])
  })
  return payload
}

function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

export default App
