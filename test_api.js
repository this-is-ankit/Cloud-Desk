import axios from "axios";

const API_URL = "http://localhost:3000/api/courses";

async function test() {
  try {
    // I need a dev auth header for a student
    const studentHeaders = {
      "x-dev-clerk-id": "user_69454215932948ab7d7ddd9e", // Ankit Kumar
      "x-dev-email": "ankit@kumar.com",
      "x-dev-name": "Ankit Kumar",
      "x-dev-role": "student"
    };

    console.log("Testing discovery scope for student...");
    const res1 = await axios.get(`${API_URL}?scope=discover`, { headers: studentHeaders });
    console.log(`Discovery courses count: ${res1.data.courses.length}`);
    res1.data.courses.forEach(c => console.log(`  - ${c.title} (Status: ${c.status})`));

    console.log("\nTesting enrolled scope for student...");
    const res2 = await axios.get(`${API_URL}?scope=enrolled`, { headers: studentHeaders });
    console.log(`Enrolled courses count: ${res2.data.courses.length}`);

  } catch (err) {
    console.error(err.message);
    if (err.response) console.log(err.response.data);
  }
}

test();
