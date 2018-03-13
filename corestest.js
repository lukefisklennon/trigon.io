var cluster = require("cluster");

var cpuNum = 2;

if (cluster.isMaster) {
	for (var i=0;i<cpuNum;i++) {
		cluster.fork();
	};
} else {
	console.log(Date.now());
};