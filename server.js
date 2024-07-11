const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const axios = require("axios");
const nodemailer = require("nodemailer");
require("dotenv").config();

const PORT = 3000;

const app = express();
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/whetherdata");

const getCityFromCoordinates = async (latitude, longitude) => {
  const apiKey = "f8e56271245bfbe1c06faa73b24fc908";
  const url = `http://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;

  try {
    const response = await axios.get(url);
    return response.data.name;
  } catch (error) {
    console.error("Error fetching city from coordinates:", error);
    throw new Error("Could not fetch city data");
  }
};

app.post("/api/users", async (req, res) => {
  const { email, latitude, longitude } = req.body;

  if (!email || !latitude || !longitude) {
    return res.status(400).send("Missing email, latitude or longitude");
  }

  try {
    const city = await getCityFromCoordinates(latitude, longitude);
    const newUser = new User({
      email,
      location: { latitude, longitude, city },
    });
    await newUser.save();
    res.status(201).send(newUser);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put("/api/user/:email/location", async (req, res) => {
  const { email } = req.params;
  const { latitude, longitude } = req.body;

  try {
    const city = await getCityFromCoordinates(latitude, longitude);
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { location: { latitude, longitude, city } },
      { new: true }
    );
    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/api/users/:email/weather", async (req, res) => {
  const { email } = req.params;
  const { date } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const weatherData = user.weatherReports.filter(
      (report) => report.date === date
    );
    res.status(200).send(weatherData);
  } catch (error) {
    res.status(500).send(error);
  }
});

setInterval(async () => {
  const users = await User.find();
  for (const user of users) {
    const weatherData = await getWeatherData(
      user.location.latitude,
      user.location.longitude
    );
    await User.updateOne(
      { email: user.email },
      {
        $push: {
          weatherReports: {
            date: new Date().toISOString().split("T")[0],
            weatherData,
          },
        },
      }
    );
    sendEmail(user.email, weatherData);
  }
}, 3 * 60 * 60 * 1000);

async function getWeatherData(latitude, longitude) {
  const response = await axios.get(
    `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.OPENWEATHER_API_KEY}`
  );
  return response.data;
}

function sendEmail(email, weatherData) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Your Weather Report",
    text: `Weather data: ${JSON.stringify(weatherData)}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

app.get("/", (req, res) => {
  res.json("Hello");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
