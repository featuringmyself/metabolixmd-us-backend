const catchAsync = require('../utils/catchAsync');
const meetingService = require('../services/meeting.service');
const orderService = require('../services/order.service');
const userService = require('../services/user.service');
const { sendEmail } = require('../microservices/mail.service');
const path = require('path');
const ejs = require('ejs');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const createMeeting = catchAsync(async (req, res) => {
  const { orderId, meetLink, meetTime, duration, startTime, type, notes } = req.body;
  
  console.log('Meeting creation request received:', req.body);
  
  // Create meeting object
  const meetingData = {
    user: req.user._id,
    meetLink,
    startTime,
    type: type || 'consultation',
    notes: notes || 'Scheduled via Calendly'
  };
  
  console.log('Processed meeting data:', meetingData);

  // If orderId is provided, validate and add it to meeting data
  if (orderId) {
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    }
    meetingData.order = orderId;
    
    // Update order status if it exists
    await orderService.updateOrderById(orderId, { status: 'scheduleMeet' });
  }

  // Create meeting
  console.log('Creating meeting with data:', meetingData);
  const meeting = await meetingService.createMeeting(meetingData);
  console.log('Meeting created:', meeting);

  // Send confirmation email
  const user = await userService.getUserById(req.user._id);
  const html = await ejs.renderFile(path.join(__dirname, '../views/scheduleMeetMail.ejs'), {
    name: user.name,
    meetLink,
    meetTime: startTime // Using startTime as meetTime
  });

  await sendEmail({
    to: user.email,
    subject: 'Appointment Confirmation and Meeting Details',
    html
  });

  res.status(201).send({ data: meeting, message: 'Meeting scheduled successfully' });
});

const getMeeting = catchAsync(async (req, res) => {
  const meeting = await meetingService.getMeetingById(req.params.meetingId);
  res.send({ data: meeting });
});

const getUserMeetings = catchAsync(async (req, res) => {
  const meetings = await meetingService.getMeetingsByUser(req.user._id);
  res.send({ data: meetings });
});

const getOrderMeetings = catchAsync(async (req, res) => {
  const meetings = await meetingService.getMeetingsByOrder(req.params.orderId);
  res.send({ data: meetings });
});

const updateMeeting = catchAsync(async (req, res) => {
  const meeting = await meetingService.updateMeetingById(req.params.meetingId, req.body);
  res.send({ data: meeting, message: 'Meeting updated successfully' });
});

const deleteMeeting = catchAsync(async (req, res) => {
  await meetingService.deleteMeetingById(req.params.meetingId);
  res.status(204).send();
});

module.exports = {
  createMeeting,
  getMeeting,
  getUserMeetings,
  getOrderMeetings,
  updateMeeting,
  deleteMeeting,
}; 