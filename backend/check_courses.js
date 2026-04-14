import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "./src/models/Course.js";
import User from "./src/models/User.js";

dotenv.config({ path: "./.env" });

async function check() {
  try {
    const uri = process.env.DB_URL;
    if (!uri) throw new Error("DB_URL is not defined");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const courses = await Course.find({}).populate("teacher");
    console.log(`Total courses in DB: ${courses.length}`);

    courses.forEach((c) => {
      console.log(`- Course: ${c.title} (${c.code}), Status: ${c.status}, Teacher: ${c.teacher?.name}, Enrollments: ${c.enrollments.length}`);
    });

    const students = await User.find({ role: "student" });
    console.log(`Total students in DB: ${students.length}`);

    if (students.length > 0) {
      const student = students[0];
      console.log(`Checking for student: ${student.name} (${student._id})`);
      
      const enrolledCourses = await Course.find({ "enrollments.student": student._id });
      console.log(`Courses enrolled by this student: ${enrolledCourses.length}`);
      enrolledCourses.forEach(c => console.log(`  - ${c.title}`));

      const publishedCourses = await Course.find({ status: "published" });
      console.log(`Published courses: ${publishedCourses.length}`);
      publishedCourses.forEach(c => console.log(`  - ${c.title}`));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

check();
