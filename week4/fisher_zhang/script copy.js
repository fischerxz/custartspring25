let clickTimestamps = [];
let gameActive = false;
let timeRemaining = 10;
let gameTimer;
let username = '';
let maxClickSpeed = 0; // Track the player's maximum click speed

const maxSpeed = 10;
const gameDuration = 10; // seconds

// API endpoint for the game server
const API_URL = 'http://localhost:3000/api';

const lowColor = [238, 130, 238]; // light orange 
const highColor = [255, 0, 0]; // shiny red

// Default leaderboard data - will be replaced with data from server if available
let leaderboardData = [
    { name: "SpeedyFingers", score: 87, speed: 8.7 },
    { name: "ClickMaster", score: 76, speed: 7.6 },
    { name: "TapKing", score: 72, speed: 7.2 },
    { name: "FastHands", score: 68, speed: 6.8 },
    { name: "ClickNinja", score: 65, speed: 6.5 }
];

// Fetch leaderboard data from server
async function fetchLeaderboardData() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched leaderboard data:', data);
        if (data && Array.isArray(data)) {
            leaderboardData = data;
            return data;
        }
    } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        // Keep using the default data if fetch fails
    }
    return leaderboardData;
}

// Save score to server
async function saveScore(playerData) {
    try {
        const response = await fetch(`${API_URL}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(playerData)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Score saved successfully:', result);
        return result;
    } catch (error) {
        console.error('Error saving score:', error);
        return null;
    }
}

// Fetch player data from server
async function fetchPlayerData(playerName) {
    try {
        const response = await fetch(`${API_URL}/players/${encodeURIComponent(playerName)}`);
        if (!response.ok) {
            if (response.status === 404) {
                // Player not found, which is fine
                return null;
            }
            throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Fetched data for player ${playerName}:`, data);
        return data;
    } catch (error) {
        console.error(`Error fetching data for player ${playerName}:`, error);
        return null;
    }
}

function interpolateColor(color1, color2, factor) {
    const result = color1.map((c, i) => Math.round(c + factor * (color2[i] - c)));
    return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
}

function startGame() {
    if (gameActive) return; // Prevent starting multiple times
    
    // Reset game state
    gameActive = true;
    timeRemaining = gameDuration;
    clickTimestamps = [];
    maxClickSpeed = 0; // Reset max speed for this game
    document.getElementById("counter").innerText = "0";
    document.getElementById("timer").innerText = `Time remaining: ${timeRemaining}`;
    
    // Enable clicking
    document.querySelector('.cookie').style.pointerEvents = 'auto';
    document.querySelector('.cookie').style.opacity = '1';
    
    // Start the timer
    gameTimer = setInterval(() => {
        timeRemaining--;
        document.getElementById("timer").innerText = `Time remaining: ${timeRemaining}`;
        
        if (timeRemaining <= 0) {
            endGame();
        }
    }, 1000);
}

async function endGame() {
    gameActive = false;
    clearInterval(gameTimer);
    document.querySelector('.cookie').style.pointerEvents = 'none';
    document.querySelector('.cookie').style.opacity = '0.6';
    document.getElementById("timer").innerText = "Time's up!";
    
    // Calculate final score as 10 * max speed (as an integer)
    const finalScore = Math.round(maxClickSpeed * 10);
    
    // Update the counter to show the final score
    document.getElementById("counter").innerText = finalScore;
    
    // Prepare player data
    const playerData = {
        name: username,
        score: finalScore,
        speed: maxClickSpeed.toFixed(2),
        timestamp: new Date().toISOString()
    };
    
    // Save score to server
    await saveScore(playerData);
    
    // Refresh leaderboard data from server
    await fetchLeaderboardData();
    
    // Check if the player made it to the leaderboard
    let leaderboardPosition = -1;
    
    for (let i = 0; i < leaderboardData.length; i++) {
        if (finalScore > leaderboardData[i].score) {
            leaderboardPosition = i;
            break;
        }
    }
    
    // Update the leaderboard display
    updateLeaderboardDisplay();
    
    if (leaderboardPosition !== -1) {
        alert(`Congratulations! You made it to position #${leaderboardPosition + 1} on the leaderboard with a score of ${finalScore} (max speed: ${maxClickSpeed.toFixed(2)} clicks/sec)!`);
    } else {
        alert(`Game Over! Your final score is ${finalScore} (max speed: ${maxClickSpeed.toFixed(2)} clicks/sec)!`);
    }
}

function updateLeaderboardDisplay() {
    const leaderboard = document.getElementById('leaderboard');
    if (!leaderboard) return;
    
    leaderboard.innerHTML = '';
    
    const leaderboardTitle = document.createElement('h3');
    leaderboardTitle.innerText = 'Top 5 Players';
    leaderboard.appendChild(leaderboardTitle);
    
    const leaderboardList = document.createElement('ul');
    
    // Sort leaderboard by score (highest first)
    const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.score - a.score).slice(0, 5);
    
    // Add leaderboard entries
    sortedLeaderboard.forEach((entry, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span class="rank">#${index + 1}</span> 
            <span class="name">${entry.name}</span> 
            <span class="score">${entry.score}</span>
            <span class="speed">${entry.speed || '0.00'}</span>
        `;
        if (entry.name === username) {
            listItem.classList.add('current-player');
        }
        leaderboardList.appendChild(listItem);
    });
    
    leaderboard.appendChild(leaderboardList);
}

function addOneToCounter(){
    if (!gameActive) return; // Only allow clicks when game is active
    
    console.log("Function addOneToCounter called");
    document.getElementById("counter").innerText = parseInt(document.getElementById("counter").innerText) + 1;

    count = parseInt(document.getElementById("counter").innerText)
    
    // Add rotation animation
    let cookie = document.querySelector('.cookie');
    cookie.classList.remove('rotate');
    void cookie.offsetWidth; // Trigger reflow to restart animation
    cookie.classList.add('rotate');

    //changing background color every 20 click
    if (count % 20 === 0) {
        // Step 3: Define the colors and choose one based on the count
        const colors = ["orange","green", "violet"];
        let colorIndex = Math.floor(count / 20) % colors.length;
        document.body.style.backgroundColor = colors[colorIndex];
    }
    
    
    // Capture the current timestamp (in milliseconds)
    const now = Date.now();
    // Add this timestamp to our global array
    clickTimestamps.push(now);
    console.log("Current clickTimestamps:", clickTimestamps);

    // We only need to keep the last 4 clicks.
    // If there are more than 4 timestamps, remove the oldest ones.
    if (clickTimestamps.length > 4) {
        clickTimestamps.shift();  // Removes the first element in the array
    }


    // If we have at least 4 clicks, calculate the click speed
    const speedElement = document.getElementById('click-speed');
    const progressBar = document.getElementById('progress-bar');

    if (clickTimestamps.length >= 4) {
        // Calculate the time difference between the oldest and current click (in ms)
        const timeDiffMs = now - clickTimestamps[0];
        // For 4 clicks there are 3 intervals, so calculate clicks per second
        const clicksPerSecond = 3 / (timeDiffMs / 1000);
        const formattedSpeed = clicksPerSecond.toFixed(2);
        speedElement.innerText = `Speed: ${formattedSpeed} clicks/sec`;
        
        // Update max click speed if current speed is higher
        if (clicksPerSecond > maxClickSpeed) {
            maxClickSpeed = clicksPerSecond;
        }
        
        // --- Update the Progress Bar ---
        // Calculate percentage based on maxSpeed and cap it at 100%
        let percentage = Math.min((clicksPerSecond / maxSpeed) * 100, 100);
        progressBar.style.width = percentage + '%';
        
        // Calculate the interpolation factor (0 to 1)
        let factor = percentage / 100;
        // Get the interpolated color for the current factor
        let barColor = interpolateColor(lowColor, highColor, factor);
        progressBar.style.backgroundColor = barColor;
      } else {
        speedElement.innerText = `Speed: calculating...`;
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = interpolateColor(lowColor, highColor, 0); // light orange
      }
}

async function createWelcomeScreen() {
    // Clear any existing content
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';
    
    const welcomeScreen = document.createElement('div');
    welcomeScreen.id = 'welcomeScreen';
    
    const welcomeText = document.createElement('h2');
    welcomeText.innerText = 'I dare you to give a name';
    welcomeScreen.appendChild(welcomeText);
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'usernameInput';
    usernameInput.placeholder = 'Enter your name';
    inputContainer.appendChild(usernameInput);
    
    const submitButton = document.createElement('button');
    submitButton.innerText = 'Start';
    submitButton.id = 'submitUsername';
    submitButton.onclick = async () => {
        const input = document.getElementById('usernameInput');
        if (input.value.trim()) {
            username = input.value.trim();
            
            // Show loading indicator
            const loadingMsg = document.createElement('div');
            loadingMsg.id = 'loadingMessage';
            loadingMsg.innerText = 'Loading your data...';
            welcomeScreen.appendChild(loadingMsg);
            
            // Load player data from server
            const playerData = await fetchPlayerData(username);
            
            // Remove loading indicator
            loadingMsg.remove();
            
            if (playerData) {
                // Display welcome back message
                const welcomeBack = document.createElement('p');
                welcomeBack.id = 'welcomeBack';
                welcomeBack.innerHTML = `Welcome back, ${username}!<br>Your best score: ${playerData.highScore || playerData.score}<br>Max speed: ${playerData.maxSpeed || playerData.speed} clicks/sec`;
                welcomeScreen.appendChild(welcomeBack);
                
                // Delay transition to give time to read the welcome back message
                setTimeout(() => {
                    welcomeScreen.style.opacity = '0';
                    setTimeout(() => {
                        welcomeScreen.remove();
                        createGameScreen();
                    }, 500);
                }, 2000);
            } else {
                welcomeScreen.style.opacity = '0';
                setTimeout(() => {
                    welcomeScreen.remove();
                    createGameScreen();
                }, 500);
            }
        } else {
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
        }
    };
    inputContainer.appendChild(submitButton);
    
    welcomeScreen.appendChild(inputContainer);
    gameContainer.appendChild(welcomeScreen);
    
    // Focus on input field
    usernameInput.focus();
    
    // Allow Enter key to submit
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitButton.click();
        }
    });
}

function createGameScreen() {
    // Clear any existing content
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';
    
    // Create and insert the title
    const titleDiv = document.createElement('h1');
    titleDiv.id = 'gameTitle';
    titleDiv.innerText = 'Finger Trainer';
    gameContainer.appendChild(titleDiv);
    
    // Create leaderboard
    createLeaderboard();
    
    // Create counter element
    const counterDiv = document.createElement('div');
    counterDiv.id = 'counter';
    counterDiv.innerText = '0';
    gameContainer.appendChild(counterDiv);
    
    // Create and insert the timer display
    const timerDiv = document.createElement('div');
    timerDiv.id = 'timer';
    timerDiv.innerText = `Time remaining: ${gameDuration}`;
    gameContainer.appendChild(timerDiv);
    
    // Create and insert the start button
    const startButton = document.createElement('button');
    startButton.id = 'startButton';
    startButton.innerText = 'Start Game';
    startButton.onclick = startGame;
    gameContainer.appendChild(startButton);
    
    // Add instruction text below the start button
    const instructionText = document.createElement('p');
    instructionText.id = 'instruction-text';
    instructionText.innerText = 'Click Start Game and click the cookie like a maniac!';
    gameContainer.appendChild(instructionText);
    
    // Create the cookie image as the click target
    const cookieImg = document.createElement('img');
    // Use a direct, reliable image URL
    cookieImg.src = 'https://cdn-icons-png.flaticon.com/512/5473/5473473.png';
    cookieImg.onerror = function() {
        // Fallback if the primary image fails
        this.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Chocolate_chip_cookie.jpg/240px-Chocolate_chip_cookie.jpg';
    };
    cookieImg.className = 'cookie';
    cookieImg.onclick = addOneToCounter;
    cookieImg.style.pointerEvents = 'none';
    cookieImg.style.opacity = '0.6';
    gameContainer.appendChild(cookieImg);
    
    // Create speed display
    const speedElement = document.createElement('div');
    speedElement.id = 'click-speed';
    speedElement.innerText = 'Speed: calculating...';
    gameContainer.appendChild(speedElement);
    
    // Create progress container and bar
    const progressContainer = document.createElement('div');
    progressContainer.id = 'progress-container';
    
    const progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    
    progressContainer.appendChild(progressBar);
    gameContainer.appendChild(progressContainer);
}

function createLeaderboard() {
    const gameContainer = document.getElementById('game-container');
    const leaderboardContainer = document.createElement('div');
    leaderboardContainer.id = 'leaderboard';
    
    const leaderboardTitle = document.createElement('h3');
    leaderboardTitle.innerText = 'Top 5 Players';
    leaderboardContainer.appendChild(leaderboardTitle);
    
    const leaderboardList = document.createElement('ul');
    
    // Sort leaderboard by score (highest first)
    const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.score - a.score).slice(0, 5);
    
    // Add leaderboard entries
    sortedLeaderboard.forEach((entry, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span class="rank">#${index + 1}</span> 
            <span class="name">${entry.name}</span> 
            <span class="score">${entry.score}</span>
            <span class="speed">${entry.speed || '0.00'}</span>
        `;
        if (entry.name === username) {
            listItem.classList.add('current-player');
        }
        leaderboardList.appendChild(listItem);
    });
    
    leaderboardContainer.appendChild(leaderboardList);
    gameContainer.appendChild(leaderboardContainer);
}

// Update the window.onload function
window.onload = async function() {
    // Fetch leaderboard data from server
    try {
        await fetchLeaderboardData();
    } catch (error) {
        console.error('Failed to fetch initial leaderboard data:', error);
        // Continue with default data
    }
    createWelcomeScreen();
};