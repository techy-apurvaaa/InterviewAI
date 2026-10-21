import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf, deleteInterviewReport, generateMoreQuestions } from "../services/interview.api"
import { useContext } from "react"
import { InterviewContext } from "../interview.context"

export const useInterview = () => {
    const context = useContext(InterviewContext)

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports } = context

    // throws on failure so the page can show the server's message
    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } finally {
            setLoading(false)
        }
    }

    // returns the report, or null if it could not be loaded
    const getReportById = async (interviewId) => {
        setLoading(true)
        try {
            const response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            console.error(error)
            return null
        } finally {
            setLoading(false)
        }
    }

    // returns the list of reports ([] if it could not be loaded)
    const getReports = async () => {
        setLoading(true)
        try {
            const response = await getAllInterviewReports()
            setReports(response.interviewReports)
            return response.interviewReports
        } catch (error) {
            console.error(error)
            return []
        } finally {
            setLoading(false)
        }
    }

    // Downloads the tailored resume PDF without interrupting the view
    const getResumePdf = async (interviewReportId, reportTitle) => {
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            const cleanTitle = (reportTitle || "resume").replace(/[^a-zA-Z0-9_-]/g, "_")
            link.setAttribute("download", `resume_${cleanTitle}.pdf`)
            document.body.appendChild(link)
            link.click()
            setTimeout(() => {
                link.remove()
                window.URL.revokeObjectURL(url)
            }, 1000)
            return true
        } catch (error) {
            console.error("Failed to download resume PDF:", error)
            throw error
        }
    }

    // Adds more practice questions to the open report without showing the full-page loader.
    // Resolves with { added, source, message }; throws on failure so the page can show the server's message.
    const addMoreQuestions = async (interviewId, { type, count = 5 }) => {
        const data = await generateMoreQuestions({ interviewId, type, count })
        setReport(data.interviewReport)
        return { added: data.added, source: data.source, message: data.message }
    }

    // Deletes an interview report and updates local list
    const deleteReport = async (interviewId) => {
        try {
            await deleteInterviewReport(interviewId)
            setReports(prev => prev.filter(r => r._id !== interviewId))
            if (report?._id === interviewId) {
                setReport(null)
            }
            return true
        } catch (error) {
            console.error("Failed to delete interview report:", error)
            return false
        }
    }

    return {
        loading,
        report,
        reports,
        generateReport,
        getReportById,
        getReports,
        getResumePdf,
        addMoreQuestions,
        deleteReport
    }
}
