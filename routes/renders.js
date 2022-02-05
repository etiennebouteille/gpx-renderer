import express from 'express';
import Render from '../models/Renders.js';
const router = express.Router();

router.get('/:id', async (req, res) => {
    await Render.findByPk(req.params.id)
    .then( render => {
        if(render == null){
            res.redirect('/');
        } else if(req.session.createdRender.indexOf(render.id) >= 0){ //check if render id has been created by this session
            res.render('render_editable', {render})
        } else {
            res.render('render', {render})
        }
    })
    .catch(err => {
        res.end();
    })    
});

router.post("/:id", async (req, res) => {
    await Render.upsert({
        id:req.params.id,
        title:req.body.title,
        defaultTitle:false
    }).then(([instance, created]) => {
        res.render('render_editable', {render:instance})
    })
})

export default router;