export class endGameMenu {
    constructor(scene) {
        this.scene = scene;
        this.menuElement = document.getElementById('endMenu-display');
        this.isDisplayed = false;
        
        this.mockData = {
            scores: {
                red: 3,
                blue: 2
            },
            teams: {
                red: [
                    {
                        name: "Player 1",
                        elo: 1500,
                        goals: 2,
                        assists: 1
                    },
                    {
                        name: "Player 2",
                        elo: 1600,
                        goals: 1,
                        assists: 2
                    }
                ],
                blue: [
                    {
                        name: "Player 3",
                        elo: 1450,
                        goals: 1,
                        assists: 1
                    },
                    {
                        name: "Player 4",
                        elo: 1550,
                        goals: 1,
                        assists: 0
                    }
                ]
            },
            stats: {
                possession: {
                    red: 55,
                    blue: 45
                },
                shots: {
                    red: {
                        total: 8,
                        accuracy: 45
                    },
                    blue: {
                        total: 12,
                        accuracy: 58
                    }
                },
                passes: {
                    red: 25,
                    blue: 20
                },
                distance: {
                    red: 2.5,
                    blue: 2.8
                }
            }
        };
    }

    showEndGameMenu() {
        if (this.isDisplayed) return;
        this.isDisplayed = true;

        const data = this.mockData;
        const menuHTML = `
        <style>
            @keyframes gradientBG {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            @keyframes glowPulse {
                0% { text-shadow: 0 0 10px rgba(255,255,255,0.3); }
                50% { text-shadow: 0 0 20px rgba(255,255,255,0.5); }
                100% { text-shadow: 0 0 10px rgba(255,255,255,0.3); }
            }

            @keyframes floatingAnimation {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
                100% { transform: translateY(0px); }
            }

            .end-game-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, 
                    rgba(0,0,0,0.75) 0%,
                    rgba(26,32,44,0.75) 50%,
                    rgba(0,0,0,0.75) 100%); /* Giảm độ đậm của background */
                background-size: 200% 200%;
                animation: gradientBG 15s ease infinite;
                opacity: 0;
                transition: opacity 0.5s ease;
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(5px); /* Giảm độ blur */
            }

            .end-game-content {
                width: 85%;
                max-width: 1000px;
                color: white;
                font-family: 'Arial', sans-serif;
                opacity: 0;
                transform: translateY(50px);
                padding: 40px;
                background: rgba(255,255,255,0.03); /* Giảm độ đậm của content background */
                border-radius: 30px;
                box-shadow: 0 0 50px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                position: relative;
                overflow: hidden;
            }

            .end-game-content::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 200%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255,255,255,0.1),
                    transparent
                );
                transition: 0.5s;
            }

            .end-game-content:hover::before {
                left: 100%;
            }

            .score-section {
                text-align: center;
                font-size: 96px;
                margin-bottom: 40px;
                opacity: 0;
                transform: scale(0.8);
                font-weight: bold;
                animation: glowPulse 2s infinite;
            }

            .teams-container {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                opacity: 0;
                gap: 40px;
                max-width: 900px;
                margin: 0 auto 40px;
            }

            .team {
                width: 45%;
                padding: 25px;
                border-radius: 20px;
                background: rgba(0,0,0,0.2); /* Giảm độ đậm của team background */
                backdrop-filter: blur(3px); /* Giảm độ blur */
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }

            .team:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.2);
            }

            .team-red {
                border-left: 4px solid #ff4757;
                background: linear-gradient(135deg, 
                    rgba(255,71,87,0.1) 0%, 
                    rgba(0,0,0,0.15) 100%); /* Điều chỉnh gradient */
            }

            .team-blue {
                border-right: 4px solid #2e86de;
                background: linear-gradient(225deg, 
                    rgba(46,134,222,0.1) 0%, 
                    rgba(0,0,0,0.15) 100%); /* Điều chỉnh gradient */
            }

            .player-block {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 10px 0;
                padding: 15px;
                background: rgba(255,255,255,0.02);
                border-radius: 15px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .player-block:hover {
                transform: translateY(-2px) scale(1.02);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                background: rgba(255,255,255,0.05);
            }

            .player-info {
                display: flex;
                flex-direction: column;
            }

            .player-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 4px;
                letter-spacing: 0.5px;
            }

            .player-elo {
                font-size: 14px;
                color: rgba(255,255,255,0.7);
            }
             .player-stats {
                display: flex;
                gap: 12px;
            }

            .stat {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 14px;
                padding: 6px 10px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                transition: all 0.3s ease;
            }

            .stat:hover {
                transform: scale(1.1);
                background: rgba(255,255,255,0.1);
            }

            .stats-section {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                opacity: 0;
                margin: 0 auto 40px; /* Giảm margin-bottom xuống */
                max-width: 800px;
            }

            .stat-item {
                display: flex;
                justify-content: space-between;
                padding: 20px;
                background: rgba(255,255,255,0.05);
                border-radius: 15px;
                font-size: 14px;
                letter-spacing: 0.5px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .stat-item:hover {
                transform: translateY(-2px) scale(1.02);
                background: rgba(255,255,255,0.05);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }

            .stat-item::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255,255,255,0.1),
                    transparent
                );
                transition: 0.5s;
            }

            .stat-item:hover::after {
                left: 100%;
            }

            .stat-value {
                font-weight: 600;
                font-size: 18px;
            }

            .accuracy {
                font-size: 11px;
                color: rgba(255,255,255,0.5);
                text-align: right;
                margin-top: 4px;
            }

            .home-button {
                position: relative;
                display: block;
                margin: 0 auto;
                margin-top: -10px;
                padding: 15px 40px;
                background: linear-gradient(to right,
                    rgba(255,71,87,0.8),
                    rgba(46,134,222,0.8)
                );
                border: none;
                border-radius: 30px;
                color: white;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 2px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }

            .home-button:hover {
                background: linear-gradient(to right,
                    rgba(255,71,87,0.9),
                    rgba(46,134,222,0.9)
                );
            }



            .value-red { 
                color: #ff4757;
                text-shadow: 0 0 15px rgba(255,71,87,0.5);
            }

            .value-blue { 
                color: #2e86de;
                text-shadow: 0 0 15px rgba(46,134,222,0.5);
            }
        </style>

        <div class="end-game-overlay">
            <div class="end-game-content">
                <div class="score-section">
                    <span class="value-red">${data.scores.red}</span> - <span class="value-blue">${data.scores.blue}</span>
                </div>

                <div class="teams-container">
                    <div class="team team-red">
                        ${data.teams.red.map(player => `
                            <div class="player-block">
                                <div class="player-info">
                                    <div class="player-name">${player.name}</div>
                                    <div class="player-elo">${player.elo}</div>
                                </div>
                                <div class="player-stats">
                                    <div class="stat">⚽ ${player.goals}</div>
                                    <div class="stat">👟 ${player.assists}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="team team-blue">
                        ${data.teams.blue.map(player => `
                            <div class="player-block">
                                <div class="player-stats">
                                    <div class="stat">⚽ ${player.goals}</div>
                                    <div class="stat">👟 ${player.assists}</div>
                                </div>
                                <div class="player-info">
                                    <div class="player-name">${player.name}</div>
                                    <div class="player-elo">${player.elo}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="stats-section">
                    <div class="stat-item">
                        <span>Possession</span>
                        <div>
                            <span class="stat-value ${data.stats.possession.red > data.stats.possession.blue ? 'value-red' : ''}">${data.stats.possession.red}%</span> - 
                            <span class="stat-value ${data.stats.possession.blue > data.stats.possession.red ? 'value-blue' : ''}">${data.stats.possession.blue}%</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span>Total Shots</span>
                        <div>
                            <span class="stat-value ${data.stats.shots.red.total > data.stats.shots.blue.total ? 'value-red' : ''}">${data.stats.shots.red.total}</span> - 
                            <span class="stat-value ${data.stats.shots.blue.total > data.stats.shots.red.total ? 'value-blue' : ''}">${data.stats.shots.blue.total}</span>
                            <div class="accuracy">Accuracy: ${data.stats.shots.red.accuracy}% - ${data.stats.shots.blue.accuracy}%</div>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span>Pass Completions</span>
                        <div>
                            <span class="stat-value ${data.stats.passes.red > data.stats.passes.blue ? 'value-red' : ''}">${data.stats.passes.red}</span> - 
                            <span class="stat-value ${data.stats.passes.blue > data.stats.passes.red ? 'value-blue' : ''}">${data.stats.passes.blue}</span>
                        </div>
                    </div>
                    <div class="stat-item">
                        <span>Distance Covered</span>
                        <div>
                            <span class="stat-value ${data.stats.distance.red > data.stats.distance.blue ? 'value-red' : ''}">${data.stats.distance.red}km</span> - 
                            <span class="stat-value ${data.stats.distance.blue > data.stats.distance.red ? 'value-blue' : ''}">${data.stats.distance.blue}km</span>
                        </div>
                    </div>
                </div>

                <button class="home-button">Return to Home</button>
            </div>
        </div>
        `;

        const menuContainer = document.createElement('div');
        menuContainer.innerHTML = menuHTML;
        document.body.appendChild(menuContainer);

        // Enhanced animations with better timing and effects
        requestAnimationFrame(() => {
            const overlay = document.querySelector('.end-game-overlay');
            const content = document.querySelector('.end-game-content');
            const scoreSection = document.querySelector('.score-section');
            const teamsContainer = document.querySelector('.teams-container');
            const statsSection = document.querySelector('.stats-section');
            const homeButton = document.querySelector('.home-button');

            // Initial fade in with blur effect
            overlay.style.opacity = '1';

            // Staggered animations with smooth transitions
            setTimeout(() => {
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
                content.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 300);

            setTimeout(() => {
                scoreSection.style.opacity = '1';
                scoreSection.style.transform = 'scale(1)';
                scoreSection.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 800);

            setTimeout(() => {
                teamsContainer.style.opacity = '1';
                teamsContainer.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                teamsContainer.style.transform = 'translateY(0)';
            }, 1200);

            setTimeout(() => {
                statsSection.style.opacity = '1';
                statsSection.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                statsSection.style.transform = 'translateY(0)';
            }, 1600);

            setTimeout(() => {
                homeButton.style.opacity = '1';
                homeButton.style.transition = 'all 0.8s ease';
            }, 2000);
        });

        document.querySelector('.home-button').addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    hideMenu() {
        const overlay = document.querySelector('.end-game-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                this.isDisplayed = false;
            }, 500);
        }
    }
}