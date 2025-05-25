const express = require('express');
const { meetingController } = require('../../controllers');
const { firebaseAuth } = require('../../middlewares/firebaseAuth');
const catchAsync = require('../../utils/catchAsync');
const { Meeting } = require('../../models/meeting.models');

const router = express.Router();

// Admin routes
router.post('/', firebaseAuth('All'), meetingController.createMeeting);
router.get('/order/:orderId', firebaseAuth('Admin'), meetingController.getOrderMeetings);
router.get('/admin/all', firebaseAuth('Admin'), catchAsync(async (req, res) => {
  const meetings = await Meeting.find({})
    .sort({ startTime: -1 })
    .populate('user', 'name email')
    .populate('order', 'orderNo status');
  res.send({ data: meetings });
}));
router.patch('/:meetingId', firebaseAuth('Admin'), meetingController.updateMeeting);
router.delete('/:meetingId', firebaseAuth('Admin'), meetingController.deleteMeeting);

// User routes
router.get('/user', firebaseAuth('All'), meetingController.getUserMeetings);
router.get('/:meetingId', firebaseAuth('All'), meetingController.getMeeting);

module.exports = router; 