const express = require('express');
const { meetingController } = require('../../controllers');
const { firebaseAuth } = require('../../middlewares/firebaseAuth');

const router = express.Router();

// Admin routes
router.post('/', firebaseAuth('All'), meetingController.createMeeting);
router.get('/order/:orderId', firebaseAuth('Admin'), meetingController.getOrderMeetings);
router.patch('/:meetingId', firebaseAuth('Admin'), meetingController.updateMeeting);
router.delete('/:meetingId', firebaseAuth('Admin'), meetingController.deleteMeeting);

// User routes
router.get('/user', firebaseAuth('All'), meetingController.getUserMeetings);
router.get('/:meetingId', firebaseAuth('All'), meetingController.getMeeting);

module.exports = router; 