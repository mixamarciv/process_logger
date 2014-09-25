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
  if(!p.log) return fn(new Error("ОШИБКА: не задан параметр log"));
  if (!p.args && p.arguments) p.args = p.arguments;
  else if (p.args && p.arguments) p.args.concat(p.arguments);
  
  var fs = require('fs');
  var log = fs.createWriteStream(p.log, {flags: 'w'});
  //далее переопределяем функцию записи, для одновременного вывода в консоль и записи в лог с датой и временем
  log._write_old = log._write;
  var i_call = 0;
  var show_time_in_log = 1;
  log._write = function(chunk, enc, next){ 
      if(++i_call == 1 || !show_time_in_log) return log._write_old.apply(this,arguments);  //первый кусок почему то вызывается по 2 раза
      var str = chunk.toString();
      process.stdout.write(str);  //выводим в консоль то что получили..
      str = prepare_str_to_log(str,i_call-1);
      
      arguments[0] = new Buffer(str, p.enc); //заменяем строку для записи на новую
      log._write_old.apply(this,arguments);
  }

  var util = require('util');  
  log.write('\nstart app:'+p.run+' log:'+p.log+' args:'+util.inspect(p.args)+'\n');
  

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
    log.write('\nexit code: '+code);
    log.end();
    fn(0,code);
  });
  
  pr.on('error', function (err) {
    log.write('\nERROR: '+util.inspect(err));
  });

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


