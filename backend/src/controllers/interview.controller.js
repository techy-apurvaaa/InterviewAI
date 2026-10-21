const { generateInterviewReport, generateTailoredResumeData, generateMoreQuestions } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const userModel = require("../models/user.model")
const { buildResumePdf } = require("../services/pdf.service")

async function extractPdfText(buffer) {
    // loaded lazily: if the PDF library has a problem on some machine, login & the rest of the API still work
    const { PDFParse } = require("pdf-parse")
    const parser = new PDFParse({ data: buffer })
    try {
        const result = await parser.getText()
        return result.text
    } finally {
        await parser.destroy?.()
    }
}

/**
 * @route POST /api/interview
 * @description generate a new interview report from resume (pdf) and/or self description + job description
 * @access private
 */
async function generateInterviewReportController(req, res) {
    const { selfDescription, jobDescription } = req.body

    if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({ message: "Job description is required" })
    }

    if (!req.file && (!selfDescription || !selfDescription.trim())) {
        return res.status(400).json({ message: "Provide a resume (PDF) or a self description" })
    }

    let resumeContent = ""
    if (req.file) {
        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({ message: "Only PDF resumes are supported" })
        }
        resumeContent = await extractPdfText(req.file.buffer)
    }

    const interviewReportByAi = await generateInterviewReport({
        resume: resumeContent,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeContent,
        selfDescription,
        jobDescription,
        ...interviewReportByAi
    })

    res.status(201).json({
        message: "Interview report generated successfully",
        interviewReport
    })
}

/**
 * @route GET /api/interview/report/:interviewId
 * @description get one interview report of the logged-in user
 * @access private
 */
async function getInterviewReportByIdController(req, res) {
    const { interviewId } = req.params

    if (!/^[a-f\d]{24}$/i.test(interviewId)) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    const interviewReport = await interviewReportModel.findOne({
        _id: interviewId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    res.status(200).json({
        message: "Interview report fetched successfully",
        interviewReport
    })
}

/**
 * @route GET /api/interview
 * @description list all interview reports of the logged-in user (newest first)
 * @access private
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel
        .find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select("-resume -selfDescription -jobDescription -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully",
        interviewReports
    })
}

/**
 * @route POST /api/interview/resume/pdf/:interviewId
 * @route GET /api/interview/resume/pdf/:interviewId
 * @description generates and downloads a tailored resume PDF for the specific interview plan
 * @access private
 */
async function generateResumePdfController(req, res) {
    const { interviewId } = req.params

    if (!/^[a-f\d]{24}$/i.test(interviewId)) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    const interviewReport = await interviewReportModel.findOne({
        _id: interviewId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    const user = await userModel.findById(req.user.id)
    const candidateName = user?.username || "Candidate"
    const email = user?.email || ""

    let tailoredResume = interviewReport.tailoredResume
    if (!tailoredResume) {
        tailoredResume = await generateTailoredResumeData({
            candidateName,
            email,
            resume: interviewReport.resume,
            selfDescription: interviewReport.selfDescription,
            jobDescription: interviewReport.jobDescription,
            title: interviewReport.title,
            matchScore: interviewReport.matchScore
        })

        // Save generated resume to prevent redundant AI calls on re-downloads
        interviewReport.tailoredResume = tailoredResume
        await interviewReport.save()
    }

    const sanitizedTitle = (interviewReport.title || "Resume").replace(/[^a-zA-Z0-9_-]/g, "_")
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="resume_${sanitizedTitle}.pdf"`)

    buildResumePdf(tailoredResume, res)
}

/**
 * @route POST /api/interview/report/:interviewId/questions
 * @description generate additional technical or behavioral practice questions and append them to the report
 * @body { type: "technical" | "behavioral", count?: number (1-10, default 5) }
 * @access private
 */
async function generateMoreQuestionsController(req, res) {
    const { interviewId } = req.params
    const type = req.body?.type
    const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 5, 1), 10)

    if (![ "technical", "behavioral" ].includes(type)) {
        return res.status(400).json({ message: "type must be 'technical' or 'behavioral'" })
    }

    if (!/^[a-f\d]{24}$/i.test(interviewId)) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    const interviewReport = await interviewReportModel.findOne({
        _id: interviewId,
        user: req.user.id
    })

    if (!interviewReport) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    const field = type === "technical" ? "technicalQuestions" : "behavioralQuestions"
    const existing = interviewReport[field].map(q => ({ question: q.question }))

    const { questions, source } = await generateMoreQuestions({
        type,
        count,
        existing,
        jobDescription: interviewReport.jobDescription,
        resume: interviewReport.resume,
        selfDescription: interviewReport.selfDescription,
        title: interviewReport.title
    })

    if (questions.length === 0) {
        return res.status(200).json({
            message: "You have already practiced every available question for this role. Great work!",
            added: 0,
            source,
            interviewReport
        })
    }

    interviewReport[field].push(...questions)
    await interviewReport.save()

    res.status(200).json({
        message: `${questions.length} new ${type} question${questions.length > 1 ? "s" : ""} added`,
        added: questions.length,
        source,
        interviewReport
    })
}

/**
 * @route DELETE /api/interview/:interviewId
 * @description deletes an interview report from the user's history
 * @access private
 */
async function deleteInterviewReportController(req, res) {
    const { interviewId } = req.params

    if (!/^[a-f\d]{24}$/i.test(interviewId)) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    const deleted = await interviewReportModel.findOneAndDelete({
        _id: interviewId,
        user: req.user.id
    })

    if (!deleted) {
        return res.status(404).json({ message: "Interview report not found" })
    }

    res.status(200).json({
        message: "Interview report deleted successfully",
        deletedId: interviewId
    })
}

module.exports = {
    generateInterviewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController,
    generateMoreQuestionsController,
    deleteInterviewReportController
}
