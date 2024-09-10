import express from "express"
import bodyParser from "body-parser"
import bcrypt from "bcrypt"
import passport from "passport"
import session from "express-session"
import {Strategy} from "passport-local"
import pg from "pg"
import puppeteer from "puppeteer";
import {google} from "googleapis"
import opn from 'open'
import { URL } from 'url';
import path from 'path';
import Anthropic from "@anthropic-ai/sdk";
import ev from "dotenv"
import http from "http"
// const server = http.createServer(app);

// server.keepAliveTimeout = 120000; 
// server.headersTimeout = 120000;
ev.config()
const saltRounds=10;
const app=express();
const port=process.env.PORT || 3000;
const host = process.env.PGHOST;
const port1 = process.env.PGPORT;
const user = process.env.PGUSER;
const password = process.env.PGPASSWORD;
const database = process.env.PGDATABASE;
const connectionString = `postgresql://${user}:${password}@${host}:${port1}/${database}`;

const db=new pg.Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})
db.connect();
app.use(express.static("./public"))
app.use(bodyParser.urlencoded({extended:true}));
app.listen(port,()=>{
    console.log("Server running successfully") 
})
app.use(session({
    saveUninitialized:false,
    secret:"TOPSECRETTOBEMADEENV",
    resave:true
}))

app.use(passport.initialize());
app.use(passport.session());
app.get("/",(req,res)=>{
    res.render("login.ejs");})
app.get("/home",async (req,res)=>{
  if(req.isAuthenticated()){
    if(req.user.role=="M"){
      const result=await db.query("select * from conn where mentor_id=$1",[req.user.mid]);
      const inter=result.rows;
      var mentees=[]
      for(var i=0;i<inter.length;i++){
        const m=await db.query("select * from mentees where mid=$1",[inter[i].mentee_id]);
        const mentee=m.rows[0];
        var obj={description:inter[i].description,src:mentee.src,name:mentee.fullname,complete:inter[i].complete,quality:inter[i].quality,mid:inter[i].mentee_id};
        mentees.push(obj);
      }
      res.render("mentorhome.ejs",{mentees:mentees});
    }
    else{
      const result=await db.query("select mid,src,fullname,card,organisation,price from mentors where price is not NULL");
      const mentors=result.rows;
      res.render("menteehome.ejs",{mentors:mentors});
    }
  }
  else{
    res.redirect("/")
  }
})
app.get("/my-requests",async (req,res)=>{
  if(req.isAuthenticated() && req.user.role!="M"){
  try{
    const result=await db.query("select * from conn where mentee_id=$1",[req.user.mid]);
    const inter=result.rows;
    console.log(inter);
    var mentors=[]
    for(var i=0;i<inter.length;i++){
      const m=await db.query("select * from mentors where mid=$1",[inter[i].mentor_id]);
      const mentor=m.rows[0];
      var obj={description:inter[i].description,src:mentor.src,name:mentor.fullname,complete:inter[i].complete,quality:inter[i].quality,mid:inter[i].mentor_id,meet:inter[i].meet,meettime:inter[i].meettime,meetdate:inter[i].meetdate};
      mentors.push(obj);
    }
    console.log(mentors)
    res.render("mentee-requests.ejs",{mentees:mentors});
  }catch(err){
    console.log(err.message);
    res.redirect("/home")
  }
}
  else{
    res.redirect("/")
  }
})
app.post("/mentor-details",async (req,res)=>{
  if(req.isAuthenticated() && req.user.role!="M"){
    console.log(req.body);
    try{
    const result=await db.query("select linkedin,mid,src,fullname,credentials,card,organisation,price from mentors where mid=$1",[req.body.mentor]);
    const mentor=result.rows[0];
    console.log(mentor);
    res.render("mentor-details.ejs",{mentor:mentor})}
    catch(err){
      console.log(err.message);
      res.redirect("/")
    }
  }
  else{
    res.redirect("/");
  }
})
var d=new Date();
console.log(new Date().toLocaleDateString())
app.post("/book",async(req,res)=>{
  if(req.isAuthenticated() && req.user.role!="M"){
    console.log(req.body);
    try{
    await db.query("insert into conn values($1,$2,$3,$4,$5,$6,$7)",[req.body.mid,req.user.mid,new Date().toLocaleDateString(),req.body.price,false,null,req.body.description])
    res.redirect(process.env.RAZOR_PAY);}
    catch(err){
      console.log(err.message);
      res.redirect("/home");
    }
  }
  else{
    res.redirect("/")
  }
})
app.get("/profile",async (req,res)=>{
  if(req.isAuthenticated()){
  if(req.user.role=="M"){
    const result=await db.query("select * from mentors where mid=$1",[req.user.mid]);
    const data=result.rows[0];
    res.render("profile.ejs",{username:data.username,credentials:data.credentials,
      organisation:data.organisation,linkedin:data.linkedin,fullname:data.fullname,price:data.price,
      src:data.src,tags:data.card
    });
  }
  else{
    const result=await db.query("select * from mentees where mid=$1",[req.user.mid]);
    const data=result.rows[0];
    res.render("profileE.ejs",{username:data.username,description:data.description,
      organisation:data.organisation,linkedin:data.linkedin,fullname:data.fullname,
      src:data.src
    });
  }
}
  else{
    res.redirect("/")
  }
})
app.post("/profile",async (req,res)=>{
  if(req.isAuthenticated()){
    if(req.user.role=="M"){
      if(req.body.linkedin!=""){
         const browser = await puppeteer.launch({ headless: true});
         const page = await browser.newPage();
         await page.goto(req.body.linkedin);
         console.log("Done");
         await page.waitForSelector('img');
         const profilePictureUrl = await page.evaluate(() => {
            var img = document.querySelectorAll("#main-content img");
            console.log(img[1].src);
             return img[1].src;
            });
          const client = await page.createCDPSession();
          await client.send('Network.clearBrowserCookies');
          await client.send('Network.clearBrowserCache');
          await browser.close();
        await db.query("update mentors set fullname=$1,src=$2,credentials=$3,linkedin=$4,organisation=$5,price=$6,card=$7 where mid=$8",
          [req.body.name,profilePictureUrl,req.body.credentials,req.body.linkedin,req.body.organisation,req.body.pricing?req.body.pricing:null,req.body.tags,req.user.mid]
        )
        res.redirect("/profile");
      }
      else{
        await db.query("update mentors set fullname=$1,credentials=$2,linkedin=$3,organisation=$4,price=$5,card=$6 where mid=$7",
          [req.body.name,req.body.credentials,req.body.linkedin,req.body.organisation,req.body.pricing,req.body.tags,req.user.mid]
        )
        res.redirect("/profile");
      }
    }
    else{
      if(req.body.linkedin!=""){
         const browser = await puppeteer.launch({ headless: true});
         const page = await browser.newPage();
         await page.goto(req.body.linkedin);
         console.log("Done");
         await page.waitForSelector('img');
         const profilePictureUrl = await page.evaluate(() => {
            var img = document.querySelectorAll("#main-content img");
            console.log(img[1].src);
             return img[1].src;
            });
          const client = await page.createCDPSession();
          await client.send('Network.clearBrowserCookies');
          await client.send('Network.clearBrowserCache');
          await browser.close();
        await db.query("update mentees set fullname=$1,src=$2,description=$3,linkedin=$4,organisation=$5 where mid=$6",
          [req.body.name,profilePictureUrl,req.body.description,req.body.linkedin,req.body.organisation,req.user.mid]
        )
        res.redirect("/profile");
      }
      else{
        await db.query("update mentees set fullname=$1,description=$2,linkedin=$3,organisation=$4 where mid=$5",
          [req.body.name,req.body.description,req.body.linkedin,req.body.organisation,req.user.mid]
        )
        res.redirect("/profile");
      }
    }
  }
    else{
      res.redirect("/")
    }
})

app.post("/login", passport.authenticate("local",{
    successRedirect:"/home",
    failureRedirect:"/"
    }));
app.get("/register",async (req,res)=>{
  res.render("register.ejs");
})
app.post("/register",async (req,res)=>{
  console.log(req.body)
  try{
    if(req.body.role=="mentor"){
      bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result=await db.query("Insert into mentors(fullname,username,pass,organisation) values ($1,$2,$3,$4) RETURNING *",[req.body.full_name,req.body.email,hash,req.body.organisation]);
          await db.query("Insert into status values ($1,$2)",[result.rows[0].username,'M']);
          res.redirect("/")
        }
      });
    }
    else{
      bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result=await db.query("Insert into mentees(fullname,username,pass,organisation) values ($1,$2,$3,$4) RETURNING *",[req.body.full_name,req.body.email,hash,req.body.organisation]);
          await db.query("Insert into status values ($1,$2)",[result.rows[0].username,'E']);
          const user1={mid:result.rows[0].mid,role:"E"};
          res.redirect("/");
        }
      });
    }
  }
  catch(err){
    console.log(err);
    res.send("User already exists, please go to the login page");
  }
})
passport.use(new Strategy(async function verify(username,password,cb){
    console.log("Check")
    try{
        const rese=await db.query("Select * from mentors");
        console.log("before")
        const result=await db.query("SELECT * FROM status where username=$1",[username]);
        console.log("Here")
        if(result.rowCount>0){
            try{
                const data=result.rows[0];
                console.log(data);
                const details=await db.query(`Select * from ${data.status=='M'?"Mentors":"Mentees"} where username=$1`,[username]);
                let storedHashedPassword=details.rows[0].pass;
                bcrypt.compare(password, storedHashedPassword, (err, result) => {
                    if (err) {
                      return cb(err);
                    } else {
                      if (result) {
                        return cb(null,{mid:details.rows[0].mid, role:data.status});
                      } else { 
                        return cb(null,false);
                      }
                    }
                  });
            }catch(err){
                console.log(err);
                cb(err);
            }
        }
        else{
            cb("User Not found");
        }
    }
    catch(err){
        console.log(err);
        cb("Internal Server Error");
    }
}))
passport.serializeUser((details,cb)=>{
    cb(null,details);
});
passport.deserializeUser((details,cb)=>{
    cb(null,details);
});

//-------------------MODULE PART
app.post("/module",async(req,res)=>{
  if(req.isAuthenticated() && req.user.role=="M"){
  try{
      const result=await db.query("SELECT * FROM modules where mentor_id=$1 and mentee_id=$2 order by mno",[req.user.mid,req.body.mid]);
      const data=result.rows;
      console.log(data);
      res.render("mentorchart.ejs",{modules:data,mentee:req.body.mid});
  }
  catch(err){
    console.log(err)
      res.send("Server Error, please try again later")
  }}
  else{
    res.redirect("/");
  }
})
app.post("/add",async (req,res)=>{
  if(req.isAuthenticated()){
  try{
  const result=await db.query("SELECT count(MNo) FROM Modules where mentee_id=$1 and mentor_id=$2",[req.body.mid,req.user.mid])
  const data=result.rows;
  console.log(data)
  try{
      await db.query("INSERT into Modules(mno,heading,description,duration,mentor_id,mentee_id) values($1,$2,$3,$4,$5,$6)",[Number(data[0].count)+1,'Add Heading','Add Description','Add Duration',req.user.mid,req.body.mid]);
      try{
        const result=await db.query("SELECT * FROM modules where mentor_id=$1 and mentee_id=$2 order by mno",[req.user.mid,req.body.mid]);
        const data=result.rows;
        console.log(data);
        res.render("mentorchart.ejs",{modules:data,mentee:req.body.mid});
       }
      catch(err){
        console.log(err.message);
        res.send("Server Error, please try again later")
      }
  }
  catch(err){
      console.log(err.message);
      res.send("Server error, please try again later")
  }
}
  catch(err){
      res.redirect("/")
  }}
  else{
    res.redirect("/")
  }
})
app.post("/update",async(req,res)=>{
  if(req.isAuthenticated()){
  console.log(req.body)
  try{
      const result=await db.query("Update modules set heading=$1, duration=$2, description=$3 where Mno=$4 and mentor_id=$5 and mentee_id=$6",[
          req.body.heading, req.body.duration,req.body.description,Number(req.body.number),req.user.mid,req.body.mid]
      )
      try{
      const result1=await db.query("SELECT * FROM modules where mentor_id=$1 and mentee_id=$2 order by mno",[req.user.mid,req.body.mid]);
      const data=result1.rows;
      console.log(data);
      res.render("mentorchart.ejs",{modules:data,mentee:req.body.mid});}
      catch(err){
        console.log(err.message);
        res.redirect("/home");
      }
  }
  catch(err){
      console.log(err.message);
      res.send("Not OK");
  }
}
else{
  res.redirect("/");
}
})
//--Mentee Nodule
app.post("/view-modules",async(req,res)=>{
  if(req.isAuthenticated() && req.user.role=="E"){
  try{
      const result=await db.query("SELECT * FROM modules where mentor_id=$1 and mentee_id=$2 order by mno",[req.body.mid,req.user.mid]);
      const data=result.rows;
      console.log(data);
      res.render("menteechart.ejs",{modules:data,mentee:req.body.mid});
  }
  catch(err){
    console.log(err)
      res.send("Server Error, please try again later")
  }}
  else{
    res.redirect("/");
  }
})
//Meet related routing
app.post("/meet",async (req,res)=>{
  if(req.isAuthenticated() && req.user.role=="M"){
    try{
      const result=await db.query("select meet from conn where mentor_id=$1 and mentee_id=$2",[req.user.mid,req.body.mid]);
      const data=result.rows[0];
      if(data.meet=="" || data.meet==null){
        res.render("meet.ejs",{mid:req.body.mid});
       }
      else{
        res.redirect(data.meet);
      }
    }
  catch(err){
    console.log(err.message);
    res.redirect("/home");
  }
}
  else{
  res.redirect("/");
}
})
///
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URL =process.env.REDIRECT_URL
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});
app.post('/auth', async (req, res) => {
  if(req.isAuthenticated() && req.user.role=="M"){
  try{
      await db.query("update conn set meet=$1 , meetdate=$2 , meettime=$3,duration=$4 where mentor_id=$5 and mentee_id=$6",["flag",req.body.date,req.body.time,req.body.duration,req.user.mid,req.body.mid]);
      res.redirect(url);
       }
  catch(err){
    console.log(err.message);
    res.redirect("/home");
  }
}
  else{
    res.redirect("/")
  }
  // res.redirect(url);
});
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  const link=await createMeetLink();
  await db.query("update conn set meet=$1 where mentor_id=$2 and meet='flag'",[link,req.user.mid])
  res.redirect("/home")
});
async function createMeetLink() {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const event = {
    summary: 'Sample Meeting',
    description: 'A chance to hear more about Google Meet API',
    start: {
      dateTime: '2024-10-01T10:00:00-07:00',
      timeZone: 'America/Los_Angeles',
    },
    end: {
      dateTime: '2024-10-01T10:30:00-07:00',
      timeZone: 'America/Los_Angeles',
    },
    conferenceData: {
      createRequest: {
        requestId: 'sample-request-id',
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    reminders: {
      useDefault: true,
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.conferenceData.entryPoints[0].uri;
    return meetLink
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}
app.post("/calculate",async (req,res)=>{
  if(req.isAuthenticated() && req.user.role=="M"){
    const result=await db.query("Select description from conn where mentor_id=$1 and mentee_id=$2",[req.user.mid,req.body.mid]);
    const md=result.rows[0].description;
    console.log("Hello there"+md);
    const res1=await db.query("Select heading, description from modules where mentor_id=$1 and mentee_id=$2",[req.user.mid,req.body.mid]);
    var fr=JSON.stringify(res1.rows);
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  const msg = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 2000,
    temperature: 1,
    system: "Generate a score(1 to 100) on how relevant and extensive the text is to "+md+" and return the score only and nothing else",
    messages: [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": fr
          }
        ]
      }
    ]
  });
  console.log(msg);
  await db.query("update conn set quality=$1 where mentor_id=$2 and mentee_id=$3",[msg.content[0].text,req.user.mid,req.body.mid])
  res.redirect("/home")}
  else{
    res.redirect("/");
  }
})