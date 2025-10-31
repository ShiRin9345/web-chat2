const express = require("express");
const app = express();
app.use(express.json());
app.post("/test", (req, res) => {
  console.log(req.body);
  const {message} = req.body
  res.send("Hello World");
});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});