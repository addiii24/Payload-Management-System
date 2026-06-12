import dotenv from "dotenv";
dotenv.config();
import app from "./src/App.js";
import connectdb from "./src/config/db.js";

const PORT = process.env.PORT || 4000;

connectdb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on PORT ${PORT} ✅`);
    })
  })
  .catch((error) => {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  })