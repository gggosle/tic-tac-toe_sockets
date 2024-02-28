const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
// const path = require('path');

app.use(express.static(__dirname));

const maxClients = 2;

class Player {
    cellsTargeted = [];
    constructor(symbol) {
        this.symbol = symbol;
        this.wins = 0;
        this.connected = false;
        this.current = false;
    }
    toString() {
        return this.symbol;
    }
}

const players = [new Player("O"), new Player("X")];
players[0].current = true;


class GameState {
    constructor(boardSize, occurrenceNum, players) {
        this.players = players;
        this.boardSize = boardSize;
        this.occurrenceNum = occurrenceNum;
        this.isGameFinished = false;
    }
}

let gameState;
let connectedClients = [];

io.on('connection', (socket) => {
    connectedClients.push(socket);
    console.log(connectedClients.length);

    if (connectedClients.length > maxClients) {
        socket.emit('connectionRejected', 'Game is full');
        socket.disconnect(true);
        connectedClients.pop();
        return;
    }

    const currentPlayer = players.find(player => player.connected === false);
    const rivalPlayer = players.find(player => player.symbol !== currentPlayer.symbol);

    currentPlayer.connected = true;
    console.log('New client connected');

    if (gameState) {
        configureGameOnStart();
    } else if (!gameState && connectedClients[0] === socket) {
        socket.emit('gameStateSet');
    }

    socket.on('gameStateSet', (gameProperties) => {
        players.forEach((player) => {
            player.cellsTargeted = [];
        });

        players[0].current = true;
        players[1].current = false;
        gameState = new GameState(gameProperties.boardSize, gameProperties.occurrenceNum, players);

        configureGameOnStart();
    });

    socket.on('move', (targetCell) => {
        if (currentPlayer.current) {
            console.log(targetCell);
            currentPlayer.cellsTargeted.push(targetCell);
            currentPlayer.current = false;
            rivalPlayer.current = true;
            io.emit('move', players);
        }
    });

    socket.on('win', () => {
        currentPlayer.wins++;
        gameState.isGameFinished = true;
        getSocketOfRival().emit('win');
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        connectedClients = connectedClients.filter(connectedClient => connectedClient !== socket);

        currentPlayer.connected = false;
    });

    function configureGameOnStart() {
        io.emit('gameStateGet', gameState);
        socket.emit('player', currentPlayer.symbol);
    }

    function getSocketOfRival() {
        return connectedClients.find(client => client !== socket);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});




