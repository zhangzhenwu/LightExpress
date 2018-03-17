# LightExpress
### 1.简介
Expres是基于Node.js平台，快速、开放、极简的web开发框架。（Expres中文官网首页原话）。之所以引用这句话，是因为这句话简单明了的告知了大家，它到底是什么。基于Node的一个开发框架，目的是给web开发提供了方便。今天我们就用测试用例开发的模式，一步步追踪Express路由系统源码是怎么实现的。

### 整体代码感知
本次实践项目，完整目录结构如下(以下会直接说某个文件的内容)：
```
Express
  |--lib
  |   |-express.js（主文件）
  |   |-application.js（相当于中转站直接访问路由信息）
  |   |-Router（路由，中间件）
  |       |-index.js
  |       |-layer.js
  |       |-route.js
  |
  |--test
  |   |-getTest.js
  |   |-routerTest.js
  |   |-middleTest.js
```

### 测试用例一（简单服务）
```
var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

var server = app.listen(3000, function () {
  console.log('server started on port 3000');
});
```
以上代码是Express官网入门的一个最简单的实例，简单的搭建了一个服务，并且访问根目录的时候，会返回Hello World！我们可以看到app是引用后的express执行得到的一个对象（说明express是一个函数），并且在该对象上有get和listen两个方法。主文件express.js，结构如下:
```
const app = require('./application');
function createApplication(){
   return app;
}
module.exports = createApplication;
```
application.js中应该具有一个对象，并且该对象上面有两个方法.首先有一个存放路由的数组，默认有一个对象，我定义为兜底对象，就是当输入的路由信息并不存在的时候，执行该对象的handler。到此，两个文件执行完毕，我们就实现最简单的服务搭建以及get路由功能。
```
let router = [
    {
        path:'*',
        method:'*',
        handler(req,res){
            res.end('Not Found');
        }
    }

];
let http = require('http');
const app = {
    get(path,handler){
        router.push({
            method:'get',
            path,
            handler
        });
    },
    listen(){
        const server = http.createServer(function(req,res){
            for(let i=0;i<router.length;i++){
                let {path,method,handler} = router[i];
                if(path == req.url && method == req.method.toLowerCase()){
                    return handler(req,res);
                }
            }
            router[0].handler(req,res);
        });
        server.listen.apply(server,arguments);
    }
}
module.exports  = app;
```
### 测试用例二（路由）
```
app.get('/',function(req,res,next){
    console.log(1);
    next();
},function(req,res,next){
    console.log(11);
    next();
}).get('/',function(req,res,next){
    console.log(2);
    next();
}).get('/',function(req,res,next){
    console.log(3);
    res.end('ok');
}).get('/',function(err,req,res,next){
    res.end('catch: '+err);
});
app.listen(3000);
```
此测试用例，包含的信息薛薇有点广泛了，在此用例实现中，我们开启了express中完整路由的实现之路。下图为路由系统的实现。

![](https://user-gold-cdn.xitu.io/2018/3/17/16233546fc147d96?w=816&h=335&f=jpeg&s=72835)
Router是一个大的路由系统，存放在stack数组中，stack中的每一项称之为每一个层（layer），每一层中又存放了一个route信息，同样的，在每一个route中，也有一个stack，stack中存放的也是一个个的层。外层的Router只是辨别路径，如果路径匹配直接进来，内层的route辨别方法，执行相对应的handler。这么设计是因为，有的时候一个路由有多个请求方法，比如/person,可以get，也可以post,那么在外层，我们直接匹配路径就行了，等进入里面的route再寻找具体的handler。为了方便扩展，我们把application.js中返回的对象，定义为一个类，同时引入methods这个包，支持多种请求方式。
```
methods.forEach(function(method){
    Application.prototype[method] = function(){
       this.lazyrouter();
       this._router[method].apply(this._router,slice.call(arguments));
       return this;
    }
});
```
其中this.lazyrouter()即生成router对象，本质就是调用router对象里面的方法。在有请求进来的时候，直接调用self._router.handle(req,res,done)，即router的handle方法。在router里面，引入layer和route。
```
Router.prototype.route = function(path){
    const route = new Route(path);
    const layer = new Layer(path,route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    return route;
}
```
path就是请求的路径，在这一层的layer中比较重要的就是只匹配路径，具体执行就交给了route对象的dispatch方法。router中的handle方法，就是一层层的匹配路径，如下：
```
Router.prototype.handle = function(req,res,out){
    let idx=0,self=this;
    let {pathname} = url.parse(req.url,true);
    function next(err){
        if(idx >= self.stack.length){
            return out(err);
        }
        let layer = self.stack[idx++];
        if(layer.match(pathname) && layer.route&&layer.route._handles_method(req.method.toLowerCase())){
            if(err){
                layer.handle_error(err,req,res,next);
            }else{
                layer.handle_request(req,res,next);
            }
        }else{
            next();
        }
    }
    next();
}

```
当所有的都未匹配到，就走out，即我们定义的404。
设计很不错的地方，我觉得在于route的dispatch方法，也是最终执行的方法。
```
Route.prototype.dispatch = function(req,res,out){
    let idx = 0,self=this;
    function next(err){
        if(err){
            return out(err);
        }
        if(idx >= self.stack.length){
            return out(err);
        }
        let layer = self.stack[idx++];
        if(layer.method == req.method.toLowerCase()){
            layer.handle_request(req,res,next);
        }else{
            next();
        }
    }
    next();
}
```
该方法中，不断执行next，如果执行完了直接走out，此时的next其实代表的就是router种的下一个路由匹配。二者刚好无缝衔接。设计很精妙。

### 测试用例三（中间件）
```
app.use(function(req,res,next){
    console.log(11111);
    next('wrong');
});
app.get('/',function(req,res,next){
    res.end('1');
});
const person = express.Router();
person.use(function(req,res,next){
    console.log(22222);
    next();
});
person.use('/2',function(req,res,next){
    res.end('2');
});
app.use('/person',person);
app.use(function(err,req,res,next){
    res.end('catch '+err);
});
app.listen(3000,function(){
    console.log('server started at port 3000');
});
```
对于中间件，其实跟路由信息是存放于相同的位置的，但是不同的是，中间件可以没有path，这里又出现了二级路由的概念。即我们可以通过上述代码直接访问/person/2.
```
proto.use = function(handler){
  let path = '/',router= this._router;
  if(typeof handler != 'function'){
      path = handler;
      handler = arguments[1];
  }
  let layer = new Layer(path,handler);
  layer.route = undefined;
  this.stack.push(layer);
  return this;
}

```
跟路由的区别是layer的route是undefined，并且在handle的时候我们需要根据中间件的路径添加或删除信息，拼成路径寻找相应的handler。
```
  if(!layer.route){
    let removed = layer.path;
    req.url = req.url.slice(0,removed.length);
    if(req.url == ''){
        req.url = '/';
        slashAdded = true;
    }
    layer.handle_request(req,res,next)
}else if(layer.route._handles_method(req.method)){
    layer.handle_request(req,res,next);
}else{
    next(err);
}
```
其中的错误，也很好处理。在调用next的时候，传入错误信息，检测到错误信息，就直接跳到含有四个参数的处理函数即可，因为只有错误处理中间件才有四个参数。
```
Layer.prototype.handle_error = function (err,req,res,next) {
    if(this.handler.length !=4){
        return next(err);
    }
    this.handler(err,req,res,next);
}
```
### 参考
1. [从express源码中探析其路由机制](https://cnodejs.org/topic/545720506537f4d52c414d87)
2. [express官网](http://www.expressjs.com.cn/)
