document.addEventListener("DOMContentLoaded", function() {
	//drawing part
	var mouse = {
		click: false,
		move: false,
		pos: {x:0, y:0},
		pos_prev: false
	};
	var canvas  = document.getElementById('drawing');
	var context = canvas.getContext('2d');
	var width   = window.innerWidth;
	var height  = window.innerHeight;
	var startPoint = [0, 0];
	var socket  = io.connect();
	canvas.width = width;
	canvas.height = height - 260;

	canvas.onmousedown = function(e){
		mouse.button = e.which;
		mouse.click = true;
	};

	canvas.ontouchstart = function(e) {
		mouse.button = -1;
		mouse.click = true;
		mouse.pos.x = e.touches[0].clientX / canvas.width;
		mouse.pos.y = e.touches[0].clientY / canvas.height;
	}

	canvas.onmouseup = function(e){
		mouse.click = false;
	};
	canvas.ontouchend = function(e){
		mouse.button = -1;
		mouse.click = false;
	};

	canvas.onmousemove = function(e) {
		mouse.pos.x = e.clientX / canvas.width;
		mouse.pos.y = e.clientY / canvas.height;
		mouse.move = true;
	};

	canvas.ontouchmove = function(e) {
		e.preventDefault();
		mouse.pos.x = e.touches[0].clientX / canvas.width;
		mouse.pos.y = e.touches[0].clientY / canvas.height;
		mouse.move = true;
		mouse.button = 1;
	};


	socket.on('update_drawer_ratio', function (data) {
		if (data.ratio >= canvas.width/canvas.height) {
			startPoint[1] = (canvas.height - canvas.width / data.ratio)/2;
			startPoint[0] = 0;
		} else {
			startPoint[0] = (canvas.width - canvas.height * data.ratio)/2;
			startPoint[1] = 0;
		}
	});

	// draw
	socket.on('draw_line', function (data) {
		var line = data.line;
		context.beginPath();
		context.lineWidth = 2;
		context.moveTo(startPoint[0] + (canvas.width  - 2*startPoint[0])*line[0].x, startPoint[1] + (canvas.height - 2*startPoint[1])*line[0].y);
		context.lineTo(startPoint[0] + (canvas.width  - 2*startPoint[0])*line[1].x, startPoint[1] + (canvas.height - 2*startPoint[1])*line[1].y);
		context.stroke();
	});

	// // erase
	// socket.on('erase', function (data) {
	// 	context.fillStyle = '#000000';
	// 	context.globalCompositeOperation = 'destination-out';
	// 	context.beginPath();
	// 	context.moveTo(data.x, data.y);
	// 	context.arc(data.x, data.y, 5, 0, Math.PI * 2, false);
	// 	context.fill();
	// });
	var turnToDraw = false;

	var mainLoop = function () {
		if (mouse.click && mouse.move && mouse.pos_prev && turnToDraw) {
			if (mouse.button ===1) {
			socket.emit('draw_line', { line: [ mouse.pos, mouse.pos_prev ] });
			mouse.move = false;
		} }
		mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
		if (turnToDraw) {
			setTimeout(mainLoop, 10);
		}
	}

	var clearDrawing = document.getElementById('clearDrawing');
	clearDrawing.addEventListener('click', function(e) {
		e.preventDefault();
		socket.emit('clear_drawing');
	})
	socket.on('clear_drawing', function() {
		context.clearRect(0, 0, canvas.width, canvas.height);
	});
	// user part
	var user = {};
	var usersList  = document.getElementById('users');
	socket.on('init_user', function(data) {
		user.socketId = data.socketId;
		user.username = data.username;
	});

	var gaimingSubmitButton = document.getElementById('gaimingSubmitButton');
	var gaimingInput = document.getElementById('gaimingTextInput');
	gaimingSubmitButton.addEventListener('click', function(e) {
		e.preventDefault();
		if (gaimingInput.value) {
			socket.emit('update_username', {socketId: user.socketId, newName: gaimingInput.value, oldName: user.username});
			user.username = gaimingInput.value;
			gaimingInput.value = '';
		}
	});

	socket.on('update_users', function(data) {
		usersList.innerHTML = '';
		for (var dataUser of data.users) {
			var userEl = document.createElement('li');
			var readyEl = document.createElement('span');
			var correctEl = document.createElement('span');
			var scoreEl = document.createElement('span');
			readyEl.innerHTML = '准备';
			readyEl.classList = 'readySpan';
			userEl.innerHTML = dataUser.username;
			scoreEl.innerHTML = dataUser.score || 0;
			scoreEl.classList = 'score';
			if (dataUser.ready) {
				userEl.prepend(readyEl)
			}
			if (dataUser.guess === 'correct') {
				userEl.classList = 'correct';
			}
			userEl.append(scoreEl);
			// back door... not working. TODO
			// var kickEl = document.createElement('button');
			// kickEl.classList = 'kickButton submitButton';
			// kickEl.innerHTML = '踢';
			// var dataUserSocketId = dataUser.socketId;
			// console.log(dataUserSocketId)
			// kickEl.addEventListener('click', function(e) {
			// 	e.preventDefault();
			// 	socket.emit('kick', {socketId: dataUserSocketId});
			// });
			// userEl.append(kickEl);

			usersList.append(userEl);
		}
		var kickEls = document.querySelectorAll('.kickButton');

	});
	// back door

	socket.on('kick', function(data) {
		console.log(data.socketId)
		// console.log(user.username, user.socketId)
		// if (data.socketId === user.socketId) {
		// 	socket.disconnect();
		// }
	});

	// gameplay
	var readyButton = document.getElementById('ready');
	readyButton.addEventListener('click', function (e) {
		e.preventDefault();
		socket.emit('user_ready', { socketId: user.socketId });
		readyButton.style.visibility = 'hidden';
	})
	var question = document.getElementById('question');
	socket.on('clear_and_set', function (data) {
		turnToDraw = false;
		context.clearRect(0, 0, canvas.width, canvas.height);
		question.innerHTML = '';
		clearDrawing.style.visibility = 'hidden';
		if (user.socketId === data.currentUser.socketId) {
			clearDrawing.style.visibility = 'visible';
			turnToDraw = true;
			question.innerHTML = '你要画的是：' + data.question;
			// start capturing input
			mainLoop();
			socket.emit('update_drawer_ratio', { ratio: canvas.width/canvas.height });
		} else {
			question.innerHTML = data.currentUser.username + '激情作画中...' + '（' + data.question.length + '个字）';
		}
	});

	var gameTimer = document.getElementById('gameTimer');
	socket.on('update_game_timer', function (data) {
		gameTimer.innerHTML = '剩余时间：' + data.leftTime + '秒';
	});

	socket.on('game_end', function (data) {
		clearTimeout(drawing);
		question.innerHTML = '时间到！正确答案：' + data.question;
		readyButton.style.visibility = 'visible';
	});

	socket.on('game_end_early', function (data) {
		clearTimeout(drawing);
		question.innerHTML = '所有人都猜对啦！正确答案：' + data.question;
		readyButton.style.visibility = 'visible';
	});

	//chat
	var submitButton = document.getElementById('submitButton');
	var chatInput = document.getElementById('textInput')
	submitButton.addEventListener('click', function(e) {
		e.preventDefault();
		socket.emit('chat_message', {user: user, message: chatInput.value});
		chatInput.value = '';
	});
	var chatContent = document.getElementById('content');
	socket.on('update_chat_content', function(data) {
		chatContent.innerHTML = '';
		for (var message of data.content) {
			if (!message.socketId || message.socketId === user.socketId ) {
				var messageEl = document.createElement('li');
				if (message.type === 'system') {
					messageEl.innerHTML = message.user+message.message;
					messageEl.classList = 'systemMessage';
				} else {
					messageEl.innerHTML = message.user+'：'+message.message;
				}
				chatContent.append(messageEl);
			}
		}
		chatContent.scrollTop = chatContent.scrollHeight - chatContent.offsetHeight;
	});

	// console
	var consoleBar = document.getElementById('console');
	document.addEventListener('keyup', e => {
		if (e.ctrlKey && e.keyCode === 192) {
			consoleBar.classList.toggle('hidden');
		}
	})
	var forceStart = document.getElementById('forceStart');
	forceStart.addEventListener('click', function(e) {
		e.preventDefault();
		socket.emit('force_start');
	});
});