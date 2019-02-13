//Sample 

const log4js = require('log4js');
log4js.addAppender(log4js.appenders.tcpAppender({path: 'tcp://localhost:9838'}), 'test');

var logger = log4js.getLogger('test');
logger.trace('Entering log here');

