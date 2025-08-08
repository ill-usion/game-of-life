const CELL_SIZE = 6; // one cell = 6x6 pixels

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const fpsSlider = document.getElementById("fps");
const fpsDisplay = document.getElementById("fps-display");

const generationSpan = document.getElementById("generation");
const cellsSpan = document.getElementById("cells");

var activeCells = new Set();
var activeCellsNext = new Set();

var potentialCells = new Set();
var potentialCellsNext = new Set();

var generation = 0;
var simIntervalId = null;

var mousePos = { x: 0, y: 0 };
var penDown = false;
const WIDTH = Math.floor(canvas.width / CELL_SIZE);
const HEIGHT = Math.floor(canvas.height / CELL_SIZE);
var fpsDelay = (1 / 30) * 1000; // 30fps

function wrapCoord(x, y) {
    const wrappedX = ((x % WIDTH) + WIDTH) % WIDTH;
    const wrappedY = ((y % HEIGHT) + HEIGHT) % HEIGHT;
    return [wrappedX, wrappedY];
}

function packCoord(x, y) {
    return (BigInt(y) << 32n) | BigInt(x);
}

function unpackCoord(packed) {
    const x = Number(packed & 0xffffffffn);
    const y = Number(packed >> 32n);

    return wrapCoord(x, y);
}

function neighborsCount(cx, cy) {
    const potentialNeighborOffsets = [
        [+1, +1],
        [+0, +1],
        [+1, +0],
        [-1, -1],
        [-0, -1],
        [-1, -0],
        [+1, -1],
        [-1, +1],
    ];

    var count = 0;
    for (const offset of potentialNeighborOffsets) {
        const potentialNeighbor = packCoord(cx + offset[0], cy + offset[1]);
        if (activeCells.has(potentialNeighbor)) count++;
    }

    return count;
}

function simulate() {
    activeCells = activeCellsNext;
    activeCellsNext = new Set();

    potentialCells = potentialCellsNext;

    for (const cell of potentialCells) {
        const [x, y] = unpackCoord(cell);
        const numNeighbors = neighborsCount(x, y);

        // Cell is alive
        if (activeCells.has(cell)) {
            if (numNeighbors !== 2 && numNeighbors !== 3) {
                // Cell dies from underpopulation or overcrowding
                // Stimulate neighbors for the next generation
                for (var ny = -1; ny <= 1; ny++)
                    for (var nx = -1; nx <= 1; nx++)
                        potentialCellsNext.add(packCoord(x + nx, y + ny));
            } else {
                // Keep cell alive
                activeCellsNext.add(cell);
            }
        } else if (numNeighbors === 3) {
            // A new cell is born
            activeCellsNext.add(cell);

            // There is potential for a new cell to be born
            for (var ny = -1; ny <= 1; ny++)
                for (var nx = -1; nx <= 1; nx++)
                    potentialCellsNext.add(packCoord(x + nx, y + ny));
        }
    }

    generation++;
    updateLabels();

    // Draw the active cells
    drawCells();
}

function startSimulation() {
    simIntervalId = setInterval(simulate, fpsDelay);
}

function stopSimulation() {
    clearInterval(simIntervalId);
    simIntervalId = null;
}

function updateLabels() {
    generationSpan.innerText = generation.toString();
    cellsSpan.innerText = activeCells.size;
}

function clearScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#ddd";
    ctx.beginPath();
    for (var y = 0; y < canvas.height; y += CELL_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.height, y);
    }

    for (var x = 0; x < canvas.width; x += CELL_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.width);
    }
    ctx.stroke();
}

function drawCells() {
    // Clear the screen before redrawing
    clearScreen();

    // Draw a grid for better visuals
    drawGrid();

    for (var cell of activeCells) {
        const [x, y] = unpackCoord(cell);
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
}

function insertCell(x, y) {
    const cell = packCoord(x, y);
    activeCells.add(cell);
    activeCellsNext.add(cell);

    for (var ny = -1; ny <= 1; ny++)
        for (var nx = -1; nx <= 1; nx++)
            potentialCellsNext.add(packCoord(x + nx, y + ny));

    drawCells();
}

// On initialization
document.addEventListener("DOMContentLoaded", () => {
    drawGrid();

    fpsSlider.addEventListener("input", (event) => {
        const newFps = event.target.value;
        fpsDisplay.textContent = newFps;
        fpsDelay = (1 / newFps) * 1000;

        if (simIntervalId !== null) {
            stopSimulation();
            startSimulation();
        }
    });
});

document.addEventListener("keydown", (event) => {
    switch (event.key.toLowerCase()) {
        case " ":
            if (simIntervalId === null) {
                startSimulation();
            } else {
                stopSimulation();
            }
            break;
        case "w":
            simulate();
            break;

        case "e":
            for (
                var y = Math.max(mousePos.y - 25, 0);
                y <= Math.min(mousePos.y + 25, HEIGHT);
                y++
            )
                for (
                    var x = Math.max(mousePos.x - 25, 0);
                    x <= Math.min(mousePos.x + 25, WIDTH);
                    x++
                ) {
                    if (Math.random() > 0.5) continue;
                    const cell = packCoord(x, y);

                    activeCells.add(cell);
                    activeCellsNext.add(cell);

                    for (var ny = -1; ny <= 1; ny++)
                        for (var nx = -1; nx <= 1; nx++)
                            potentialCellsNext.add(packCoord(x + nx, y + ny));
                }
            drawCells();
            break;

        case "c":
            activeCells = new Set();
            activeCellsNext = new Set();
            potentialCells = new Set();
            potentialCellsNext = new Set();
            generation = 0;
            drawCells();
            updateLabels();
            break;

        default:
            break;
    }
});

canvas.addEventListener("mousedown", () => {
    penDown = true;

    const { x, y } = mousePos;
    insertCell(x, y);
});

canvas.addEventListener("mouseup", () => {
    penDown = false;
});

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);

    mousePos = { x, y };

    if (penDown) insertCell(x, y);
});
