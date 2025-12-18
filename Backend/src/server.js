import { ENV } from "./lib/env.js";
import express from "express";
import cors from "cors";
const PORT = ENV.PORT ;

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (req, res) => {
  res.send("API is running smoothly!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;