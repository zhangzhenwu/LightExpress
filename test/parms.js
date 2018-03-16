const express = require('express');
const app = express();
app.param('uid',function(req,res,next,val,name){
    req.user = {id:1,name:'hello world'};
    next();
})
app.param('uid',function(req,res,next,val,name){
    req.user.name = 'hello';
    next();
})
app.get('/user/:uid',function(req,res){
    console.log(req.user);
    res.end('user');
});
app.listen(3000);