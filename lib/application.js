const http = require('http');
const Router = require('./Router')
const methods = require('methods');
const path = require('path');
function Application() {  
    this.settings = {};
    this.engines = {}; 
}
Application.prototype.set = function(key,val){
    if(arguments.length == 1){
        return this.settings[key];
    }
    this.settings[key] = val;
    return this;
}

Application.prototype.engine = function(ext,fn){
  let extension = ext[0]=='.'?ext:'.'+ext;
  this.engines[extension] = fn;
  return this;
}

Application.prototype.render = function(name,options,callback){
    let engines = this.engines;
    let type = '.'+this.get('view engine');
    let render = engines[type];
    name = name.includes('.')?name:name+type;
    let file = path.join(this.get('views'),name);
    render(file,options,callback);
}
//懒加载router
Application.prototype.lazyRouter = function () {
    if(!this._router){
        this._router = new Router();
    }
}
methods.forEach(function (method) {
    Application.prototype[method] = function () {
        if(method == 'get'){
            if(arguments.length == 1){
                return this.set(arguments[0]);
            }
        }
        this.lazyRouter();
        this._router[method].apply(this._router,arguments);
        return this;
    }
})

Application.prototype.use = function(handler){
    this.lazyRouter();
    let path = '/';
    let router = this._router;
    if(typeof handler != 'function'){
        path = handler;
        handler = arguments[1];
    }
    router.use(path,handler);
    return this;
}

Application.prototype.param = function () {
    this.lazyRouter();
    this._router.param.apply(this._router,arguments);
    return this;
}

Application.prototype.listen = function () {
    const self = this;
    let server = http.createServer(function (req,res) {
        function done() {
            res.writeHead(200,{'Content-Type':'text/plain'});
            res.end('NOT FOUND');
        }
        res.app = self;
        self._router.handle(req,res,done);
    })
    server.listen.apply(server,arguments);
}
exports = module.exports = Application;