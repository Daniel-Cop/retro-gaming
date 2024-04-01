/*
Dear developer, 
I know this is spaghetti code, but please don't judge me too harshly. 
It was my first "big" project, done alone and studying the various parts step by step, adding piece by piece. 
It's a little patchy I know, but it works. 
If you're here to browse or get some ideas, feel free to do so,
the code is free for anyone who wants to use it,
(I tried to comment as clearly as possible to make things easier).
Daniel
*/

// VARIABLES
//setting board
const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
const preview = document.getElementById("preview");
const contextP = preview.getContext("2d");
const unitSize = 32;

// keep track of what is in every cell of the game using a 2d array
// tetris playfield is 10x20, with a few rows offscreen
const playfield = [];
for (let row = -2; row < 20; row++) {
  playfield[row] = [];

  for (let col = 0; col < 10; col++) {
    playfield[row][col] = 0;
  }
}

//preview area
const prevfield = [];
for (let row = 0; row < 5; row++) {
  prevfield[row] = [];

  for (let col = 0; col < 5; col++) {
    prevfield[row][col] = 0;
  }
}

// console infos
let levelDisplay = document.getElementById("level");
let scoreDisplay = document.getElementById("score");
let level = 0;
let score = 0;
let totalRemoved = 0;
const frameAtLevel = {
  // velocity of tetrominos for each level (in frames)
  0: 53,
  1: 49,
  2: 45,
  3: 41,
  4: 37,
  5: 33,
  6: 20,
  7: 22,
  8: 17,
  9: 11,
  10: 10,
  11: 9,
  12: 8,
  13: 7,
  14: 6,
  15: 6,
  16: 5,
  17: 5,
  18: 4,
  19: 4,
  20: 3,
};

// tetrominos
const tetrominos = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const colors = {
  I: "cyan",
  O: "yellow",
  T: "purple",
  S: "green",
  Z: "red",
  J: "blue",
  L: "orange",
};

// game loop
let count = 0;
let gameOver = false;
let rAF = null; // keep track of the animation frame so we can cancel it
const tetrominoSequence = [];
let tetromino = getNextTetromino(); // object with name, matrix (rotation) col and row (position)

// FUNCTIONS

// get a random int in the range told by min and max
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//choose one random remaining letter from the sequence, remove it from the sequence and add it to tetrominoSequence
function generateSequence() {
  const sequence = ["I", "J", "L", "O", "S", "T", "Z"];
  while (sequence.length) {
    const rand = getRandomInt(0, sequence.length - 1);
    const name = sequence.splice(rand, 1)[0];
    tetrominoSequence.push(name);
  }
}

// when the sequence get empty, it refill it with another random sequence
function getNextTetromino() {
  if (tetrominoSequence.length === 0) {
    generateSequence();
  }

  const name = tetrominoSequence.pop();

  if (tetrominoSequence.length === 0) {
    generateSequence();
  } // i know, repetition and not optimized

  const nextName = tetrominoSequence.slice(-1);
  const matrix = tetrominos[name];
  const nextMatrix = tetrominos[nextName];

  // setting spawn point
  const col = playfield[0].length / 2 - Math.ceil(matrix[0].length / 2);
  const row = name === "I" ? -1 : -2;
  // note: I and O start centerd, all other start in left-middle column
  // note: I start on row 21 (-1), all others start on row 22 (-2)
  return {
    name: name, //name of the shape
    nextName: nextName, //name of the next shape (for preview)
    matrix: matrix, //current rotation matrix (the roation it start with)
    nextMatrix: nextMatrix, //matrix of the next shape (for preview)
    row: row, //current row (start offscreen)
    col: col, //current column (middle one)
  };
}

// rotate the tetromino shape clockwise changing the arrays it is formed from
function rotate(matrix) {
  const N = matrix.length - 1;
  const result = matrix.map((row, i) => row.map((val, j) => matrix[N - j][i]));
  return result;
  //https://codereview.stackexchange.com/a/186834
}

//check to see if the new matrix/row/col is valid
function isValidMove(matrix, cellRow, cellCol) {
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (
        matrix[row][col] &&
        // outside the playfield
        (cellCol + col < 0 ||
          cellCol + col >= playfield[0].length ||
          cellRow + row >= playfield.length ||
          //collides with another pice
          playfield[cellRow + row][cellCol + col])
      ) {
        return false;
      }
    }
  }
  return true;
}

// place the tetromino on the playfield and check if any line is complete
function placeTetromino() {
  for (let row = 0; row < tetromino.matrix.length; row++) {
    for (let col = 0; col < tetromino.matrix[row].length; col++) {
      if (tetromino.matrix[row][col]) {
        if (tetromino.row + row < 0) {
          // check if anypart of the tetromino is offscreen, in case is game over
          return showGameOver();
        }
        playfield[tetromino.row + row][tetromino.col + col] = tetromino.name;
      }
    }
  }

  let removedAtOnce = 0;
  // check for line clears starting from the bottom
  for (let row = playfield.length - 1; row >= 0; ) {
    if (playfield[row].every((cell) => !!cell)) {
      // drop every row above this one
      removedAtOnce++;
      totalRemoved++;
      for (let r = row; r >= 0; r--) {
        for (let c = 0; c < playfield[r].length; c++) {
          playfield[r][c] = playfield[r - 1][c];
        }
      }
    } else {
      row--;
    }
  }

  switch (removedAtOnce) {
    case 1:
      score += 40 * (level + 1);
      break;
    case 2:
      score += 100 * (level + 1);
      break;
    case 3:
      score += 300 * (level + 1);
      break;
    case 4:
      score += 1200 * (level + 1);
      break;
    default:
      score += 0;
  }
  removedAtOnce = 0;
  if (totalRemoved >= 10 && level != 20) {
    level++;
    totalRemoved = 0;
  }

  tetromino = getNextTetromino();
}

// create the game over screen and show it in case of game over
function showGameOver() {
  cancelAnimationFrame(rAF);
  gameOver = true;

  context.fillStyle = "black";
  context.globalAlpha = 0.75;
  context.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);

  context.globalAlpha = 1;
  context.fillStyle = "white";
  context.font = "36px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
}

// game loop and draw
function loop() {
  rAF = requestAnimationFrame(loop);
  context.clearRect(0, 0, canvas.width, canvas.height);
  contextP.clearRect(0, 0, preview.width, preview.height);

  //draw the playfield (placed tetramino)
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 10; col++) {
      if (playfield[row][col]) {
        const name = playfield[row][col];
        context.fillStyle = colors[name];

        //draw 1 px smaller then the unitSize
        context.fillRect(
          col * unitSize,
          row * unitSize,
          unitSize - 1,
          unitSize - 1
        );
      }
    }
  }

  // draw the active tetromino
  if (tetromino) {
    // tetromino falls speed based on the level
    if (++count > frameAtLevel[level]) {
      tetromino.row++;
      count = 0;

      //place piece if it runs into anything
      if (!isValidMove(tetromino.matrix, tetromino.row, tetromino.col)) {
        tetromino.row--;
        placeTetromino();
      }
    }

    context.fillStyle = colors[tetromino.name];

    for (let row = 0; row < tetromino.matrix.length; row++) {
      for (let col = 0; col < tetromino.matrix[row].length; col++) {
        if (tetromino.matrix[row][col]) {
          //draw 1 px smaller than grid creates a grid effect
          context.fillRect(
            (tetromino.col + col) * unitSize,
            (tetromino.row + row) * unitSize,
            unitSize - 1,
            unitSize - 1
          );
        }
      }
    }
  }

  //draw preview
  if (tetromino) {
    contextP.fillStyle = colors[tetromino.nextName];
    let k = tetromino.nextName[0] === "O" ? 2.5 : 3; // O is positioned differently to be central

    for (let row = 0; row < tetromino.nextMatrix.length; row++) {
      for (let col = 0; col < tetromino.nextMatrix[row].length; col++) {
        if (tetromino.nextMatrix[row][col]) {
          contextP.fillRect(
            (2.5 - tetromino.nextMatrix.length / 2 + col) * unitSize,
            (k - tetromino.nextMatrix.length / 2 + row) * unitSize,
            unitSize - 1,
            unitSize - 1
            // position at the center of te preview
          );
        }
      }
    }
  }

  levelDisplay.innerHTML = level;
  scoreDisplay.innerHTML = score;
}

// EVENTS

// listen to keyboard events to move the active tetromino
document.addEventListener("keydown", function (e) {
  if (gameOver) return;

  //left and right arrow keys
  if (e.which === 37 || e.which === 39) {
    const col = e.which === 37 ? tetromino.col - 1 : tetromino.col + 1;

    if (isValidMove(tetromino.matrix, tetromino.row, col)) {
      tetromino.col = col;
    }
  }

  //up arrow key (rotate)
  if (e.which === 38) {
    const matrix = rotate(tetromino.matrix);
    if (isValidMove(matrix, tetromino.row, tetromino.col)) {
      tetromino.matrix = matrix;
    }
  }

  // down arrow key (drop)
  if (e.which === 40) {
    const row = tetromino.row + 1;

    if (!isValidMove(tetromino.matrix, row, tetromino.col)) {
      tetromino.row = row - 1;
      placeTetromino();
      return;
    }

    tetromino.row = row;
  }
});

//start the game
//rAF = requestAnimationFrame(loop);
