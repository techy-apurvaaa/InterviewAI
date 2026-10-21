import React, { useState, useRef, useEffect } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import Navbar from '../../../components/Navbar'
import Toast from '../../../components/Toast'

const SAMPLE_JOB = `Senior Full-Stack Software Engineer
Company: CloudScale AI Technologies
Location: Remote / Hybrid

Role Overview:
We are seeking an experienced Senior Full-Stack Engineer to lead the architecture and delivery of high-throughput web applications and AI-driven workflow tools.

Key Responsibilities:
• Architect, build, and maintain robust microservices with Node.js, TypeScript, and Express.
• Develop responsive, accessible, and high-performance frontends using React, modern CSS, and Vite.
• Design and optimize MongoDB and PostgreSQL schemas with complex indexing for high concurrency.
• Implement automated testing (Jest, Cypress), CI/CD pipelines, and containerization using Docker.
• Collaborate with product managers, AI engineers, and UI/UX designers in an agile environment.

Requirements:
• 3+ years of professional full-stack development experience.
• Strong foundation in JavaScript/TypeScript, RESTful API architecture, and asynchronous event loops.
• Experience with cloud deployments, Docker, and distributed caching (Redis).
• Excellent communication, system design skills, and passion for engineering excellence.`

const SAMPLE_PROFILE = `Experienced Full-Stack Developer with 3+ years of experience designing and deploying scalable web services with Node.js, Express, React, and MongoDB. Proven track record of optimizing API response times by 35% through Redis caching and query indexing. Comfortable leading cross-functional teams, implementing CI/CD pipelines with Docker and GitHub Actions, and building intuitive, responsive user experiences.`

const Home = () => {
    const { loading, generateReport, getReports, reports, deleteReport } = useInterview()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ selectedFile, setSelectedFile ] = useState(null)
    const [ error, setError ] = useState("")
    const [ searchQuery, setSearchQuery ] = useState("")
    const [ toast, setToast ] = useState(null)
    const resumeInputRef = useRef()

    const navigate = useNavigate()

    // load the user's previous reports when the home page opens
    useEffect(() => {
        getReports()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.type !== 'application/pdf') {
                setError('Only PDF resumes are supported.')
                return
            }
            setSelectedFile(file)
            setError('')
            setToast({ message: `Resume attached: ${file.name}`, type: 'success' })
        }
    }

    const handleClearFile = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setSelectedFile(null)
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ''
        }
    }

    const handleFillDemo = () => {
        setJobDescription(SAMPLE_JOB)
        setSelfDescription(SAMPLE_PROFILE)
        setSelectedFile(null)
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ''
        }
        setError("")
        setToast({
            message: "✨ Loaded demo job description & candidate profile! Click 'Generate My Interview Strategy' to test.",
            type: "success"
        })
    }

    const handleClearAll = () => {
        setJobDescription("")
        setSelfDescription("")
        setSelectedFile(null)
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ''
        }
        setError("")
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return ''
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const handleGenerateReport = async () => {
        setError("")
        const resumeFile = selectedFile || resumeInputRef.current?.files?.[0]

        if (!jobDescription.trim()) {
            setError("Please paste the job description or click 'Try Demo Data' above.")
            return
        }
        if (!resumeFile && !selfDescription.trim()) {
            setError("Please upload a resume (PDF) or write a quick self description.")
            return
        }

        try {
            const data = await generateReport({ jobDescription, selfDescription, resumeFile })
            navigate(`/interview/${data._id}`)
        } catch (err) {
            setError(err?.response?.data?.message || "Could not generate the report. Please try again.")
        }
    }

    const handleDelete = async (reportId, e) => {
        e.stopPropagation()
        if (window.confirm("Are you sure you want to delete this interview plan?")) {
            await deleteReport(reportId)
            setToast({ message: "Interview plan deleted.", type: "info" })
        }
    }

    const filteredReports = (reports || []).filter(rep => {
        const title = (rep.title || 'Untitled Position').toLowerCase()
        return title.includes(searchQuery.toLowerCase())
    })

    return (
        <>
            <Navbar />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* shown while generating */}
            {loading && (
                <main className='loading-screen'>
                    <div className='spinner' />
                    <h1>Analyzing &amp; Generating Your Strategy...</h1>
                    <p>Our AI is cross-referencing your profile with the job requirements (approx. 10-20s)</p>
                </main>
            )}

            <div className='home-page' style={loading ? { display: 'none' } : undefined}>

                {/* Page Header */}
                <header className='page-header'>
                    <div className='hero-pill'>
                        <span>⚡ Powered by Google Gemini AI &bull; ATS PDF Synthesis</span>
                    </div>
                    <h1>Create Your Custom <span className='highlight'>Interview Plan</span></h1>
                    <p>Let our AI analyze the job requirements and your unique profile to build a winning technical strategy, questions, roadmaps, and tailored resume.</p>

                    {/* Quick Demo Action Bar */}
                    <div className='demo-action-bar'>
                        <button
                            type="button"
                            onClick={handleFillDemo}
                            className='demo-fill-btn'
                            title="Auto-fill with sample job description and candidate background"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                            </svg>
                            ✨ Auto-Fill Sample Demo Data
                        </button>

                        {(jobDescription || selfDescription || selectedFile) && (
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className='clear-form-btn'
                                title="Reset all input fields"
                            >
                                Clear Inputs
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Card */}
                <div className='interview-card'>
                    <div className='interview-card__body'>

                        {/* Left Panel - Job Description */}
                        <div className='panel panel--left'>
                            <div className='panel__header'>
                                <span className='panel__icon'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                </span>
                                <h2>Target Job Description</h2>
                                <span className='badge badge--required'>Required</span>
                            </div>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => { setJobDescription(e.target.value) }}
                                className='panel__textarea'
                                placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                                maxLength={5000}
                            />
                            <div className='char-counter'>{jobDescription.length} / 5000 chars</div>
                        </div>

                        {/* Vertical Divider */}
                        <div className='panel-divider' />

                        {/* Right Panel - Profile */}
                        <div className='panel panel--right'>
                            <div className='panel__header'>
                                <span className='panel__icon'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                </span>
                                <h2>Your Profile</h2>
                            </div>

                            {/* Upload Resume */}
                            <div className='upload-section'>
                                <label className='section-label'>
                                    Upload Resume
                                    <span className='badge badge--best'>Best Results</span>
                                </label>

                                {selectedFile ? (
                                    <div className='file-preview'>
                                        <div className='file-preview__info'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                <polyline points="10 9 9 9 8 9" />
                                            </svg>
                                            <div>
                                                <div className='file-name'>{selectedFile.name}</div>
                                                <div className='file-size'>{formatFileSize(selectedFile.size)}</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className='file-preview__remove'
                                            onClick={handleClearFile}
                                            title="Remove attached resume"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label className='dropzone' htmlFor='resume'>
                                        <span className='dropzone__icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                        </span>
                                        <p className='dropzone__title'>Click to upload resume</p>
                                        <p className='dropzone__subtitle'>PDF only (Max 3MB)</p>
                                    </label>
                                )}
                                <input
                                    ref={resumeInputRef}
                                    onChange={handleFileChange}
                                    hidden
                                    type='file'
                                    id='resume'
                                    name='resume'
                                    accept='.pdf'
                                />
                            </div>

                            {/* OR Divider */}
                            <div className='or-divider'><span>OR</span></div>

                            {/* Quick Self-Description */}
                            <div className='self-description'>
                                <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                                <textarea
                                    value={selfDescription}
                                    onChange={(e) => { setSelfDescription(e.target.value) }}
                                    id='selfDescription'
                                    name='selfDescription'
                                    className='panel__textarea panel__textarea--short'
                                    placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                                />
                            </div>

                            {/* Info Box */}
                            <div className='info-box'>
                                <span className='info-box__icon'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                                </span>
                                <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                            </div>
                        </div>
                    </div>

                    {/* Card Footer */}
                    <div className='interview-card__footer'>
                        {error && (
                            <div className='footer-error'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}
                        <span className='footer-info'>AI-Powered Strategy Generation &bull; Approx 10-20s</span>
                        <button
                            onClick={handleGenerateReport}
                            className='generate-btn'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                            Generate My Interview Strategy
                        </button>
                    </div>
                </div>

                {/* Recent Reports / History Section */}
                <section id='history-section' className='recent-reports'>
                    <div className='recent-reports__header'>
                        <div className='title-group'>
                            <h2>Previous History</h2>
                            <span className='count-badge'>{reports?.length || 0} plans</span>
                        </div>
                        {reports?.length > 0 && (
                            <input
                                type='text'
                                className='search-input'
                                placeholder='Search past plans...'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        )}
                    </div>

                    {filteredReports.length > 0 ? (
                        <div className='reports-grid'>
                            {filteredReports.map(report => (
                                <div
                                    key={report._id}
                                    className='report-card'
                                    onClick={() => navigate(`/interview/${report._id}`)}
                                >
                                    <div className='report-card__top'>
                                        <div>
                                            <h3 className='report-card__title'>{report.title || 'Untitled Position'}</h3>
                                            <p className='report-card__meta'>
                                                Created {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <span className={`match-pill ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                            {report.matchScore}% Match
                                        </span>
                                    </div>

                                    <div className='report-card__actions'>
                                        <button
                                            type='button'
                                            className='open-btn'
                                            onClick={() => navigate(`/interview/${report._id}`)}
                                        >
                                            View Strategy &rarr;
                                        </button>
                                        <button
                                            type='button'
                                            className='delete-btn'
                                            onClick={(e) => handleDelete(report._id, e)}
                                            title='Delete interview plan'
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='empty-history'>
                            <p>
                                {searchQuery ? 'No interview plans matched your search.' : 'No previous interview plans yet. Fill in the details above or click "Auto-Fill Sample Demo Data" to create your first one!'}
                            </p>
                        </div>
                    )}
                </section>

                {/* Page Footer */}
                <footer className='page-footer'>
                    <span>GenAI Career Strategist &bull; Full-Stack Career Intelligence</span>
                </footer>
            </div>
        </>
    )
}

export default Home