const express = require("express")

const authMiddleware = require("../middlewares/auth.middleware")
const interviewRouter = express.Router()
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")

/**
 * @route POST /api/interview
 * @description generate new interview report on the basis of given info
 * @access private
 */
interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.generateInterviewReportController)

/**
 * @route GET /api/interview
 * @description get all interview reports of the logged-in user
 * @access private
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description get a single interview report by id
 * @access private
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)

/**
 * @route POST /api/interview/report/:interviewId/questions
 * @description generate more technical / behavioral practice questions for an existing report
 * @access private
 */
interviewRouter.post("/report/:interviewId/questions", authMiddleware.authUser, interviewController.generateMoreQuestionsController)

/**
 * @route POST /api/interview/resume/pdf/:interviewId
 * @route GET /api/interview/resume/pdf/:interviewId
 * @description generate & download resume pdf for given interview report
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewId", authMiddleware.authUser, interviewController.generateResumePdfController)
interviewRouter.get("/resume/pdf/:interviewId", authMiddleware.authUser, interviewController.generateResumePdfController)

/**
 * @route DELETE /api/interview/:interviewId
 * @description delete an interview report from user history
 * @access private
 */
interviewRouter.delete("/:interviewId", authMiddleware.authUser, interviewController.deleteInterviewReportController)

module.exports = interviewRouter
