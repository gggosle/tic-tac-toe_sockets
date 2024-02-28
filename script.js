"use strict";

import socketIoClient from 'https://cdn.jsdelivr.net/npm/socket.io-client@4.7.4/+esm'
class Board {
     minBoardWinValue = "3";
     globalGameState;
     boardSize;
     occurrencesNum;
     currentPlayer;
     rivalPlayer;
     screenWidth;
     screenHeight;
     boardGridStyle;
     cells;
}

class CellDir {
    constructor(r, c) {
        this.r = Number(r);
        this.c = Number(c);
    }
}

const board = document.querySelector('.board');
const modal = document.querySelector('.modal');
const restartBtn = document.getElementById('restartBtn');
const continueBtn = document.getElementById('continueBtn');
const infoTurn = document.querySelector('.info__turn');
const infoScore = document.querySelector('.info__score');
const minBoardWinValue = "3";
const socket = socketIoClient("http://localhost:3000");

let globalGameState;
let boardSize;
let occurrencesNum;
let currentPlayer;
let rivalPlayer;
let screenWidth;
let screenHeight;
let boardGridStyle;
let cells = [];

function processGameState() {
    if (globalGameState.isGameFinished) {
        openModal();
    }
    else {
        boardSize = globalGameState.boardSize;
        occurrencesNum = globalGameState.occurrencesNum;
        createCells();
        addCells(cells);
        fillCells();
    }
}

function openModal() {
    modal.style.display = 'flex';
}

function addCells(cells) {
    cells.forEach((row) => {
        row.forEach((cell) => {
            board.appendChild(cell);
        });
    });
}

function createCells(){
    for (let i = 0; i < boardSize; i++) {
        cells.push([]);
        for (let j = 0; j < boardSize; j++) {
            const cell = createCell();
            cell.setAttribute('row', i);
            cell.setAttribute('column', j);
            cells[i].push(cell);
        }
    }
}

function createCell() {
    const cell = document.createElement('div');

    cell.classList.add('board__cell');
    cell.addEventListener('click', handleCellClick);

    return cell;
}

function handleCellClick(event) {
    const cell = event.target;
    const cellRowIndex = cell.getAttribute('row');
    const cellColumnIndex = cell.getAttribute('column');

    if (isContent(cell) || isWinner(currentPlayer)) return;

    currentPlayer.targetCell = new CellDir(cellRowIndex, cellColumnIndex);
    socket.emit('move', currentPlayer.targetCell);

    setTimeout(() => {
        handleGameResult(currentPlayer);
    })
}

function handleGameResult(player) {
    if (isWinner(player)) {
        win(player);
        socket.emit('win');
    } else if (isBoardFull()) {
        alert("It's a draw!");
    }
}

function isWinner(player) {
    const rowCombos = [[0, 1], [0, -1]];
    const columnCombos = [[1, 0], [-1, 0]];
    const diagonalCombos = [[1, 1], [-1, -1]];
    const antiDiagonalCombos = [[1, -1], [-1, 1]];
    const allCombos = [rowCombos, columnCombos, diagonalCombos, antiDiagonalCombos];
    let count = 1;

    if (!player.targetCell) {
        return false;
    }

    return allCombos.some((combo) => {
        combo.forEach((template) => {
            const cell =  Object.assign({}, player.targetCell,{ symbol: player.symbol });

            count += checkInTheDirectionOf(template, cell, 0);
        });

        if (count >= occurrencesNum) {
            return true;
        }
        count = 1;
    });
}

function checkInTheDirectionOf(template, cell, count) {
    const newRowIndex = cell.r + template[0];
    const newColumnIndex = cell.c + template[1];
    const cellExists = !!(cells[newRowIndex] && cells[newRowIndex][newColumnIndex]);
    const countSatisfies = count === occurrencesNum - 1;

    cell.r = newRowIndex;
    cell.c = newColumnIndex;

    if (cellExists && isContentEqual(cells[newRowIndex][newColumnIndex], cell.symbol) && !countSatisfies) {
        return checkInTheDirectionOf(template, cell, count + 1);
    }

    return count;
}

function isContentEqual(cell, str) {
    return cell.textContent === str;
}

function win(player) {
    alertWinner(player);
    openModal();
}

function setCellContent(cell, content) {
    cell.textContent = content;
}

function isBoardFull() {
    return cells.every(cell => !isContent(cell));
}

function isContent(cell) {
    return cell.textContent !== '';
}

function fillCells() {
    fillCellsOf(globalGameState.players[0]);
    fillCellsOf(globalGameState.players[1]);
}

function fillCellsOf(player) {
    const indexes = player.cellsTargeted;
    const symbol = player.symbol;
    indexes.forEach(index => {
        const {r: rowIndex, c: columnIndex} = index;
        if (cells[rowIndex] && cells[rowIndex][columnIndex]) {
            setCellContent(cells[rowIndex][columnIndex], symbol);
            isContentEqual(cells[rowIndex][columnIndex], symbol);
        }
    });
}

function updateSize() {
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;
    const cellSize = calculateCellSize(boardSize);
    const fontSize = calculateFontSize(cellSize);
    const sizeUnit = getSizeUnitForCell();

    boardGridStyle = `repeat(${boardSize}, ${cellSize + sizeUnit})`;
    board.style.gridTemplateColumns = boardGridStyle;
    board.style.gridTemplateRows = boardGridStyle;

    cells.forEach((row) => {
        row.forEach((cell) => {
            cell.style.fontSize = fontSize + sizeUnit;
        })
    })
}

function calculateCellSize(boardSize) {
    const relativeSize = Math.min(screenWidth, screenHeight);
    const maxCellSize = relativeSize / (Number(boardSize) + 1);
    return 100 * maxCellSize / relativeSize;
}

function calculateFontSize(cellSize) {
    return cellSize * 90 / 100;
}

function getSizeUnitForCell() {
    return screenWidth > screenHeight ? 'vh' : 'vw';
}

function getPropertyInTheRange(getProp, maxValue) {
    let value;

    for (let i = 0; i < 5; i++) {
        value = getProp();
        if (value >= minBoardWinValue && value <= maxValue) {
            break;
        }
        value = minBoardWinValue;
    }

    return value;
}

function promptBoardSize() {
    return Number(prompt("Game board size, please: ", minBoardWinValue));

}

function promptOccurrenceNum() {
    return Number(prompt("How many cells to win?", minBoardWinValue));
}

function showTurn() {
    infoTurn.innerHTML = `Turn: ${currentPlayer}`;
}

function showScore() {
    infoScore.innerHTML = `Player X: ${playerX.wins}, Player O: ${playerO.wins}`;
}

function alertWinner(player) {
    alert(`Player ${player} wins!`);
}

function getPlayerBySymbol(symbol) {
    return symbol === 'X' ? globalGameState.players[0] : globalGameState.players[1];
}

function closeModal() {
    modal.style.display = 'none';
}

window.addEventListener("resize", updateSize);

socket.on('connect', () => {
    console.log('Connected to server');

    socket.on('player', (playerSymbol) => {
        const rivalSymbol = playerSymbol === "X" ? "O" : "X";

        currentPlayer = getPlayerBySymbol(playerSymbol);
        rivalPlayer =  getPlayerBySymbol(rivalSymbol);
    });

    socket.on('gameStateSet', () => {
        resetBoard();
    });

    socket.on('gameStateGet', (gameState) => {
        console.log(gameState);
        globalGameState = gameState;
        processGameState();
    });

    socket.on('move', (players) => {
        globalGameState.players = players;

        fillCells();
    });

    socket.on('win', () => {
        win(rivalPlayer);
    });

    function resetBoard() {
        boardSize = getPropertyInTheRange(promptBoardSize, 100);
        occurrencesNum = getPropertyInTheRange(promptOccurrenceNum, boardSize);

        socket.emit('gameStateSet', {boardSize, occurrencesNum});
    }

    restartBtn.addEventListener("click", () => {
        // TODO: add functionality for restart
        socket.emit('reset');
        closeModal();
    });

    continueBtn.addEventListener("click", () => {
        socket.emit('reset');
        closeModal();
    });
});
