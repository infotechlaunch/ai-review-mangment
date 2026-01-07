const express=require('express');
const app=express();
require('dotenv').config();
const PORT=process.env.PORT||4000;
app.get("/",(req,res)=>{
res.send("hello backend is working");
    // console.log("backend working")
})
app.listen(PORT,()=>{
    console.log(`Bakend running on -> http://localhost:${PORT}`);
}) 