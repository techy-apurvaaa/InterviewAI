const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "question is required"],
    },
    intention: {
        type: String,
        required: [true, "intention is required"],
    },
    answer: {
        type: String,
        required: [true, "answer is required"],
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
    },
    category: {
        type: String,
    }
}, {
    _id: false,
})

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [true, "Skill is required"]
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: [true, "severity is required"]
    }
}, {
    _id: false,
})

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [true, "day is required"],
    },
    focus: {
        type: String,
        required: [true, "focus is required"],
    },
    tasks: [{
        type: String,
        required: [true, "task is required"]
    }]
}, {
    _id: false,
})

const interviewReportSchema = new mongoose.Schema({
    title: {
        type: String,
    },

    jobDescription: {
        type: String,
        required: [true, "Job Description is required"]
    },

    resume: {
        type: String,
    },

    selfDescription: {
        type: String,
    },

    matchScore: {
        type: Number,
        min: 0,
        max: 100,
    },

    // NOTE: these names must match the AI schema (ai.service.js) and the frontend (Interview.jsx)
    technicalQuestions: [questionSchema],
    behavioralQuestions: [questionSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preparationPlanSchema],

    tailoredResume: {
        type: Object,
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    }
}, {
    timestamps: true
})

const interviewReportModel = mongoose.model("InterviewReport", interviewReportSchema)
module.exports = interviewReportModel;
