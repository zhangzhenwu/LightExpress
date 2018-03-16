// const express = require('express');
const express = require('../lib/express.js');
const app = express();
app.get('/',function(req,res){
    res.end('hello');
});
app.listen(8080,function(){
    console.log('server started on port 8080');
});