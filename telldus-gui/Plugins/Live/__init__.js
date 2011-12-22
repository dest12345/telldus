__setupPackage__( __extension__ );

com.telldus.live = function() {
	var socket = null;
	var menuId = 0;
	var separatorId = 0;
	var isRegistered = false;
	var supportedMethods = 0;
	var configUI = null;

	function init() {
		configUI = application.configuration.addPage('Telldus Live!', 'configuration.ui', 'icon.png');
		socket = new LiveSocket();
		socket.errorChanged.connect(errorChanged);
		socket.statusChanged.connect(statusChanged);
		socket.notRegistered.connect(notRegistered);
		socket.registered.connect(registered);
		socket.messageReceived.connect(messageReceived);
		socket.connectToServer();
		com.telldus.core.deviceEvent.connect(deviceEvent);
		com.telldus.core.deviceChange.connect(sendDevicesReport);
		configUI.findChild('registrationLink').clicked.connect(socket.activate);
		configUI.findChild('registrationLink').visible = false;
	}

	function notRegistered() {
		isRegistered = false;
		if (com.telldus.systray && !menuId) {
			separatorId = com.telldus.systray.addSeparator();
			menuId = com.telldus.systray.addMenuItem( qsTr("Activate Telldus Live!") );
			com.telldus.systray.menuItem(menuId).triggered.connect(socket.activate);
		}
		registrationLinkVisible(true);
	}

	function deviceEvent(deviceId, method, data) {
		msg = new LiveMessage("DeviceEvent");
		msg.append(deviceId);
		msg.append(method);
		msg.append(data);
		socket.sendMessage(msg);
	}

	function deviceChangeEvent() {
	}

	function messageReceived(msg) {
		if (msg.name() == "turnon") {
			com.telldus.core.turnOn( msg.argument(0).intVal() );
		} else if (msg.name() == "turnoff") {
			com.telldus.core.turnOff( msg.argument(0).intVal() );
		} else if (msg.name() == "dim") {
			com.telldus.core.dim( msg.argument(0).intVal(), msg.argument(1).intVal() );
		} else if (msg.name() == "bell") {
			com.telldus.core.bell( msg.argument(0).intVal() );
		}
		print("Received: " + msg.name());
	}

	function registered(msg) {
		if (menuId > 0) {
			com.telldus.systray.removeMenuItem(menuId);
			com.telldus.systray.removeMenuItem(separatorId);
			menuId = 0;
			separatorId = 0;
		}
		supportedMethods = msg.getInt('supportedMethods');
		isRegistered = true;
		registrationLinkVisible(false);
		sendDevicesReport();
	}

	function registrationLinkVisible(visibleParam){
		configUI.findChild('registrationLink').visible = visibleParam;
	}

	function sendDevicesReport() {
		if (!isRegistered) {
			return;
		}
		msg = new LiveMessage("DevicesReport");
		var deviceList = com.telldus.core.deviceList.getList();
		list = new LiveMessageToken();
		for( i in deviceList ) {
			device = new LiveMessageToken();
			device.set('id', deviceList[i].id);
			device.set('name', deviceList[i].name);
			device.set('methods', com.telldus.core.methods(deviceList[i].id, supportedMethods) );
			device.set('state', com.telldus.core.lastSentCommand(deviceList[i].id, supportedMethods) );
			device.set('stateValue', com.telldus.core.lastSentValue(deviceList[i].id, supportedMethods) );
			list.add(device);
		}
		msg.appendToken(list);
		socket.sendMessage(msg);
	}

	function errorChanged(msg) {
		configUI.findChild('errorLabel').text = msg;
	}

	function statusChanged(msg) {
		configUI.findChild('statusLabel').text = msg;
	}

	return { //Public functions
		init:init
	}
}();

__postInit__ = function() {
	application.allDoneLoading.connect( com.telldus.live.init );
}


