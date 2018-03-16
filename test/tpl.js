const express = require('express');
const path = require('path');
const html = require('../lib/html');
const app = express();
const fs = require('fs');
app.engine('html',html);
console.log(path.join(__dirname,'views'))
app.set('views',path.join(__dirname,'views'));
app.set('view engine','html');
app.get('/',function(req,res,next){
    res.render('index',{title:'hello',user:{name:'hello world'}});
});
app.listen(3000);