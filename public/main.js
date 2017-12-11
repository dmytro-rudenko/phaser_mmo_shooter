var player, map, bullets, balls, ball, live, moveBullets, bg, keybord;
var socket, players = {};
var player_speed = 400;
var gameData = {
    style: { font: "80px Arial", fill: "white" },
    map: {
        size: 2000
    }
}
var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.CANVAS, 'phaser-example', {
    preload: function() {
        this.load.image('unit', 'img/unit.png');
        this.load.image('bullet', 'img/bullet.png');
        this.load.image('killer', 'img/killers.png');
        this.load.image('map', 'https://i.pinimg.com/originals/54/0a/cf/540acf3d4a5bdb160713122765fcc45e.png');
    },
    create: function() {
        socket = io.connect(window.location.host);
        this.physics.startSystem(Phaser.Physics.ARCADE);
        this.time.advancedTiming = true;
        this.time.desiredFps = 28;
        this.time.slowMotion = 0;
        bg = this.add.tileSprite(0, 0, gameData.map.size, gameData.map.size, 'map'); //спрайт карты
        this.world.setBounds(0, 0, gameData.map.size, gameData.map.size); //размеры карты
        this.stage.backgroundColor = "#522881"; //цвет фона на всякий случай
        socket.on("add_players", function(data) {
            data = JSON.parse(data);
            for (let playerId in data) {
                if (players[playerId] == null && data[playerId].live) {
                    gameActions.addPlayer(playerId, data[playerId].x, data[playerId].y, data[playerId].name);
                }
            }
            live = true;
        }); //создаем игроков
        socket.on("add_player", function(data) {
            data = JSON.parse(data);
            if (data.player.live) {
                gameActions.addPlayer(data.id, data.player.x, data.player.y, data.player.name);
            }
        }); //создаем игрока
        socket.on("player_rotation_update", function(data) {
            data = JSON.parse(data);
            players[data.id].player.rotation = data.value;
        }); //вращение вокруг своей оси, ориентируясь на курсор
        socket.on("player_position_update", function(data) {
            data = JSON.parse(data);
            players[socket.id].player.body.velocity.x = 0;
            players[socket.id].player.body.velocity.y = 0;
            players[data.id].player.x += data.x;
            players[data.id].player.y += data.y;

        }); //обновляем положение игроков
        socket.on("player_collide", function(data) {
            data = JSON.parse(data);
            game.physics.arcade.collide(players[data.x].weapon.bullets, players[data.y].player, gameActions.bulletHitHandler, null, this);

        })
        socket.on('player_fire_add', function(id) {
            if (players[id]) {
                players[id].weapon.fire();
            } 
        }); //ввзываем выстрелы 
        this.input.onDown.add(function() {
            socket.emit("shots_fired", socket.id);
        }); //вызываем выстрелы
        socket.on('clean_dead_player', function(victimId) {
            if (victimId == socket.id) {
                live = false;
            }
            socket.on("gameOver", function(data) {
                let text = game.add.text(window.innerWidth / 2, window.innerHeight / 2, data, {
                    font: "32px Arial",
                    fill: "#ffffff",
                    align: "center"
                });
                text.fixedToCamera = true;
                text.anchor.setTo(.5, .5);
            });
            players[victimId].player.kill();
            delete players[victimId];
        });
        socket.on('player_disconnect', function(id) {
            players[id].player.kill();
        }); //убираем отключившихся игроков
        keybord = this.input.keyboard.createCursorKeys(); //инициализируем клавиатуру
    },
    update: function() {
        if (live == true) {
            players[socket.id].player.rotation = this.physics.arcade.angleToPointer(players[socket.id].player);
            socket.emit("player_rotation", players[socket.id].player.rotation);
            gameActions.setCollisions(); //функция вызывающаяся при столкновении пули с игроком
            gameActions.characterController(); //управление
            
        }
    },
    render: function() {
        game.debug.cameraInfo(game.camera, 32, 32);
    }
});
var gameActions = {
    addPlayer: function(playerId, x, y) {
        var circle = odjectDrawing.generateCircle('red', 20);
        player = game.add.sprite(x, y, circle);
        game.physics.arcade.enable(player);
        player.smoothed = false;
        player.anchor.setTo(0.5, 0.5);
        player.scale.set(.8);
        player.body.collideWorldBounds = true;
        player.id = playerId;
        var bullet = odjectDrawing.generateCircle('yellow', 5);
        let weapon = game.add.weapon(30, bullet);
        weapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS;
        weapon.bulletLifespan = 150;
        weapon.bulletSpeed = 300;
        weapon.fireRate = 60;
        weapon.bulletWorldWrap = false;
        weapon.trackSprite(player, 0, 0, true);
        players[playerId] = { player, weapon };
        game.camera.follow(players[socket.id].player, );
    },
    bulletHitHandler: function(player, bullet) {
        socket.emit("player_killed", player.id);
        bullet.destroy();
    },
    setCollisions: function() {
        for (let x in players) {
            for (let y in players) {
                if (x != y) {
                    game.physics.arcade.collide(players[x].weapon.bullets, players[y].player, this.bulletHitHandler, null, this);
                }
            }
        }
    },
    bulletAway: function() {
        
    },
    sendPosition: function(character) {
        socket.emit("player_move", JSON.stringify({
            "id": socket.id,
            "character": character
        }));
    },
    characterController: function() {
        if (game.input.keyboard.isDown(Phaser.Keyboard.A) || keybord.left.isDown) {
            this.sendPosition("A");
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.D) || keybord.right.isDown) {
            this.sendPosition("D");
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.W) || keybord.up.isDown) {
            this.sendPosition("W");
        }
        if (game.input.keyboard.isDown(Phaser.Keyboard.S) || keybord.down.isDown) {
            this.sendPosition("S");
        }
    }
}


var odjectDrawing = {
    generateCircle: function(color, size){
        var diametr = size * 2
        var circle = game.add.bitmapData(diametr, diametr);
        circle.ctx.fillStyle = color;
        circle.ctx.beginPath();
        circle.ctx.arc(size, size, size, 0, Math.PI*2, true);
        circle.ctx.closePath();
        circle.ctx.fill();
        return circle;
    },
    generateRect: function(color, size) {

    }
}