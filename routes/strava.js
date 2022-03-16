import 'dotenv/config'
import express from 'express';
import StravaTokens from '../models/StravaTokens.js';
import axios from 'axios';
import url from 'url';
import slugify from 'slugify';


const router = express.Router()

router.get('/auth', async (req, res)=>{
    //TODO: handle rejection
    //check if user already has connected their Strava 
    if(req.session.stravaID){

        //check if access token is still valid
        const token = await StravaTokens.findByPk(req.session.stravaID).then(token => {return token});
        const now = Date.now();

        if(token.expires_at < now){
            //token is expired, need to request a new one
            const reAuthBody = {
                client_id:'77608',
                client_secret:process.env.STRAVA_CLIENT_SECRET,
                grant_type:'refresh_token',
                refresh_token:token.refresh_token
            }
            axios.post('https://www.strava.com/api/v3/oauth/token', reAuthBody)
                .then((_res)=> {        
                    StravaTokens.upsert({
                        id:req.session.stravaID,
                        access_token:_res.data.access_token,
                        expires_at:new Date(_res.data.expires_at * 1000),
                        refreshToken:_res.data.refresh_token
                    })
                    res.redirect('/strava/activities');
                })
                .catch((err)=>{
                    console.log(err)
                    res.status(500)
                })    
        } else {       
            res.redirect("/strava/activities");
        }        
    } else {
        //send user to conect their Strava
        //was http
        res.redirect('https://www.strava.com/oauth/authorize?client_id=77608&response_type=code&redirect_uri=http://birdview.etiennebouteille.com/strava/oauth-callback&approval_prompt=force&scope=activity:read');
    }
})

router.get('/oauth-callback', (req, res)=>{
    const body = {
        client_id:'77608',
        client_secret:process.env.STRAVA_CLIENT_SECRET,
        code:req.query.code,
        grant_type:'authorization_code'
    }
    axios.post('https://www.strava.com/oauth/token', body)
        .then((_res)=> {

            let myurl = url.format({
                pathname:"/strava/create-athlete",
                query: {
                    access_token:_res.data.access_token,
                    refresh_token:_res.data.refresh_token,
                    expires_at:_res.data.expires_at,
                    athleteID:_res.data.athlete.id                    
                }
            });

            res.redirect(myurl);
        })
        .catch((err)=>{
            console.log(err)
            res.status(500)
        })    
})

//TODO store this info on the auth callback instead of here, just got to deal with the session thing
router.get("/create-athlete", (req, res) => {
    if (req.query.athleteID) { 
    
        const athleteID = req.query.athleteID

        StravaTokens.upsert({
            id:athleteID,
            access_token:req.query.access_token,
            expires_at:new Date(req.query.expires_at * 1000),
            refresh_token:req.query.refresh_token
        })

        req.session.stravaID = athleteID;
        res.redirect('/strava/activities');
    } else {
        res.redirect("/");
    }    
})

router.get('/activities/:page', async(req, res)=>{
    const access_token = await StravaTokens.findByPk(req.session.stravaID).then(token=>{return token.access_token});

    const sorties = await getActivities(access_token, req.params.page)
    res.render('activities', {sorties, page:req.params.page});
})

router.get('/activities', async (req, res) => {
    const access_token = await StravaTokens.findByPk(req.session.stravaID).then(token=>{return token.access_token});

    const sorties = await getActivities(access_token, 1)
    res.render('activities', {sorties, page:1});
})

//return an array of activities from the users account
async function getActivities(access_token, page){
    let data = await axios.get("https://www.strava.com/api/v3/athlete/activities", {params:{per_page:7, page}, headers:{'Authorization':'Bearer ' + access_token}})
    .then((_res) => {
            const sorties = []
            for(let i = 0; i<_res.data.length; i++){
                let current = {
                    name:_res.data[i].name,
                    id:_res.data[i].id,
                    type:_res.data[i].type,
                    distance:Math.round(_res.data[i].distance * 0.001),
                    date:_res.data[i].start_date,
                    slug:slugify(_res.data[i].name)
                }
                sorties.push(current)
            }         
            console.log(_res.data)
            return sorties
        })

    return data
}

export default router;
