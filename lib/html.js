const fs = require('fs');
function render(filepath,options,callback){
  fs.readFile(filepath,'utf8',function(err,content){
      if(err) return callback(err);
      let head = "let tpl = ``;\n with(obj){\n tpl +=`";
      content = content.replace(/<%=([\s\S]+?)%>/g,function(){
          return "${"+arguments[1]+"}";
      });
      content = content.replace(/<%([\s\S]+?)%>/g,function(){
          return "`;\n"+arguments[1]+" tpl+=`";
      });
      let tail = "`\n}\nreturn tpl;";
      let html = head + content + tail;
      html = new Function('obj',html);
      html = html(options);
      return callback(null,html);
  })
}
module.exports = render;