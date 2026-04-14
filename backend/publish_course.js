import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "./src/models/Course.js";

dotenv.config({ path: "./.env" });

async function publish() {
  try {
    const uri = process.env.DB_URL;
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const course = await Course.findOne({ code: "DSA101" });
    if (course) {
      course.status = "published";
      await course.save();
      console.log(`Course ${course.title} published!`);
    } else {
      console.log("Course not found");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

publish();
