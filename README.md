const log4js = require('log4js');
log4js.loadAppender('tcpAppender', tcp);
log4js.addAppender(log4js.appenders.tcpAppender({path: tcp://localhost:9838}, layouts.jsonlayout ));

