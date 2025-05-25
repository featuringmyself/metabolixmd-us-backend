const { Meeting } = require('../models/meeting.models');
const { Order } = require('../models/order.models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const createMeeting = async (meetingBody) => {
  const meeting = await Meeting.create(meetingBody);
  return meeting;
};

const getMeetingById = async (id) => {
  const meeting = await Meeting.findById(id);
  if (!meeting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found');
  }
  return meeting;
};

const getMeetingsByUser = async (userId) => {
  const meetings = await Meeting.find({ user: userId })
    .sort({ startTime: -1 })
    .populate('order', 'orderNo status');
  return meetings;
};

const getMeetingsByOrder = async (orderId) => {
  const meetings = await Meeting.find({ order: orderId })
    .sort({ startTime: -1 });
  return meetings;
};

const updateMeetingById = async (meetingId, updateBody) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found');
  }
  Object.assign(meeting, updateBody);
  await meeting.save();
  return meeting;
};

const deleteMeetingById = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found');
  }
  await meeting.remove();
  return meeting;
};

module.exports = {
  createMeeting,
  getMeetingById,
  getMeetingsByUser,
  getMeetingsByOrder,
  updateMeetingById,
  deleteMeetingById,
}; 