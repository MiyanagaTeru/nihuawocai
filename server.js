var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

http.listen(8848, function(){
	console.log('listening on *:8848');
});

var line_history = [];
var ratio = 1;
var users = [];
var numberOfReadyUsers = 0;
var currentUserIdx = 0;
var questions = require('./ciku.js').questions;
var currentQuestionIdx = 0;
var gaming = false;
var chat_message = [];

io.on('connection', function(socket){
	// add user to user list
	users = updateUsers(users, socket.id, 'username', '一位不愿意透露姓名的舞法天女');
	chat_message.push({user: '一位不愿意透露姓名的舞法天女', message: '加入了房间', type: 'system'});
	io.emit('update_chat_content', {content: chat_message});
	io.emit('update_users', { users: users });
	// drawing part
	/// keep new user up-to-date
	for (var i in line_history) {
		socket.emit('draw_line', { line: line_history[i], ratio: ratio } );
	}
	io.emit('update_chat_content', {content: chat_message});

	/// update drawer ratio
	socket.on('update_drawer_ratio', function (data) {
		ratio = data.ratio;
		io.emit('update_drawer_ratio', { ratio: ratio });
	});

	/// handle draw_line
	socket.on('draw_line', function (data) {
		line_history.push(data.line);
		io.emit('draw_line', { line: data.line, ratio: ratio });
	});

	// user part
	socket.emit('init_user', {socketId: socket.id, username: '一位不愿意透露姓名的舞法天女'});

	socket.on('update_username', function (data) {
		users = updateUsers(users, data.socketId, 'username', data.newName );
		io.emit('update_users', { users: users });
		chat_message.push({user: data.oldName, message: '将名字改为'+data.newName, type: 'system'});
		io.emit('update_chat_content', {content: chat_message});
	});

	// gameplay
	function startGame() {
		if (!gaming) {
			gaming = true;
			if (currentUserIdx >= users.length) {
				currentUserIdx = 0;
			}
			currentQuestionIdx = Math.floor((Math.random() * questions.length));
			line_history = [];
			io.emit('clear_and_set', { question: questions[currentQuestionIdx], currentUser: users[currentUserIdx]});
			users = updateUsers(users, 'all', 'guess', 'guessing');
			io.emit('update_users', {users: users});
			var leftTime = 120;
			var gameTimer = setInterval(
				function () {
					if (leftTime <= 0) {
						clearInterval(gameTimer);
						gaming = false;
						io.emit('game_end', {question: questions[currentQuestionIdx]});
						users = updateUsers(users, 'all', 'ready', false);
						io.emit('update_users', {users: users});
						currentUserIdx += 1;
					}
					// all guessed correct
					else if (users.filter( function (user) { return user.guess === 'correct'; }).length === users.length - 1) {
						clearInterval(gameTimer);
						gaming = false;
						io.emit('game_end_early', {question: questions[currentQuestionIdx]});
						users = updateUsers(users, 'all', 'ready', false);
						io.emit('update_users', {users: users});
						currentUserIdx += 1;
					}
					io.emit('update_game_timer', { leftTime: leftTime });
					leftTime -= 1;
				},
				1000
			)
		}
	}
	socket.on('user_ready', function (data) {
		users = updateUsers(users, data.socketId, 'ready', true);
		io.emit('update_users', { users: users });

		if (!users.find(function(user) {
			return !user.ready;
		})) {
			// start game
			startGame();
		}

	});

	socket.on('clear_drawing', function(data) {
		line_history = [];
		io.emit('clear_drawing');
	});
	// chat part
	socket.on('chat_message', function (data) {
		// correct
		if (data.message === questions[currentQuestionIdx] && gaming) {
			chat_message.push({user: data.user.username, message: data.message + '（你猜对了！这条信息对其他人隐藏）', socketId: data.user.socketId});
			io.emit('update_chat_content', {content: chat_message});
			if ( users.find(function(user) { return user.socketId === data.user.socketId}).guess !== 'correct' && data.user.socketId !== users[currentUserIdx].socketId) {
				users = updateUsers(users, data.user.socketId, 'guess', 'correct');
				var currentScore = users.find(function(user) { return user.socketId === data.user.socketId}).score || 0;
				users = updateUsers(users, data.user.socketId, 'score', currentScore + 1);
				users = updateUsers(users, users[currentUserIdx].socketId, 'score', users[currentUserIdx].score ? users[currentUserIdx].score + 1 : 1)
				io.emit('update_users', { users: users });
			}
		} else {
			chat_message.push({user: data.user.username, message: data.message});
			io.emit('update_chat_content', {content: chat_message});
		}
	});

	// console
	// socket.on('kick', function(data) {
	// 	console.log(data)
	// 	// io.emit('kick', {socketId: data.socketId});
	// });
	socket.on('force_start', function(data) {
		line_history = [];
		io.emit('clear_drawing');
		startGame();
	});

	// disconnect
	socket.on('disconnect', function() {
		chat_message.push({user: users.find(function(obj) { return obj.socketId === socket.id }).username, message: '离开了房间', type: 'system'});
		io.emit('update_chat_content', {content: chat_message});
		users = users.filter( function(obj) {
			return obj.socketId !== socket.id;
		});
		io.emit('update_users', { users: users });
	});
});


function updateUsers (users, socketId, key, value) {
	if (socketId === 'all') {
		return users.map( function(user) {
			return Object.assign({}, user, {[key]: value});
		});
	}
	var targetUserIndex = users.findIndex( function(obj) {
		return obj.socketId === socketId;
	});

	if (targetUserIndex > -1) {
		return [].concat(
				users.slice(0, targetUserIndex),
				Object.assign({}, users[targetUserIndex], { [key]: value} ),
				targetUserIndex < users.length ? users.slice(targetUserIndex + 1) : ''
			)
	} else {
		return [].concat(users, {socketId: socketId, [key]: value});
	}
}

