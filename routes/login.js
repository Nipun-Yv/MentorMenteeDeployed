import express from "express"
let router=express.Router();
import passport from "passport"
import session from "express-session"
import {Strategy} from "passport-local"
router
    .route("/login")
    .post(passport.authenticate("local",{
        successRedirect:"/secrets",
        failureRedirect:"/"
        }));
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
export default router;