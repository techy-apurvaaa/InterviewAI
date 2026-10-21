import React, { useState, useEffect } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { Link, useParams, useNavigate } from 'react-router'
import Navbar from '../../../components/Navbar'
import Toast from '../../../components/Toast'

const NAV_ITEMS = [
    { id: 'technical', label: 'Technical Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>) },
    { id: 'behavioral', label: 'Behavioral Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>) },
    { id: 'roadmap', label: 'Road Map', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>) },
]

// ── Sub-components ────────────────────────────────────────────────────────────
const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

const QuestionCard = ({ item, index, isPracticed, isNew, onTogglePracticed, onCopy }) => {
    const [ open, setOpen ] = useState(false)

    const handleCopy = (e) => {
        e.stopPropagation()
        const text = `Question: ${item.question}\n\nInterviewer Intention: ${item.intention}\n\nModel Answer:\n${item.answer}`
        const done = () => { if (onCopy) onCopy(item.question, true) }
        const fail = () => { if (onCopy) onCopy(item.question, false) }
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(done, fail)
        } else {
            fail()
        }
    }

    return (
        <div className={`q-card ${isPracticed ? 'q-card--practiced' : ''} ${isNew ? 'q-card--new' : ''}`} id={`q-${item.__anchor}`}>
            <div
                className='q-card__header'
                role='button'
                tabIndex={0}
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpen(o => !o)
                    }
                }}
            >
                <div className='q-card__left'>
                    <input
                        type='checkbox'
                        className='q-card__checkbox'
                        checked={isPracticed}
                        onChange={(e) => {
                            e.stopPropagation()
                            onTogglePracticed(index)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title={isPracticed ? 'Mark as unpracticed' : 'Mark as practiced'}
                    />
                    <span className='q-card__index'>Q{index + 1}</span>
                </div>
                <div className='q-card__main'>
                    <p className='q-card__question'>{item.question}</p>
                    {(isNew || item.difficulty || item.category) && (
                        <div className='q-card__meta'>
                            {isNew && <span className='q-badge q-badge--new'>New</span>}
                            {item.difficulty && (
                                <span className={`q-badge q-badge--${item.difficulty}`}>{DIFFICULTY_LABEL[item.difficulty] || item.difficulty}</span>
                            )}
                            {item.category && <span className='q-badge q-badge--category'>{item.category}</span>}
                        </div>
                    )}
                </div>
                <div className='q-card__actions' onClick={(e) => e.stopPropagation()}>
                    <button
                        type='button'
                        className='q-card__copy-btn'
                        onClick={handleCopy}
                        title='Copy question and model answer to clipboard'
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    </button>
                    <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`} onClick={() => setOpen(o => !o)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                </div>
            </div>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

const COUNT_OPTIONS = [ 3, 5, 10 ]
const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'easy', label: 'Easy' },
    { id: 'medium', label: 'Medium' },
    { id: 'hard', label: 'Hard' },
]

// One practice list (technical or behavioral) with filters and a "generate more" control
const QuestionSection = ({
    type, title, subtitle, questions, keyPrefix, practicedMap,
    onTogglePracticed, onCopy, onGenerate, generating, newFrom,
}) => {
    const [ filter, setFilter ] = useState('all')
    const [ hidePracticed, setHidePracticed ] = useState(false)
    const [ count, setCount ] = useState(5)

    // after new questions arrive, bring the first one into view
    useEffect(() => {
        if (newFrom === null || newFrom === undefined) return
        const el = document.getElementById(`q-${type}-${newFrom}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [ newFrom, type ])

    const practicedHere = questions.filter((_, i) => practicedMap[`${keyPrefix}_${i}`]).length

    const visible = questions
        .map((q, i) => ({ q: { ...q, __anchor: `${type}-${i}` }, i }))
        .filter(({ q, i }) => (filter === 'all' || q.difficulty === filter) && !(hidePracticed && practicedMap[`${keyPrefix}_${i}`]))

    const isBusy = generating === type
    const filtersUseful = questions.some(q => q.difficulty)

    return (
        <section>
            <div className='content-header'>
                <div>
                    <h2>{title}</h2>
                    <p className='section-subtitle'>{subtitle}</p>
                </div>
                <span className='content-header__count'>{questions.length} questions &bull; {practicedHere} practiced</span>
            </div>

            <div className='q-toolbar'>
                <div className='q-toolbar__filters'>
                    {filtersUseful && FILTERS.map(f => (
                        <button
                            key={f.id}
                            type='button'
                            className={`chip ${filter === f.id ? 'chip--active' : ''}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                    <label className='q-toolbar__toggle'>
                        <input type='checkbox' checked={hidePracticed} onChange={(e) => setHidePracticed(e.target.checked)} />
                        Hide practiced
                    </label>
                </div>
            </div>

            <div className='q-list'>
                {visible.map(({ q, i }) => (
                    <QuestionCard
                        key={`${type}-${i}`}
                        item={q}
                        index={i}
                        isPracticed={!!practicedMap[`${keyPrefix}_${i}`]}
                        isNew={newFrom !== null && newFrom !== undefined && i >= newFrom}
                        onTogglePracticed={() => onTogglePracticed(keyPrefix, i)}
                        onCopy={onCopy}
                    />
                ))}
                {visible.length === 0 && (
                    <div className='q-empty'>
                        {questions.length === 0 ? 'No questions yet — generate some below.' : 'No questions match the current filters.'}
                    </div>
                )}
            </div>

            <div className='more-box'>
                <div className='more-box__text'>
                    <strong>Want more practice?</strong>
                    <span>Generate fresh {type} questions tailored to this role. Existing questions are never repeated.</span>
                </div>
                <div className='more-box__controls'>
                    <select
                        className='more-box__select'
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                        disabled={isBusy}
                        aria-label='Number of questions to generate'
                    >
                        {COUNT_OPTIONS.map(n => <option key={n} value={n}>{n} questions</option>)}
                    </select>
                    <button
                        type='button'
                        className='more-box__btn'
                        onClick={() => onGenerate(type, count)}
                        disabled={!!generating}
                    >
                        {isBusy ? (
                            <>
                                <span className='mini-spinner' />
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                                    <line x1='12' y1='5' x2='12' y2='19' />
                                    <line x1='5' y1='12' x2='19' y2='12' />
                                </svg>
                                Generate {count} more
                            </>
                        )}
                    </button>
                </div>
            </div>
        </section>
    )
}

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [ activeNav, setActiveNav ] = useState('technical')
    const { report, getReportById, loading, getResumePdf, reports, getReports, addMoreQuestions } = useInterview()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    const [ isDownloading, setIsDownloading ] = useState(false)
    const [ downloadStatus, setDownloadStatus ] = useState(null)
    const [ showHistoryModal, setShowHistoryModal ] = useState(false)
    const [ toast, setToast ] = useState(null)
    const [ practicedMap, setPracticedMap ] = useState({})
    const [ generating, setGenerating ] = useState(null)            // 'technical' | 'behavioral' | null
    const [ newFrom, setNewFrom ] = useState({ technical: null, behavioral: null })

    // remembers WHICH id failed to load, so navigating to another report resets it automatically
    const [ notFoundId, setNotFoundId ] = useState(null)
    const notFound = notFoundId === interviewId

    useEffect(() => {
        if (!interviewId) return
        let active = true

        setNewFrom({ technical: null, behavioral: null })

        getReportById(interviewId).then((data) => {
            if (active && !data) setNotFoundId(interviewId)
        })

        // Also fetch reports if not already available
        if (!reports || reports.length === 0) {
            getReports()
        }

        // Load practiced state from localStorage
        try {
            const saved = localStorage.getItem(`practiced_${interviewId}`)
            if (saved) {
                setPracticedMap(JSON.parse(saved))
            } else {
                setPracticedMap({})
            }
        } catch (e) {
            console.warn(e)
        }

        return () => { active = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ interviewId ])

    const togglePracticed = (category, index) => {
        const key = `${category}_${index}`
        const updated = {
            ...practicedMap,
            [key]: !practicedMap[key]
        }
        setPracticedMap(updated)
        try {
            localStorage.setItem(`practiced_${interviewId}`, JSON.stringify(updated))
        } catch (e) {
            console.warn(e)
        }
    }

    const handleCopyFeedback = (questionTitle, ok = true) => {
        setToast(ok
            ? { message: `Copied to clipboard: "${questionTitle.slice(0, 35)}..."`, type: 'success' }
            : { message: 'Could not access the clipboard. Please copy manually.', type: 'error' })
    }

    const handleGenerateMore = async (type, count) => {
        if (generating) return
        const before = (type === 'technical' ? report?.technicalQuestions : report?.behavioralQuestions)?.length ?? 0
        setGenerating(type)
        setToast({ message: `Generating ${count} more ${type} questions...`, type: 'info' })

        try {
            const result = await addMoreQuestions(interviewId, { type, count })
            if (result.added > 0) {
                setNewFrom(prev => ({ ...prev, [type]: before }))
                setToast({
                    message: result.source === 'fallback'
                        ? `Added ${result.added} curated ${type} questions (AI is busy right now).`
                        : `✓ Added ${result.added} new ${type} questions!`,
                    type: 'success'
                })
            } else {
                setToast({ message: result.message || 'No new questions available.', type: 'info' })
            }
        } catch (error) {
            console.error('Generate more questions error:', error)
            setToast({
                message: error?.response?.data?.message || 'Could not generate more questions. Please try again.',
                type: 'error'
            })
        } finally {
            setGenerating(null)
        }
    }

    const handleDownloadResume = async () => {
        if (isDownloading) return
        setIsDownloading(true)
        setDownloadStatus(null)
        setToast({ message: "Synthesizing your ATS-optimized PDF resume...", type: "info" })

        try {
            await getResumePdf(interviewId, report?.title)
            setDownloadStatus('success')
            setToast({ message: "✓ Resume downloaded successfully to your PC!", type: "success" })
            setTimeout(() => setDownloadStatus(null), 3500)
        } catch (error) {
            console.error('Download error:', error)
            setDownloadStatus('error')
            setToast({ message: "Failed to download PDF. Please try again.", type: "error" })
            setTimeout(() => setDownloadStatus(null), 4000)
        } finally {
            setIsDownloading(false)
        }
    }

    const handleExportMarkdown = () => {
        if (!report) return

        let md = `# Interview Preparation Strategy: ${report.title || 'Target Role'}\n`
        md += `**Match Score**: ${report.matchScore}%\n`
        md += `**Generated**: ${new Date(report.createdAt || Date.now()).toLocaleDateString()}\n\n`

        md += `## Skill Gaps & Development Areas\n`
        if (report.skillGaps?.length) {
            report.skillGaps.forEach(gap => {
                md += `- **${gap.skill}** (Severity: ${gap.severity})\n`
            })
        }
        md += `\n---\n\n`

        md += `## Technical Questions & Model Answers\n\n`
        if (report.technicalQuestions?.length) {
            report.technicalQuestions.forEach((q, i) => {
                md += `### Q${i + 1}: ${q.question}\n`
                if (q.difficulty || q.category) md += `*${[ q.category, q.difficulty ].filter(Boolean).join(' · ')}*\n\n`
                md += `**Intention**: ${q.intention}\n\n`
                md += `**Model Answer**:\n${q.answer}\n\n`
            })
        }
        md += `---\n\n`

        md += `## Behavioral Questions (STAR Method)\n\n`
        if (report.behavioralQuestions?.length) {
            report.behavioralQuestions.forEach((q, i) => {
                md += `### Q${i + 1}: ${q.question}\n`
                if (q.difficulty || q.category) md += `*${[ q.category, q.difficulty ].filter(Boolean).join(' · ')}*\n\n`
                md += `**Intention**: ${q.intention}\n\n`
                md += `**Model Answer**:\n${q.answer}\n\n`
            })
        }
        md += `---\n\n`

        md += `## Preparation Road Map\n\n`
        if (report.preparationPlan?.length) {
            report.preparationPlan.forEach(day => {
                md += `### Day ${day.day}: ${day.focus}\n`
                day.tasks?.forEach(task => {
                    md += `- [ ] ${task}\n`
                })
                md += `\n`
            })
        }

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const safeTitle = (report.title || 'interview_strategy').replace(/[^a-zA-Z0-9_-]/g, '_')
        a.href = url
        a.download = `interview_strategy_${safeTitle}.md`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => {
            a.remove()
            URL.revokeObjectURL(url)
        }, 1000)

        setToast({ message: "✓ Strategy exported as Markdown (.md)", type: "success" })
    }

    if (notFound) {
        return (
            <>
                <Navbar />
                <main className='loading-screen'>
                    <h1>Interview plan not found</h1>
                    <p><Link to='/' style={{ color: '#ff2d78', textDecoration: 'underline' }}>Back to Home</Link></p>
                </main>
            </>
        )
    }

    // wait until the report that is in state is the one the URL asks for
    if (loading || !report || report._id !== interviewId) {
        return (
            <>
                <Navbar />
                <main className='loading-screen'>
                    <div className='spinner' />
                    <h1>Loading your interview plan...</h1>
                </main>
            </>
        )
    }

    const technicalQuestions = report.technicalQuestions ?? []
    const behavioralQuestions = report.behavioralQuestions ?? []
    const preparationPlan = report.preparationPlan ?? []
    const skillGaps = report.skillGaps ?? []

    const totalQuestions = technicalQuestions.length + behavioralQuestions.length
    const practicedCount = Object.values(practicedMap).filter(Boolean).length
    const progressPercent = totalQuestions > 0 ? Math.round((practicedCount / totalQuestions) * 100) : 0

    const scoreColor =
        report.matchScore >= 80 ? 'score--high' :
            report.matchScore >= 60 ? 'score--mid' : 'score--low'

    return (
        <>
            <Navbar onHistoryClick={() => setShowHistoryModal(true)} />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className='interview-page'>
                <div className='interview-layout'>

                    {/* ── Left Nav ── */}
                    <nav className='interview-nav'>
                        <div className="nav-top">
                            <Link to='/' className='interview-nav__back'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12"></line>
                                    <polyline points="12 19 5 12 12 5"></polyline>
                                </svg>
                                Back to Home
                            </Link>

                            <div>
                                <p className='interview-nav__label'>Sections</p>
                                {NAV_ITEMS.map(item => (
                                    <button
                                        key={item.id}
                                        className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                        onClick={() => setActiveNav(item.id)}
                                    >
                                        <span className='interview-nav__icon'>{item.icon}</span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="nav-actions">
                            <button
                                type="button"
                                className="history-toggle-btn"
                                onClick={() => setShowHistoryModal(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Previous History ({reports?.length || 0})
                            </button>

                            <button
                                onClick={handleDownloadResume}
                                disabled={isDownloading}
                                className={`download-btn ${downloadStatus === 'success' ? 'download-btn--success' : ''}`}
                            >
                                {isDownloading ? (
                                    <>
                                        <span className="btn-spinner" />
                                        Generating PDF...
                                    </>
                                ) : downloadStatus === 'success' ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Downloaded!
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Download Resume
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleExportMarkdown}
                                className="export-md-btn"
                                title="Export complete strategy as Markdown"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Export Plan (.md)
                            </button>
                        </div>
                    </nav>

                    <div className='interview-divider' />

                    {/* ── Center Content ── */}
                    <main className='interview-content'>

                        {/* Interactive Progress Bar */}
                        <div className='progress-banner'>
                            <div className='progress-banner__text'>
                                <span>Preparation Progress</span>
                                <strong>{practicedCount} of {totalQuestions} Questions Mastered ({progressPercent}%)</strong>
                            </div>
                            <div className='progress-banner__track'>
                                <div
                                    className='progress-banner__fill'
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        {activeNav === 'technical' && (
                            <QuestionSection
                                type='technical'
                                title='Technical Questions'
                                subtitle='Check the box on each question once practiced'
                                questions={technicalQuestions}
                                keyPrefix='tech'
                                practicedMap={practicedMap}
                                onTogglePracticed={togglePracticed}
                                onCopy={handleCopyFeedback}
                                onGenerate={handleGenerateMore}
                                generating={generating}
                                newFrom={newFrom.technical}
                            />
                        )}

                        {activeNav === 'behavioral' && (
                            <QuestionSection
                                type='behavioral'
                                title='Behavioral Questions'
                                subtitle='Formulated for the STAR method (Situation, Task, Action, Result)'
                                questions={behavioralQuestions}
                                keyPrefix='behav'
                                practicedMap={practicedMap}
                                onTogglePracticed={togglePracticed}
                                onCopy={handleCopyFeedback}
                                onGenerate={handleGenerateMore}
                                generating={generating}
                                newFrom={newFrom.behavioral}
                            />
                        )}

                        {activeNav === 'roadmap' && (
                            <section>
                                <div className='content-header'>
                                    <div>
                                        <h2>Preparation Road Map</h2>
                                        <p className='section-subtitle'>Step-by-step day-wise focus areas to secure this offer</p>
                                    </div>
                                    <span className='content-header__count'>{preparationPlan.length}-day plan</span>
                                </div>
                                <div className='roadmap-list'>
                                    {preparationPlan.map((day) => (
                                        <RoadMapDay key={day.day} day={day} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>

                    <div className='interview-divider' />

                    {/* ── Right Sidebar ── */}
                    <aside className='interview-sidebar'>

                        {/* Target Role */}
                        <div className='role-info'>
                            <p className='role-info__label'>Target Position</p>
                            <h3 className='role-info__title'>{report.title || 'Target Role'}</h3>
                        </div>

                        <div className='sidebar-divider' />

                        {/* Match Score */}
                        <div className='match-score'>
                            <p className='match-score__label'>Match Score</p>
                            <div className={`match-score__ring ${scoreColor}`}>
                                <span className='match-score__value'>{report.matchScore}</span>
                                <span className='match-score__pct'>%</span>
                            </div>
                            <p className='match-score__sub'>
                                {report.matchScore >= 80 ? 'Strong match for this role' : report.matchScore >= 60 ? 'Moderate match for this role' : 'Growth opportunity for this role'}
                            </p>
                        </div>

                        <div className='sidebar-divider' />

                        {/* Skill Gaps */}
                        <div className='skill-gaps'>
                            <p className='skill-gaps__label'>Skill Gaps Identified</p>
                            <div className='skill-gaps__list'>
                                {skillGaps.map((gap, i) => (
                                    <span key={i} className={`skill-tag skill-tag--${gap.severity}`}>
                                        {gap.skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </aside>
                </div>
            </div>

            {/* Quick History Switcher Modal */}
            {showHistoryModal && (
                <div className='history-modal-backdrop' onClick={() => setShowHistoryModal(false)}>
                    <div className='history-modal' onClick={(e) => e.stopPropagation()}>
                        <div className='history-modal__header'>
                            <h3>Your Previous History</h3>
                            <button
                                type="button"
                                className='close-btn'
                                onClick={() => setShowHistoryModal(false)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className='history-modal__list'>
                            {reports && reports.length > 0 ? (
                                reports.map((item) => (
                                    <div
                                        key={item._id}
                                        className={`modal-item ${item._id === interviewId ? 'modal-item--current' : ''}`}
                                        onClick={() => {
                                            setShowHistoryModal(false)
                                            if (item._id !== interviewId) {
                                                navigate(`/interview/${item._id}`)
                                            }
                                        }}
                                    >
                                        <div className='modal-item__info'>
                                            <h4>{item.title || 'Untitled Position'}</h4>
                                            <span>
                                                {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                {item._id === interviewId && ' • Currently viewing'}
                                            </span>
                                        </div>
                                        <span className='modal-item__badge'>{item.matchScore}% Match</span>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#7d8590', textAlign: 'center', margin: '1rem 0' }}>No other plans found.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Interview