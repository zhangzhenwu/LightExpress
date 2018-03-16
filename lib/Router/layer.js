const pathToRegexp = require('path-to-regexp');
function Layer(path,handler) {
    this.path = path;
    this.handler = handler;
    this.regexp = pathToRegexp(this.path,this.keys = []);
}
Layer.prototype.match = function (path) {
    if(this.path == path){
        return true;
    }
    if(this.route){
        this.params = {};
        let matches = this.regexp.exec(path);
        if(matches){
            for(let i=1;i<matches.length;i++){
                let key = this.keys[i-1];
                let prop = key.name;
                this.params[prop] = matches[i];
            }
            return true;
        }
    }
    if(!this.route){
        if(this.path == '/'){
            return true;
        }
        if(this.path = path.slice(0,this.path.length)){
            return true;
        }
    }
    return false;
}
Layer.prototype.handle_request = function (req,res,next) {
    this.handler(req,res,next);
}
Layer.prototype.handle_error = function (err,req,res,next) {
    if(this.handler.length !=4){
        return next(err);
    }
    this.handler(err,req,res,next);
}
exports = module.exports = Layer;