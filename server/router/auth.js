const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const authenticate = require('../middleware/authenticate');

require('../db/conn');
const User = require('../model/userSchema');

// Configure the Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,  // Use environment variables for security
    pass: process.env.EMAIL_PASS,   
  },
});

// Root Route
router.get("/", (req, res) => {
  res.send("Server is running");
});

// Register User
router.post("/register", async (req, res) => {
  const { name, email, password, cpassword, phone, address } = req.body;

  if (!name || !email || !phone || !address || !password || !cpassword) {
    return res.status(400).json({ error: "Please fill in all the required fields" });
  }

  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ error: "Email already exists" });
    } else if (password !== cpassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    } else {
      const user = new User({ name, email, password, cpassword, phone, address });
      await user.save();

      res.status(200).json({ message: "Registration Successful" });
    }
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Sign In User
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter email and password" });
    }

    const userLogin = await User.findOne({ email });

    if (userLogin) {
      const isMatch = await bcrypt.compare(password, userLogin.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid Credentials" });
      }

      const token = await userLogin.generateAuthToken();
      res.cookie("jwtoken", token, {
        expires: new Date(Date.now() + 25892000000), // 30 days
        httpOnly: true,
      });

      return res.status(200).json({ message: "Login Successful" });
    } else {
      return res.status(400).json({ error: "User not registered" });
    }
  } catch (err) {
    console.error("Sign-in Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get User Data
router.get("/getdata", authenticate, (req, res) => {
  res.send(req.rootUser);
});

// File Grievance with Dynamic Email Notification to Admin
router.post("/grievance", authenticate, async (req, res) => {
  try {
    const { name, email, phone, dept, grievance } = req.body;

    if (!name || !email || !phone || !grievance) {
      return res.status(400).json({ error: "Please fill all the required fields" });
    }

    const userContact = await User.findOne({ _id: req.userID });
    if (userContact) {
      await userContact.addGrievance(name, email, phone, dept, grievance);
      await userContact.save();

      // Prepare email options with user's email as the sender
      const mailOptions = {
        from: email,  // Sender address (user's email)
        to: 'thokkukrishnaprasad@gmail.com',  // Replace with admin's email address
        subject: 'New Grievance Submitted',
        text: `A new grievance has been submitted by ${name} (Email: ${email}).\n\nDetails:\nDepartment: ${dept}\nPhone: ${phone}\nGrievance: ${grievance}`,
      };

      // Send email notification
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          return res.status(500).json({ error: "Grievance submitted, but failed to send email notification" });
        } else {
          console.log('Email sent: ' + info.response);
          return res.status(200).json({ message: "Grievance Filed Successfully and Email Sent to Admin" });
        }
      });
    }
  } catch (err) {
    console.error("Grievance Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Grievance List
router.get("/grievancelist", async (req, res) => {
  try {
    const grievanceList = await User.find(
      { grievances: { "$not": { "$size": 0 } } },
      { grievances: 1 }
    );

    if (!grievanceList) {
      return res.status(404).json({ error: "No grievances found" });
    }

    res.status(200).json(grievanceList);
  } catch (err) {
    console.error("Grievance List Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout User
router.get("/logout", (req, res) => {
  res.clearCookie('jwtoken', { path: "/" });
  res.status(200).json({ message: "Logout Successful" });
});

module.exports = router;
