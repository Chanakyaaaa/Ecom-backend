const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const dotenv=require("dotenv").config();

const app = express();
const port = 8000;
const cors = require("cors");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect(process.env.mongo_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB connected");
  })
  .catch((err) => {
    console.log("error connecting to databaase", err);
  });

app.listen(port, () => {
  console.log("server is running on port", port);
});

const User = require("./models/user");
const Order = require("./models/order");

//function tos send verification email
const sendVerificationEmail = async (email, verificationToken) => {
  //creat e a nodemailer transporter
  const transporter = nodemailer.createTransport({
    //configure the email service
    service: "gmail",
    auth: {
      user: "sesettigouthamkumar2002@gmail.com",
      pass: "dfiu unnh pneg wgti",
    },
  });

  //compose the email
  const mailOptions = {
    from: "amazon.com",
    to:email,
    subject:"email verification",
    text:`click on the link to verify your email http://localhost:8000/verify/${verificationToken}`
  }

  //send the email
  try{
    await transporter.sendMail(mailOptions);
    console.log("verification email sent");
  }
  catch(err){
    console.log("error sending verification email",err);
  }

};

//end point to register in the app

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    //check if email is already registered
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).json({ message: "email already registered" });
    }
    //crete a new user
    const newUser = new User({ name, email, password });
    //generate and the store the verification token
    newUser.verificationToken = crypto.randomBytes(20).toString("hex");
    //save the user to the database
    await newUser.save();
    res.status(201).json({ message: "user registered successfully,check your email and verify" });
    //send the verification email to the user
    sendVerificationEmail(newUser.email, newUser.verificationToken);
  } catch (err) {
    console.log("error registering user", err);
    res.status(500).json({ message: "registration failed" });
  }
});

//verify email end point
app.get("/verify/:token",async(req,res)=>{
    try{
        //find the user with the verification token
        const  user = await User.findOne({verificationToken:req.params.token});
        if(!user){
            return res.status(400).json({message:"Invalid verification token"});
        }
        //mark the user as verified
        user.verified=true; 
        user.verificationToken=undefined;
        await user.save();
        res.status(200).json({message:"Email verified successfully"});
    }
    catch{
        res.status(500).json({message:"Email verification failed"});
    }

})

const generateSecretKey=()=>{
  const secretKey=crypto.randomBytes(32).toString("hex");
  return secretKey;
}

const secretKey=generateSecretKey();


app.post("/login", async (req, res) => {
  try{
    const {email,password}=req.body;
    //check if the user exists
    const user=await User.findOne({email});
    if(!user){
      return res.status(401).json({message:"Invalid email or password"});
    }
    //check if the user has verified his email
    if(user.password!=password){
      return res.status(401).json({message:"Invalid password"});
    }
    //generate a new token
    const token=jwt.sign({userId:user._id},secretKey);
    res.status(200).json({token,message:"login successful"});
  }
  catch(err){
    res.status(500).json({message:"login failed"});
    console.log("error logging in",err);
  }
})

//endpoint to store a new address to the backend
app.post("/addresses",async(req,res)=>{
  try{
    const {userId,address}=req.body;
    //find the user by userID
    const user=await User.findById(userId);
    if(!user){
      return res.status(400).json({message:"Invalid user"});
    }
    user.addresses.push(address);
    //save the updated user to the backend
    await user.save();
    res.status(200).json({message:"address created successfully"});
  }
  catch(err){
    res.status(500).json({message:"error fetching addresses"});
  }

})


app.get("/addresses/:userId",async(req,res)=>{
  try{
    const user =await findById(req.params.userId);
    if(!user){
      return res.status(400).json({message:"User not found"});
    }
    const addresses=user.addresses;
    res.status(200).json({addresses});

  }
  catch(err){
    res.status(500).json({message:"error fetching addresses"});
  }
})