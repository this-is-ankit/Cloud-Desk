import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "./src/models/Course.js";

dotenv.config({ path: "./.env" });

async function enroll() {
  try {
    const uri = process.env.DB_URL;
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const course = await Course.findOne({ code: "DSA101" });
    const studentId = new mongoose.Types.ObjectId("69cbf930fecfa1f6e6b399a7");

    if (course) {
      course.enrollments.push({
        student: studentId,
        status: "approved",
        requestedAt: new Date(),
        decidedAt: new Date(),
      });
      await course.save();
      console.log(`Student enrolled in ${course.title}!`);
    } else {
      console.log("Course not found");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

enroll();
