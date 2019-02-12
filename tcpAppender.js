
"use strict";


require('../mylayout.js');
var layouts = require('log4js').layouts;
var net = require('net')
, util = require('util');
var url=require('url');
const RETRY_PERIOD = 10000;


function LoggerSocket(){
  this.connected =false;
  this.socket =null;
  this.host = null;
  this.port =null;
  this.sendLog = sendLog;
  this.flush = flush;
  this.post_message=post_message;
  this.log_queue = [];
  this.err_callback=null;
  this.disable_logging = false;
  this.verbose=false;
  this.log=log;
  this.log_verbose=log_verbose;
};

/**
 * Description Appender
 * @method tcpAppender
 * @param {} config
 * @param {} layout
 * @return FunctionExpression
 */
function tcpAppender (config, layout) {

  
  var path = config.path || 'tcp://127.0.0.1:9838'
  
  var parsedUrl = url.parse(path);
 
  var logger_socket = new LoggerSocket();
  logger_socket.host=parsedUrl.hostname;
  logger_socket.port=parsedUrl.port;
  logger_socket.disable_logging = config.disable_logging || false;
  logger_socket.verbose = process.env.DEBUG_LOGGER  || false;
  logger_socket.err_callback = config.err_callback || null; // how to detect socket not writing??

  initiate_socket(logger_socket);
  

  var type = config.logType ? config.logType : config.category;
  
  layout = layout || layouts.dummylayout;


  if(!config.fields) {
    config.fields = {};
  }


  return function log(loggingEvent) {

    var logObject = layout(loggingEvent);
      //console.log(logObject);
      logger_socket.sendLog(logObject);
    
    }
}


function log(msg){
  if(!this.disable_logging)
    console.log(msg);
}


 

function initiate_socket(logger_socket) {
  logger_socket.log('slog4js: initiate_socket host: ' + logger_socket.host + ' port:' + logger_socket.port );

  //var connecting =true;
  var socket = logger_socket.socket = new net.Socket();
 
  socket.on('error', function (err) {
    //connecting = false;
    logger_socket.connected = false;

    // call callback to app to raise an alert..
    if(logger_socket.err_callback)
      logger_socket.err_callback(err);

    if (typeof(socket) !== 'undefined' && socket != null) {
      socket.destroy();
    }

    socket = null;

    logger_socket.log('slog4js: event error - ' + err.message);
    
  });


  socket.on('connect', function () {
     logger_socket.log('slog4js: event connect');
  });

  socket.on('close', function (had_error) {
    logger_socket.log('slog4js: event close had_error: ' + had_error);

    logger_socket.connected = false;
    //connecting = false;
    
    // call callback to app to raise an alert..
    if(logger_socket.err_callback)
      logger_socket.err_callback(new Error('closed connection to logging'));

    //if (!connecting) {
        setTimeout(function () {
          initiate_socket(logger_socket);
        }, RETRY_PERIOD);
    //}
  });
   
  socket.connect(logger_socket.port, logger_socket.host, function () {
    logger_socket.log('slog4js: socket connected host:' + logger_socket.host + ' port:' + logger_socket.port );

    //connecting = false;
    logger_socket.connected=true
    logger_socket.flush();
  });

  
}

function flush()
{
    this.log_verbose("slog4js: Flushing message - connection_state: " + this.connected);

    while(this.log_queue.length>0 && this.connected)
    {
      var msg = this.log_queue.shift();
      this.post_message(msg);
    } 
    //console.log(this.log_queue.length);
    
       
}


function log_verbose(str){
  //console.log("Log verbose...");
  if(this.verbose) //process.env.DEBUG_LOGGER == "true"
    this.log(str);
}

function post_message(logObject){

  var _obj = this;
  this.log_verbose("slog4js: Posting message");

   try{
        this.socket.write(JSON.stringify(logObject) + '\n', function(err){
              if(err) {
                _obj.log("slog4js: ERROR ==========> Writing to socket threw error: " + err.message);
                if(_obj.err_callback)
                  _obj.err_callback(err);

              }
        });
    }
    catch(err){
        _obj.log_verbose("slog4js: Posting message .. ERROR ========> " + err.message);
        if(_obj.err_callback)
          _obj.err_callback(err);


    }
}

/**
 * Description log function
 * @method sendLog
 * @param {} socket
 * @param {} logObject
 * @return 
 */
function sendLog(logObject) {
    this.log_verbose("slog4js: in send log: connection_state -  " + this.connected);

    //console.log(this);
    if(this.connected)
      this.post_message(logObject);
    else{
     this.log_verbose("slog4js: pushing to queue - Queue size " + this.log_queue.length);

      if(this.log_queue.length > 100) {
        this.log_queue.shift(); 
      }//remove first element
      this.log_queue.push(logObject);
     
    }

}

/**
 * Description configure
 * @method configure
 * @param {} config
 * @return CallExpression
 */
function configure(config) {
  var layout;
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout);
  }
  return tcpAppender(config, layout);
}


exports.appender = tcpAppender;
exports.configure = configure;


