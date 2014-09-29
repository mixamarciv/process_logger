/****
 *  run and show process info
 *  p = {run:'test.bat',log:'file.log',args:['argument1','arg2']}
 *  process_logger(p,function(err,exit_code){
 *      console.log('child process exited with code ' + exit_code);
 *  });
 *
 ****/
var iconv = require('iconv-lite');
iconv.extendNodeEncodings();

module.exports = process_logger;

function process_logger(p,fn) {
  if(!p.run) return fn(new Error("ОШИБКА: не задан параметр run"));
  if(!p.log){
    p.__write_log_to_file = 0;
    //return fn(new Error("ОШИБКА: не задан параметр log"));
  }else{
    p.__write_log_to_file = 1;
  }
  if (!p.args && p.arguments) p.args = p.arguments;
  else if (p.args && p.arguments) p.args.concat(p.arguments);
  
  var log = {};
  if (p.__write_log_to_file) {
      var fs = require('fs');
      log = fs.createWriteStream(p.log, {flags: 'w'});
      //далее переопределяем функцию записи, для одновременного вывода в консоль и записи в лог с датой и временем
      log._write_old = log._write;
      var i_call = 0;
      var show_time_in_log = 1;
      log._write = function(chunk, enc, next){ 
          if(++i_call == 1 || !show_time_in_log) return log._write_old.apply(this,arguments);  //первый кусок почему то вызывается по 2 раза
          var i_call0 = i_call - 1;
          var str = chunk.toString();
          if(isFunction(p.on_data)){
              //process.stdout.write(str);  //выводим в консоль то что получили..
              p.on_data(str,i_call0);
          }
          str = prepare_str_to_log(str,i_call0);
          
          arguments[0] = new Buffer(str, p.enc); //заменяем строку для записи на новую
          log._write_old.apply(this,arguments);
      }
      
      log.write('\n');
  }else{
      log.write = process.stdout.write;
      log.end = function(){};
  }

  if (p.debug) {
    var util = require('util');  
    log.write('\nstart app:'+p.run+' log:'+p.log+' args:'+util.inspect(p.args)+'\n');
  }

  var spawn = require('child_process').spawn;
  var pr = spawn(p.run, p.args);
  
  if (!p.enc) p.enc = p.encoding;
  if (!p.enc){
    if (process.platform=='win32') p.enc = 'CP866';
  }
  if (p.enc){
    pr.stdout.setEncoding(p.enc);
    pr.stderr.setEncoding(p.enc);
  }
  
  pr.stdout.pipe(log,{ end: false });
  pr.stderr.pipe(log,{ end: false });
  
  pr.on('close', function (code) {
    if (p.debug) log.write('\nexit code: '+code);
    log.end();
    fn(0,code);
  });
  
  pr.on('error', function (err) {
    log.write('\nERROR: '+util.inspect(err));
  });

}

//http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function get_date_str() {
  var d = new Date();
  var s = d.getFullYear()+'.'+
          String(100+d.getMonth()+1).substring(1)+'.'+
          String(100+d.getDate()).substring(1)+' '+
          String(100+d.getHours()).substring(1)+':'+
          String(100+d.getMinutes()).substring(1)+':'+
          String(100+d.getSeconds()).substring(1)+'.'+
          String(1000+d.getMilliseconds()).substring(1)
  ;
  return s;
}

function prepare_str_to_log(s,i) {
  var time_info = get_date_str()+': ';
  s = s.replace(/\r\n/gm,'\n');
  s = s.replace(/\n\r/gm,'\n');
  s = s.replace(/\n/gm,'\n'+time_info);
  return s;  
}


