const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'game-data.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Initialize data structure
let gameData = {
    leaderboard: [
        { name: "SpeedyFingers", score: 87, speed: 8.7 },
        { name: "ClickMaster", score: 76, speed: 7.6 },
        { name: "TapKing", score: 72, speed: 7.2 },
        { name: "FastHands", score: 68, speed: 6.8 },
        { name: "ClickNinja", score: 65, speed: 6.5 }
    ],
    players: {}
};

// Load data from file if it exists
async function loadData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        gameData = JSON.parse(data);
        console.log('Game data loaded from file');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No existing data file, starting with default data');
            await saveData(); // Create the file with default data
        } else {
            console.error('Error loading game data:', error);
        }
    }
}

// Save data to file
async function saveData() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(gameData, null, 2), 'utf8');
        console.log('Game data saved to file');
    } catch (error) {
        console.error('Error saving game data:', error);
    }
}

// API Routes

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    console.log('Leaderboard requested');
    // Sort leaderboard by score (highest first) and return top 5
    const sortedLeaderboard = [...gameData.leaderboard]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    res.json(sortedLeaderboard);
});

// Get player data
app.get('/api/players/:name', (req, res) => {
    const playerName = req.params.name;
    console.log(`Player data requested for: ${playerName}`);
    if (gameData.players[playerName]) {
        res.json(gameData.players[playerName]);
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
});

// Save score
app.post('/api/scores', (req, res) => {
    const playerData = req.body;
    console.log('Score submission received:', playerData);
    
    if (!playerData.name || playerData.score === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Update player data
    const playerName = playerData.name;
    const currentPlayer = gameData.players[playerName] || { highScore: 0, maxSpeed: 0 };
    
    // Update high score if new score is higher
    if (playerData.score > (currentPlayer.highScore || 0)) {
        currentPlayer.highScore = playerData.score;
    }
    
    // Update max speed if new speed is higher
    if (parseFloat(playerData.speed) > (parseFloat(currentPlayer.maxSpeed) || 0)) {
        currentPlayer.maxSpeed = playerData.speed;
    }
    
    // Save last played timestamp
    currentPlayer.lastPlayed = playerData.timestamp;
    currentPlayer.name = playerName;
    
    // Save updated player data
    gameData.players[playerName] = currentPlayer;
    
    // Check if score qualifies for leaderboard
    let leaderboardUpdated = false;
    
    // Find if player is already on leaderboard
    const existingEntryIndex = gameData.leaderboard.findIndex(entry => entry.name === playerName);
    
    // If player is already on leaderboard, update their score if new one is higher
    if (existingEntryIndex !== -1) {
        if (playerData.score > gameData.leaderboard[existingEntryIndex].score) {
            gameData.leaderboard[existingEntryIndex].score = playerData.score;
            gameData.leaderboard[existingEntryIndex].speed = playerData.speed;
            leaderboardUpdated = true;
        }
    } else {
        // Check if score is high enough for leaderboard
        for (let i = 0; i < gameData.leaderboard.length; i++) {
            if (playerData.score > gameData.leaderboard[i].score) {
                // Add to leaderboard
                gameData.leaderboard.splice(i, 0, {
                    name: playerName,
                    score: playerData.score,
                    speed: playerData.speed
                });
                
                // Keep only top 5
                if (gameData.leaderboard.length > 5) {
                    gameData.leaderboard.pop();
                }
                
                leaderboardUpdated = true;
                break;
            }
        }
        
        // If leaderboard has fewer than 5 entries, add player regardless of score
        if (!leaderboardUpdated && gameData.leaderboard.length < 5) {
            gameData.leaderboard.push({
                name: playerName,
                score: playerData.score,
                speed: playerData.speed
            });
            leaderboardUpdated = true;
        }
    }
    
    // Sort leaderboard by score (highest first)
    gameData.leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 5
    if (gameData.leaderboard.length > 5) {
        gameData.leaderboard = gameData.leaderboard.slice(0, 5);
    }
    
    // Save data to file
    saveData();
    
    // Find player's position in the sorted leaderboard
    const leaderboardPosition = gameData.leaderboard.findIndex(entry => entry.name === playerName);
    
    res.json({
        success: true,
        leaderboardPosition: leaderboardPosition,
        playerData: gameData.players[playerName]
    });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
    await loadData();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Game interface available at http://localhost:${PORT}`);
    });
}

startServer(); 