const url = require('url');
const Route = require('./route');
const Layer = require('./layer');
const slice = Array.prototype.slice;
const methods = require('methods');
const init = require('../middleware/init');
function Router() {
    function router(req, res, next) {
        router.handle(req, res, next);
    }
    Object.setPrototypeOf(router, proto);
    router.stack = [];
    router.paramCallbacks = {};
    router.use(init);
    return router;
}
const proto = Object.create(null);
proto.route = function (path) {
    const route = new Route(path);
    const layer = new Layer(path, route.dispatch.bind(route));
    layer.route = route;
    this.stack.push(layer);
    return route;
}

methods.forEach(function (method) {
    proto[method] = function (path) {
        let route = this.route(path);
        route[method].apply(route, slice.call(arguments, 1));
        return this;
    }
})

proto.use = function (handler) {
    let path = '/', router = this._router;
    if (typeof handler != 'function') {
        path = handler;
        handler = arguments[1];
    }
    let layer = new Layer(path, handler);
    layer.route = undefined;
    this.stack.push(layer);
    return this;
}

proto.handle = function (req, res, out) {
    let idx = 0, self = this, removed = '', slashAdded = false;
    let { pathname } = url.parse(req.url, true);
    function next(err) {
        if (slashAdded) {
            req.url = '';
            slashAdded = true;
        }
        if (removed.length > 0) {
            req.url = removed + req.url;
            removed = '';
        }
        if (idx >= self.stack.length) {
            return out();
        }
        let layer = self.stack[idx++];
        if (layer.match(pathname)) {
            if (err) {
                layer.handle_error(err, req, res, next);
            } else {
                if (!layer.route) {
                    let removed = layer.path;
                    req.url = req.url.slice(0, removed.length);
                    if (req.url == '') {
                        req.url = '/';
                        slashAdded = true;
                    }
                    layer.handle_request(req, res, next)
                } else if (layer.route._handles_method(req.method)) {
                    req.params = layer.params;
                    self.process_params(layer, req, res, function () {
                        layer.handle_request(req, res, next);
                    })
                } else {
                    next(err);
                }
            }
        } else {
            next(err);
        }
    }
    next();
}
proto.param = function (name, handler) {
    if (!this.paramCallbacks[name]) {
        this.paramCallbacks[name] = []
    }
    this.paramCallbacks[name].push(handler);
}
proto.process_params = function (layer, req, res, done) {
    const paramCallbacks = this.paramCallbacks;
    const keys = layer.keys;
    if (!keys || keys.length == 0) {
        return done();
    }
    let keyIndex = 0, name, callbacks, key, val;
    function param() {
        if (keyIndex >= keys.length) {
            return done();
        }
        key = keys[keyIndex++];
        name = key.name;
        val = req.params[name];
        callbacks = paramCallbacks[name];
        if (!val || !callbacks) {
            return param();
        }
        execCallback();
    }
    let callbackIndex = 0;
    function execCallback() {
        let cb = callbacks[callbackIndex++];
        if (!cb) {
            return param();
        }
        cb(req, res, execCallback, val, name);
    }
    param();
}

exports = module.exports = Router;