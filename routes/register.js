import express from "express"
let router=express.Router();

router
    .route("/register")
    .get(async (req,res)=>{
        res.render("register.ejs");
      })
    .post(async (req,res)=>{
        console.log(req.body)
        try{
          if(req.body.role=="mentor"){
            bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
              if (err) {
                console.error("Error hashing password:", err);
              } else {
                const result=await db.query("Insert into mentors(fullname,username,pass,organisation) values ($1,$2,$3,$4) RETURNING *",[req.body.full_name,req.body.email,hash,req.body.organisation]);
                await db.query("Insert into status values ($1,$2)",[result.rows[0].username,'M']);
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
                // req.login(user1,(err)=>{
                //   console.log(err);
                //   res.redirect("/secrets");
                // })
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
export default router;