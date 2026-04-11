const symbols = ["💣","💎","7️⃣","🔥","⭐","🍒"];
const weights = {
    "💎": 5,
    "7️⃣": 8,
    "🔥": 12,
    "⭐": 18,
    "🍒": 25,
    "💣": 6
};
const paytable = {
    "💎": {3:5,4:15,5:40,6:100},
    "7️⃣": {3:4,4:10,5:30,6:80},
    "🔥": {3:3,4:8,5:20,6:60},
    "⭐": {3:2,4:5,5:15,6:40},
    "🍒": {3:1,4:3,5:10,6:25}
};
const paylines = [
    [0,0,0,0,0,0],
    [1,1,1,1,1,1],
    [2,2,2,2,2,2],
    [0,1,2,1,0,1],
    [2,1,0,1,2,1]
];

function weightedRandom() {
    let pool = [];
    for (let s in weights) {
        for (let i = 0; i < weights[s]; i++) pool.push(s);
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

function generateGrid() {
    let grid = [];
    for (let r = 0; r < 6; r++) {
        let col = [];
        for (let i = 0; i < 3; i++) col.push(weightedRandom());
        grid.push(col);
    }
    return grid;
}

function evaluate(grid, bet) {
    let win = 0;
    paylines.forEach(line => {
        let symbol = grid[0][line[0]];
        let count = 1;
        for (let i = 1; i < 6; i++) {
            if (grid[i][line[i]] === symbol) count++;
            else break;
        }
        if (paytable[symbol]?.[count]) {
            win += paytable[symbol][count] * bet;
        }
    });
    let bombs = grid.flat().filter(x => x === "💣").length;
    if (bombs >= 3) {
        win += bombs * 50 * bet;
    }
    return win;
}
