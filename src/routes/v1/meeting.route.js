const express = require('express');
const { meetingController } = require('../../controllers');
const { firebaseAuth } = require('../../middlewares/firebaseAuth');
const catchAsync = require('../../utils/catchAsync');
const { Meeting } = require('../../models/meeting.models');

const router = express.Router();

console.log('Mounting /meeting route');

// Admin routes
router.post('/', firebaseAuth('All'), (req, res, next) => {
  console.log('POST /v1/meeting hit');
  meetingController.createMeeting(req, res, next);
});
router.get('/order/:orderId', firebaseAuth('Admin'), (req, res, next) => {
  console.log('GET /v1/meeting/order/:orderId hit');
  meetingController.getOrderMeetings(req, res, next);
});
router.get('/admin/all', firebaseAuth('Admin'), catchAsync(async (req, res) => {
  console.log('GET /v1/meeting/admin/all hit');
  const meetings = await Meeting.find({})
    .sort({ startTime: -1 })
    .populate('user', 'name email')
    .populate('order', 'orderNo status');
  res.send({ data: meetings });
}));
router.patch('/:meetingId', firebaseAuth('Admin'), (req, res, next) => {
  console.log('PATCH /v1/meeting/:meetingId hit');
  meetingController.updateMeeting(req, res, next);
});
router.delete('/:meetingId', firebaseAuth('Admin'), (req, res, next) => {
  console.log('DELETE /v1/meeting/:meetingId hit');
  meetingController.deleteMeeting(req, res, next);
});

// User routes
router.get('/user', firebaseAuth('All'), (req, res, next) => {
  console.log('GET /v1/meeting/user hit');
  meetingController.getUserMeetings(req, res, next);
});
router.get('/:meetingId', firebaseAuth('All'), (req, res, next) => {
  console.log('GET /v1/meeting/:meetingId hit');
  meetingController.getMeeting(req, res, next);
});

module.exports = router; 