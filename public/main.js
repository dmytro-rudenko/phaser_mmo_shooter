var width = window.innerWidth;
var height = window.innerHeight;

var game = new Phaser.Game(width, height, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render });
var player;
var socket, players = {};
var map;
var map_size = 2000;
var style = { font: "80px Arial", fill: "white" };
var text;
var bullets;

var fireRate = 100;
var nextFire = 0;
var balls;
var ball;
var player_speed = 400;
var live;
var moveBullets;

function preload() {
    game.load.image('unit', 'img/unit.png');
    game.load.image('bullet', 'img/bullet.png');
    game.load.image('killer', 'img/killers.png');
    game.load.image('map', 'img/grid.png');
}

function create() {
    socket = io.connect(window.location.host);

    game.physics.startSystem(Phaser.Physics.ARCADE);


    game.time.advancedTiming = true;
    game.time.desiredFps = 60;
    game.time.slowMotion = 0;

    bg = game.add.tileSprite(0, 0, map_size, map_size, 'map'); //спрайт карты
    game.world.setBounds(0, 0, map_size, map_size); //размеры карты
    game.stage.backgroundColor = "#242424"; //цвет фона на всякий случай

    socket.on("add_players", function(data) {
        data = JSON.parse(data);
        for (let playerId in data) {
            if (players[playerId] == null && data[playerId].live) {
                addPlayer(playerId, data[playerId].x, data[playerId].y, data[playerId].name);
            }
        }
        live = true;
    }); //создаем игроков

    socket.on("add_player", function(data) {
        data = JSON.parse(data);
        if (data.player.live) {
            addPlayer(data.id, data.player.x, data.player.y, data.player.name);
        }
    }); //создаем игрока

    socket.on("player_rotation_update", function(data) {
        data = JSON.parse(data);
        players[data.id].player.body.rotation = data.value;
    }); //вращение вокруг своей оси, ориентируясь на курсор

    socket.on("player_position_update", function(data) {
        data = JSON.parse(data);
        players[socket.id].player.body.velocity.x = 0;
        players[socket.id].player.body.velocity.y = 0;

        players[data.id].player.x += data.x;
        players[data.id].player.y += data.y;

    }); //обновляем положение игроков

    socket.on('player_fire_add', function (id) {
        players[id].weapon.fire();
    }); //выполняем выстрелы 

    game.input.onDown.add(function() {
        socket.emit("shots_fired", socket.id);
    }); //вызываем выстрелы

    socket.on('clean_dead_player', function (victimId) {
        if (victimId == socket.id) {
            live = false;
        }
        players[victimId].player.kill();
        
    }); //смерть от выстрелов

    socket.on('player_disconnect', function(id) {
        players[id].player.kill();
    }); //убираем отключившихся игроков


    

    keybord = game.input.keyboard.createCursorKeys(); //инициализируем клавиатуру
}
// 


function update() {

    if (live) {
        
        players[socket.id].player.rotation = game.physics.arcade.angleToPointer(players[socket.id].player);
        socket.emit("player_rotation", players[socket.id].player.rotation);
    }
    setCollisions(); //функция при столкновении пули с игроком
    characterController();
}//Проверка столкновения


function bulletHitHandler(player, bullet) {
    socket.emit("player_killed", player.id);
    bullet.destroy();
}//функция при столкновении пули с игроком

function setCollisions() {
    for (let x in players) {
        for (let y in players) {
            if (x != y) {
                game.physics.arcade.collide(players[x].weapon.bullets, players[y].player, bulletHitHandler, null, this);
            }
        }
    }
}//Проверка столкновения


function sendPosition(character) {
    socket.emit("player_move", JSON.stringify({
        "id": socket.id,
        "character": character
    }));
} //отправляем инфу о том, куда игрок двинулся на сервер

function characterController() {

    if (game.input.keyboard.isDown(Phaser.Keyboard.A) || keybord.left.isDown) {
        //players[socket.id].player.x -= 5;
        sendPosition("A");
    }
    if (game.input.keyboard.isDown(Phaser.Keyboard.D) || keybord.right.isDown) {
        //players[socket.id].player.x += 5;
        sendPosition("D");
    }
    if (game.input.keyboard.isDown(Phaser.Keyboard.W) || keybord.up.isDown) {
        //players[socket.id].player.y -= 5;
        sendPosition("W");
    }
    if (game.input.keyboard.isDown(Phaser.Keyboard.S) || keybord.down.isDown) {
        //players[socket.id].player.y += 5;
        sendPosition("S");
    }
} //управление


function render() {
    game.debug.cameraInfo(game.camera, 32, 32);
}




function addPlayer(playerId, x, y){
    player = game.add.sprite(x, y, "unit");
    game.physics.arcade.enable(player);
    player.smoothed = false;
    player.anchor.setTo(0.5, 0.5);
    player.scale.set(.8);
    player.body.collideWorldBounds = true;
    player.id = playerId;

    let weapon = game.add.weapon(30, 'bullet');
    weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS;
    weapon.bulletSpeed = 600;
    weapon.fireRate = 100;
    weapon.trackSprite(player, 0, 0, true);

    players[playerId] = { player, weapon };
    game.camera.follow(players[socket.id].player, );
} //создаем игрока и даем ему ствол :)

