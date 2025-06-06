 const mongoose = require('mongoose');
const { paginate } = require('./plugins/paginate');

const meetingSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    meetLink: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    notes: {
      type: String,
    },
    startTime: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["consultation", "follow-up", "emergency"],
      default: "consultation",
    }
  },
  { timestamps: true }
);

meetingSchema.plugin(paginate);

const Meeting = mongoose.model("Meeting", meetingSchema);

module.exports = { Meeting }; 