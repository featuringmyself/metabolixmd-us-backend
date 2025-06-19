const mongoose = require('mongoose');
const {paginate} = require('./plugins/paginate');

const followUpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    type: {
      type: String,
      enum: ["consult", "refill"],
      required: true,
    },
    sideEffects: {
      nausea: {
        type: Boolean,
        default: false
      },
      constipation: {
        type: Boolean,
        default: false
      },
      vomiting: {
        type: Boolean,
        default: false
      },
      diarrhea: {
        type: Boolean,
        default: false
      }
    },
    currentWeight: {
      type: Number
    },
    newOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

followUpSchema.plugin(paginate);
const FollowUp = mongoose.model("FollowUp", followUpSchema);

module.exports = { FollowUp }; 