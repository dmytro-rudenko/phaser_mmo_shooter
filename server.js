var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var players = {};
io.on("connection", function(socket) {  //подключение нового игрока
    console.log('an user connected ' + socket.id);

    players[socket.id] = {
        "x": Math.floor(Math.random(1) * 750),
        "y": Math.floor(Math.random(1) * 550),
        "width": 32,
        "height": 32,
        "size": 1,
        "live": true,
    }; //генерирует параметры нового юнита


    io.sockets.emit('add_player', JSON.stringify({
        "id": socket.id,
        "player": players[socket.id]
    })); //отправляет на клиент данные нового юнита

    socket.emit('add_players', JSON.stringify(players));// отправляет на клиент данные нового юнита, если игроков более одного

    socket.on('player_rotation', function(data) {
        io.sockets.emit('player_rotation_update', JSON.stringify({
            "id": socket.id,
            "value": data
        }));
        players[socket.id].rotation = data;
    }); // отвечает за вращение игрока вокруг собственной оси


    socket.on('player_move', function(data) {
        data = JSON.parse(data);

        data.x = 0;
        data.y = 0;

        switch (data.character) {
            case "W":
                data.y = -5;
                players[data.id].y -= 5;
                break;
            case "S":
                data.y = 5;
                players[data.id].y += 5;
                break;
            case "A":
                data.x = -5;
                players[data.id].x -= 5;
                break;
            case "D":
                data.x = 5;
                players[data.id].x += 5;
                break;
        }
        io.sockets.emit('player_position_update', JSON.stringify(data));
    }); // движение игрока

    socket.on('shots_fired', function(id) {
        io.sockets.emit("player_fire_add", id);
    }); // выстрелы

    socket.on('player_killed', function (victimId) {
		
		io.sockets.emit('clean_dead_player', victimId);
		players[victimId].live = false;
        io.sockets.connected[victimId].emit('gameOver', 'Game Over');
		
	}); // смерть при попадании


    socket.on('disconnect', function() {
        console.log("an user disconnected " + socket.id);
        delete players[socket.id];
        io.sockets.emit('player_disconnect', socket.id);
    });
});

app.use("/", express.static(__dirname + "/public")); //пути к файлам клиента
app.get("/", function(req, res) {
    res.sendFile(__dirname + "/public/index.html"); // главная страница
}); 

http.listen(port, function() {
    console.log('listening on *:' + port); // запуск сервера
});
