const express = require("express");
const router = express.Router();
const followUpController = require("../../controllers/followUp.controller");
const { firebaseAuth } = require("../../middlewares/firebaseAuth.js");

router.post("/", firebaseAuth(), followUpController.createFollowUp);
router.get("/check-eligibility", firebaseAuth(), followUpController.checkEligibility);
router.get("/:id", firebaseAuth(), followUpController.getFollowUpById);
router.get("/", firebaseAuth(), followUpController.getFollowUpsByUserId);

module.exports = router; 