/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = "var express = require('express');\nvar app = express();\nvar http = require('http').Server(app);\nvar io = require('socket.io')(http);\n\napp.use(express.static(__dirname + '/public'));\napp.get('/', function(req, res){\n\tres.sendFile(__dirname + '/index.html');\n});\n\nhttp.listen(8848, function(){\n\tconsole.log('listening on *:8848');\n});\n\nvar line_history = [];\nvar ratio = 1;\nvar users = [];\nvar numberOfReadyUsers = 0;\nvar currentUserIdx = 0;\nvar questions = require('./ciku.js').questions;\nvar currentQuestionIdx = 0;\nvar gaming = false;\nvar chat_message = [];\n\nio.on('connection', function(socket){\n\t// add user to user list\n\tusers = updateUsers(users, socket.id, 'username', '一位不愿意透露姓名的舞法天女');\n\tchat_message.push({user: '一位不愿意透露姓名的舞法天女', message: '加入了房间', type: 'system'});\n\tio.emit('update_chat_content', {content: chat_message});\n\tio.emit('update_users', { users: users });\n\t// drawing part\n\t/// keep new user up-to-date\n\tfor (var i in line_history) {\n\t\tsocket.emit('draw_line', { line: line_history[i], ratio: ratio } );\n\t}\n\tio.emit('update_chat_content', {content: chat_message});\n\n\t/// update drawer ratio\n\tsocket.on('update_drawer_ratio', function (data) {\n\t\tratio = data.ratio;\n\t\tio.emit('update_drawer_ratio', { ratio: ratio });\n\t});\n\n\t/// handle draw_line\n\tsocket.on('draw_line', function (data) {\n\t\tline_history.push(data.line);\n\t\tio.emit('draw_line', { line: data.line, ratio: ratio });\n\t});\n\n\t// user part\n\tsocket.emit('init_user', {socketId: socket.id, username: '一位不愿意透露姓名的舞法天女'});\n\n\tsocket.on('update_username', function (data) {\n\t\tusers = updateUsers(users, data.socketId, 'username', data.newName );\n\t\tio.emit('update_users', { users: users });\n\t\tchat_message.push({user: data.oldName, message: '将名字改为'+data.newName, type: 'system'});\n\t\tio.emit('update_chat_content', {content: chat_message});\n\t});\n\n\t// gameplay\n\tfunction startGame() {\n\t\tif (!gaming) {\n\t\t\tgaming = true;\n\t\t\tif (currentUserIdx >= users.length) {\n\t\t\t\tcurrentUserIdx = 0;\n\t\t\t}\n\t\t\tcurrentQuestionIdx = Math.floor((Math.random() * questions.length));\n\t\t\tline_history = [];\n\t\t\tio.emit('clear_and_set', { question: questions[currentQuestionIdx], currentUser: users[currentUserIdx]});\n\t\t\tusers = updateUsers(users, 'all', 'guess', 'guessing');\n\t\t\tio.emit('update_users', {users: users});\n\t\t\tvar leftTime = 120;\n\t\t\tvar gameTimer = setInterval(\n\t\t\t\tfunction () {\n\t\t\t\t\tif (leftTime <= 0) {\n\t\t\t\t\t\tclearInterval(gameTimer);\n\t\t\t\t\t\tgaming = false;\n\t\t\t\t\t\tio.emit('game_end', {question: questions[currentQuestionIdx]});\n\t\t\t\t\t\tusers = updateUsers(users, 'all', 'ready', false);\n\t\t\t\t\t\tio.emit('update_users', {users: users});\n\t\t\t\t\t\tcurrentUserIdx += 1;\n\t\t\t\t\t}\n\t\t\t\t\t// all guessed correct\n\t\t\t\t\telse if (users.filter( function (user) { return user.guess === 'correct'; }).length === users.length - 1) {\n\t\t\t\t\t\tclearInterval(gameTimer);\n\t\t\t\t\t\tgaming = false;\n\t\t\t\t\t\tio.emit('game_end_early', {question: questions[currentQuestionIdx]});\n\t\t\t\t\t\tusers = updateUsers(users, 'all', 'ready', false);\n\t\t\t\t\t\tio.emit('update_users', {users: users});\n\t\t\t\t\t\tcurrentUserIdx += 1;\n\t\t\t\t\t}\n\t\t\t\t\tio.emit('update_game_timer', { leftTime: leftTime });\n\t\t\t\t\tleftTime -= 1;\n\t\t\t\t},\n\t\t\t\t1000\n\t\t\t)\n\t\t}\n\t}\n\tsocket.on('user_ready', function (data) {\n\t\tusers = updateUsers(users, data.socketId, 'ready', true);\n\t\tio.emit('update_users', { users: users });\n\n\t\tif (!users.find(function(user) {\n\t\t\treturn !user.ready;\n\t\t})) {\n\t\t\t// start game\n\t\t\tstartGame();\n\t\t}\n\n\t});\n\n\tsocket.on('clear_drawing', function(data) {\n\t\tline_history = [];\n\t\tio.emit('clear_drawing');\n\t});\n\t// chat part\n\tsocket.on('chat_message', function (data) {\n\t\t// correct\n\t\tif (data.message === questions[currentQuestionIdx] && gaming) {\n\t\t\tchat_message.push({user: data.user.username, message: data.message + '（你猜对了！这条信息对其他人隐藏）', socketId: data.user.socketId});\n\t\t\tio.emit('update_chat_content', {content: chat_message});\n\t\t\tif ( users.find(function(user) { return user.socketId === data.user.socketId}).guess !== 'correct' && data.user.socketId !== users[currentUserIdx].socketId) {\n\t\t\t\tusers = updateUsers(users, data.user.socketId, 'guess', 'correct');\n\t\t\t\tvar currentScore = users.find(function(user) { return user.socketId === data.user.socketId}).score || 0;\n\t\t\t\tusers = updateUsers(users, data.user.socketId, 'score', currentScore + 1);\n\t\t\t\tusers = updateUsers(users, users[currentUserIdx].socketId, 'score', users[currentUserIdx].score ? users[currentUserIdx].score + 1 : 1)\n\t\t\t\tio.emit('update_users', { users: users });\n\t\t\t}\n\t\t} else {\n\t\t\tchat_message.push({user: data.user.username, message: data.message});\n\t\t\tio.emit('update_chat_content', {content: chat_message});\n\t\t}\n\t});\n\n\t// console\n\t// socket.on('kick', function(data) {\n\t// \tconsole.log(data)\n\t// \t// io.emit('kick', {socketId: data.socketId});\n\t// });\n\tsocket.on('force_start', function(data) {\n\t\tline_history = [];\n\t\tio.emit('clear_drawing');\n\t\tstartGame();\n\t});\n\n\t// disconnect\n\tsocket.on('disconnect', function() {\n\t\tchat_message.push({user: users.find(function(obj) { return obj.socketId === socket.id }).username, message: '离开了房间', type: 'system'});\n\t\tio.emit('update_chat_content', {content: chat_message});\n\t\tusers = users.filter( function(obj) {\n\t\t\treturn obj.socketId !== socket.id;\n\t\t});\n\t\tio.emit('update_users', { users: users });\n\t});\n});\n\n\nfunction updateUsers (users, socketId, key, value) {\n\tif (socketId === 'all') {\n\t\treturn users.map( function(user) {\n\t\t\treturn Object.assign({}, user, {[key]: value});\n\t\t});\n\t}\n\tvar targetUserIndex = users.findIndex( function(obj) {\n\t\treturn obj.socketId === socketId;\n\t});\n\n\tif (targetUserIndex > -1) {\n\t\treturn [].concat(\n\t\t\t\tusers.slice(0, targetUserIndex),\n\t\t\t\tObject.assign({}, users[targetUserIndex], { [key]: value} ),\n\t\t\t\ttargetUserIndex < users.length ? users.slice(targetUserIndex + 1) : ''\n\t\t\t)\n\t} else {\n\t\treturn [].concat(users, {socketId: socketId, [key]: value});\n\t}\n}\n\n"

/***/ }),
/* 1 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(src) {
	function log(error) {
		(typeof console !== "undefined")
		&& (console.error || console.log)("[Script Loader]", error);
	}

	// Check for IE =< 8
	function isIE() {
		return typeof attachEvent !== "undefined" && typeof addEventListener === "undefined";
	}

	try {
		if (typeof execScript !== "undefined" && isIE()) {
			execScript(src);
		} else if (typeof eval !== "undefined") {
			eval.call(null, src);
		} else {
			log("EvalError: No eval function available");
		}
	} catch (error) {
		log(error);
	}
}


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(1)(__webpack_require__(0))

/***/ })
/******/ ]);
//# sourceMappingURL=index_bundle.js.map