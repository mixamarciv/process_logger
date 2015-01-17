process_logger
============

kills the previous process of this application

## Install

```
git clone https://github.com/mixamarciv/process_logger.git
```

## Usage

```js
p = {run:'test.bat',log:'file.log',args:['argument1','arg2'],on_data:function(data){console.log(data);}}
process_logger(p,function(err,exit_code){
    console.log('child process exited with code ' + exit_code);
});

```




## License
MIT
