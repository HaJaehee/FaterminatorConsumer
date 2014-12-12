/*    
 * Copyright (c) 2014 Samsung Electronics Co., Ltd.   
 * All rights reserved.   
 *   
 * Redistribution and use in source and binary forms, with or without   
 * modification, are permitted provided that the following conditions are   
 * met:   
 *   
 *     * Redistributions of source code must retain the above copyright   
 *        notice, this list of conditions and the following disclaimer.  
 *     * Redistributions in binary form must reproduce the above  
 *       copyright notice, this list of conditions and the following disclaimer  
 *       in the documentation and/or other materials provided with the  
 *       distribution.  
 *     * Neither the name of Samsung Electronics Co., Ltd. nor the names of its  
 *       contributors may be used to endorse or promote products derived from  
 *       this software without specific prior written permission.  
 *  
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT  
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR  
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT  
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,  
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT  
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,  
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY  
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT  
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE  
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 
var SAAgent = null;
var SASocket = null;
var CHANNELID = 104;
var ProviderAppName = "Faterminator";

function createHTML(log_string)
{
	var log = document.getElementById('resultBoard');
	log.innerHTML = "::" + log_string + "<br>" ;
}

function onerror(err) {
	console.log("err [" + err + "]");
}

var agentCallback = {
	onconnect : function(socket) {
		var hrm = window.webapis.motion.start("HRM", function onSuccess(hrmInfo)
		{
			if(hrmInfo.heartRate > 0) 
				HR = hrmInfo.heartRate;
		});		
		window.addEventListener('devicemotion',motionListener,false);
		
		SASocket = socket;
		alert("Faterminator Connection established with RemotePeer");
		createHTML("startConnection");
		SASocket.setSocketStatusListener(function(reason){
			console.log("Service connection lost, Reason : [" + reason + "]");
			disconnect();
		});
		
		fetch();
	},
	onerror : onerror
};

var peerAgentFindCallback = {
	onpeeragentfound : function(peerAgent) {
		try {
			if (peerAgent.appName == ProviderAppName) {
				SAAgent.setServiceConnectionListener(agentCallback);
				SAAgent.requestServiceConnection(peerAgent);
			} else {
				alert("Not expected app!! : " + peerAgent.appName);
			}
		} catch(err) {
			console.log("exception [" + err.name + "] msg[" + err.message + "]");
		}
	},
	onerror : onerror
}

function onsuccess(agents) {
	try {
		if (agents.length > 0) {
			SAAgent = agents[0];
			
			SAAgent.setPeerAgentFindListener(peerAgentFindCallback);
			SAAgent.findPeerAgents();
		} else {
			alert("Not found SAAgent!!");
		}
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
}

function connect() {
	if (SASocket) {
		alert('Already connected!');
        return false;
    }
	
	try {
		webapis.sa.requestSAAgent(onsuccess, function (err) {
			console.log("err [" + err.name + "] msg[" + err.message + "]");
		});
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
}

function disconnect() {
	webapis.motion.stop("HRM");
	window.removeEventListener('devicemotion',motionListener,false);
	stopSensing();
	try {
		if (SASocket != null) {
			SASocket.close();
			SASocket = null;
			createHTML("closeConnection");
		}

	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
	
}
var exercising = null;
var updateTime = null;
function onreceive(channelId, data) {
	
	if (data == 'start sensing')
	{
		startSensing();
		createHTML(data);
	}
	else if (data == 'stop sensing')
	{
		stopSensing();
		createHTML(data);
	}
	else if (data == 'fetched! receive socket opened! received')
	{
		createHTML(data);
	}
	else 
	{
		doExercising(data);
	}
}

function fetch() {
	try {
		SASocket.setDataReceiveListener(onreceive);
		var sendFetchStart = 'fetched! receive socket opened!';
		SASocket.sendData(CHANNELID, sendFetchStart);
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
}

window.onload = function () {
    // add eventListener for tizenhwkey
    document.addEventListener('tizenhwkey', function(e) {
//        if(e.keyName == "back")
//            tizen.application.getCurrentApplication().exit();
    });    
};

function getTime (s)
{
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  return hrs + ':' + mins + ':' + secs;
}

var startTime;
function startSensing() 
{
	if (exercising == null)
	{
		exercising = setInterval (function (){
			collectSensorData();
		},2200);
	}
	
	startTime=Date.now();
	if (updateTime == null)
	{
		updateTime = setInterval(function(){
			if (HR == null)
				var heartRate = 55;
			else
				var heartRate = HR;
			var runningTime = getTime(Date.now() - startTime);
			document.getElementById('hr-time').innerHTML='&#x2661; '+heartRate+"&nbsp;&nbsp;Time:&nbsp;"+runningTime;
		},1000);
	}
}

function stopSensing()
{
	if (exercising != null)
	{
		clearInterval(exercising);
		clearInterval(updateTime);
		exercising = null;
		updateTime = null;
		
	}
}

function doExercising(data)
{
	var exercise_info = data.split(',');
	var whichExercise = exercise_info[0];
	//var heartRate = exercise_info[1];
	var burntCalorie = Number(exercise_info[2]);
	//var runningTime = getTime(Number(exercise_info[3]));
	
	if (burntCalorie < 1000.0)
	{
		document.getElementById('atv-cal').innerHTML='<b>'+whichExercise+'</b><br>'+'Cal:&nbsp;'+burntCalorie+'&nbsp;cal';
	}
	else
	{
		burntCalorie=burntCalorie/1000.0;
		document.getElementById('atv-cal').innerHTML='<b>'+whichExercise+'</b><br>'+'Cal:&nbsp;'+burntCalorie+'&nbsp;kcal';
	}
	//document.getElementById('hr-time').innerHTML='&#x2661; '+heartRate+"&nbsp;&nbsp;Time:&nbsp;"+runningTime;
}
var ax;
var ay;
var az;
//var rotx;
//var roty;
//var rotz;
var HR;

var axArray = [];
var ayArray = [];
var azArray = [];
//var rotxArray = [];
//var rotyArray = [];
//var rotzArray = [];

var motionListener = function(e){
	ax = e.accelerationIncludingGravity.x;
	ay = -e.accelerationIncludingGravity.y;
	az = -e.accelerationIncludingGravity.z;
//	rotx = e.rotationRate.alpha;
//	roty = e.rotationRate.beta;
//	rotz = e.rotationRate.gamma;
};

function collectSensorData(){
	var pushDataInArray = setInterval (function (){
			
	axArray.push(ax);
	ayArray.push(ay);
	azArray.push(az);
//	rotxArray.push(rotx);
//	rotyArray.push(roty);
//	rotzArray.push(rotz);

	},40);
	
	setTimeout (function(){
		clearInterval(pushDataInArray);
		fetchSensorData(axArray,ayArray,azArray);
		axArray.length = 0;
		ayArray.length = 0;
		azArray.length = 0;
//		rotxArray.length = 0;
//		rotyArray.length = 0;
//		rotzArray.length = 0;

	},2000);
}

function fetchSensorData(axArray,ayArray,azArray)
{
	try {
		SASocket.sendData(CHANNELID, 'ax:'+axArray);
		SASocket.sendData(CHANNELID, 'ay:'+ayArray);
		SASocket.sendData(CHANNELID, 'az:'+azArray);

//		SASocket.sendData(CHANNELID, 'rotx:'+rotxArray);
//		SASocket.sendData(CHANNELID, 'roty:'+rotyArray);
//		SASocket.sendData(CHANNELID, 'rotz:'+rotzArray);
		if (HR == null)
			HR = 55;
		SASocket.sendData(CHANNELID, "HRbpm:"+HR);
		
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
}

