const url = require('url');
let kk = 'http://www.baidu.com/kk?id=10';
let res = url.parse(kk,true,true);
console.log(res);
function kk() {
    console.log('1111');
}
function ll() {
    console.log('22222')
}

let s = function () {
    ll();
}
s();