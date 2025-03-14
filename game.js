class ShootingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.isForestBackground = false;
        this.gameStarted = false;
        this.target = null;
        this.animationFrame = null;
        this.difficultyLevel = 1;
        this.floatingScores = [];
        this.gameTime = 30; // 修改为30秒
        this.timeLeft = this.gameTime;
        this.gameTimer = null;
        this.targetTimer = null;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.playerName = '';
        this.leaderboard = this.loadLeaderboard();
        
        // 设置画布大小
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 颜色定义
        this.backgrounds = {
            dark: '#000000',
            forest: '#228B22'
        };
        
        this.setupEventListeners();
        this.displayLeaderboard(); // 初始化时加载排行榜
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = window.innerHeight * 0.6; // 使用60%的视窗高度
        
        // 设置画布大小
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // 如果游戏正在进行，重绘当前状态
        if (this.gameStarted) {
            this.drawBackground();
            if (this.target) this.drawTarget();
        }
    }

    setupEventListeners() {
        // 玩家昵称输入处理
        const playerNameInput = document.getElementById('playerName');
        const startButton = document.getElementById('startGame');
        const errorMessage = document.getElementById('errorMessage');

        playerNameInput.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            if (name.length > 0) {
                if (this.isNameDuplicate(name)) {
                    errorMessage.style.display = 'block';
                    startButton.disabled = true;
                } else {
                    errorMessage.style.display = 'none';
                    startButton.disabled = false;
                }
            } else {
                startButton.disabled = true;
                errorMessage.style.display = 'none';
            }
        });

        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameStarted || !this.target) return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
            
            this.checkHit(x, y);
        }, { passive: false });

        // 鼠标点击事件
        this.canvas.addEventListener('click', (e) => {
            if (!this.gameStarted || !this.target || this.isMobile) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            
            this.checkHit(x, y);
        });

        document.getElementById('toggleBackground').addEventListener('click', (e) => {
            e.preventDefault();
            this.isForestBackground = !this.isForestBackground;
            this.drawBackground();
            if (this.target) this.drawTarget();
        });

        document.getElementById('startGame').addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.gameStarted) {
                const nameInput = document.getElementById('playerName');
                this.playerName = nameInput.value.trim();
                if (this.playerName) {
                    nameInput.disabled = true;
                    this.startGame();
                }
            }
        });

        // 添加排行榜按钮事件监听
        document.getElementById('showLeaderboard').addEventListener('click', () => {
            this.showLeaderboardPage();
        });

        // 添加返回游戏按钮事件监听
        document.getElementById('backToGame').addEventListener('click', () => {
            this.showGamePage();
        });
    }

    loadLeaderboard() {
        const saved = localStorage.getItem('shootingGameLeaderboard');
        return saved ? JSON.parse(saved) : [];
    }

    saveLeaderboard() {
        localStorage.setItem('shootingGameLeaderboard', JSON.stringify(this.leaderboard));
    }

    isNameDuplicate(name) {
        const currentTime = new Date().getTime();
        // 清理超过24小时的记录
        this.leaderboard = this.leaderboard.filter(entry => 
            (currentTime - entry.timestamp) <= 24 * 60 * 60 * 1000
        );
        return this.leaderboard.some(entry => entry.name === name);
    }

    updateLeaderboard() {
        const currentTime = new Date().getTime();
        const existingEntry = this.leaderboard.find(entry => entry.name === this.playerName);
        
        if (existingEntry) {
            if (this.score > existingEntry.score) {
                existingEntry.score = this.score;
                existingEntry.timestamp = currentTime;
                existingEntry.date = new Date().toLocaleString();
            }
        } else {
            this.leaderboard.push({
                name: this.playerName,
                score: this.score,
                timestamp: currentTime,
                date: new Date().toLocaleString()
            });
        }

        // 按分数排序
        this.leaderboard.sort((a, b) => b.score - a.score);
        
        // 保存到本地存储
        this.saveLeaderboard();
        
        // 更新显示
        this.displayLeaderboard();
    }

    displayLeaderboard() {
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';

        this.leaderboard.slice(0, 10).forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
                <td>${entry.date}</td>
            `;
            if (entry.name === this.playerName) {
                row.style.backgroundColor = '#4CAF5033';
            }
            tbody.appendChild(row);
        });
    }

    startGame() {
        this.gameStarted = true;
        this.score = 0;
        this.difficultyLevel = 1;
        this.timeLeft = this.gameTime;
        this.floatingScores = [];
        this.updateScore();
        this.createNewTarget();
        document.getElementById('startGame').textContent = '游戏进行中';
        document.getElementById('leaderboard').style.display = 'none';
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    endGame() {
        this.gameStarted = false;
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        if (this.targetTimer) {
            clearTimeout(this.targetTimer);
        }
        cancelAnimationFrame(this.animationFrame);
        
        this.ctx.fillStyle = this.isForestBackground ? this.backgrounds.forest : this.backgrounds.dark;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const titleSize = Math.min(this.canvas.width * 0.06, 36);
        const scoreSize = Math.min(this.canvas.width * 0.05, 30);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${titleSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束!', this.canvas.width / 2, this.canvas.height / 2 - titleSize);
        
        this.ctx.font = `${scoreSize}px Arial`;
        this.ctx.fillText(`最终得分: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + scoreSize);
        
        document.getElementById('startGame').textContent = '开始游戏';
        document.getElementById('playerName').disabled = false;
        this.target = null;

        // 更新排行榜并显示
        this.updateLeaderboard();
        setTimeout(() => {
            this.showLeaderboardPage();
        }, 2000); // 2秒后显示排行榜
    }

    createNewTarget() {
        if (!this.gameStarted) return;

        const minDistance = Math.min(this.canvas.width, this.canvas.height) * 0.1;
        const maxX = this.canvas.width - minDistance;
        const maxY = this.canvas.height - minDistance;
        
        const x = Math.random() * (maxX - minDistance) + minDistance;
        const y = Math.random() * (maxY - minDistance) + minDistance;
        
        const baseRadius = Math.min(this.canvas.width, this.canvas.height) * 0.05;
        
        this.target = {
            x,
            y,
            baseRadius,
            currentRadius: baseRadius,
            pulseAmount: 0,
            pulseSpeed: 0.05 * this.difficultyLevel,
            opacity: 1,
            createdAt: Date.now()
        };

        // 修改目标存在时间（0.8到2秒之间，随难度递减）
        const maxDuration = Math.max(800, 2000 - (this.difficultyLevel * 150));
        const minDuration = Math.max(600, maxDuration - 1200);
        const duration = Math.random() * (maxDuration - minDuration) + minDuration;

        // 清除之前的定时器
        if (this.targetTimer) {
            clearTimeout(this.targetTimer);
        }

        // 设置新的定时器
        this.targetTimer = setTimeout(() => {
            if (this.target) {
                // 扣分：根据目标大小决定扣分数量（1-3分）
                const penalty = Math.ceil(this.target.currentRadius / 10);
                this.score = Math.max(0, this.score - penalty);
                this.updateScore();
                
                // 显示扣分动画
                this.addFloatingScore(this.target.x, this.target.y - 20, -penalty, true);
                
                // 移除目标并创建新目标
                this.target = null;
                this.createNewTarget();
            }
        }, duration);

        this.animate();
    }

    animate() {
        if (!this.gameStarted) return;

        this.drawBackground();
        this.updateTarget();
        this.drawTarget();
        this.updateFloatingScores();
        this.drawTimer();

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    updateTarget() {
        if (!this.target) return;

        // 更新脉冲效果
        this.target.pulseAmount += this.target.pulseSpeed;
        this.target.currentRadius = this.target.baseRadius + Math.sin(this.target.pulseAmount) * 5;

        // 根据难度调整闪烁
        if (this.difficultyLevel > 1) {
            this.target.opacity = 0.5 + Math.abs(Math.sin(this.target.pulseAmount * this.difficultyLevel)) * 0.5;
        }
    }

    drawBackground() {
        this.ctx.fillStyle = this.isForestBackground ? this.backgrounds.forest : this.backgrounds.dark;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawTarget() {
        if (!this.target) return;

        // 绘制光晕效果
        const gradient = this.ctx.createRadialGradient(
            this.target.x, this.target.y, 0,
            this.target.x, this.target.y, this.target.currentRadius
        );

        gradient.addColorStop(0, `rgba(255, 0, 0, ${this.target.opacity})`);
        gradient.addColorStop(0.3, `rgba(255, 165, 0, ${this.target.opacity * 0.8})`);
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');

        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, this.target.currentRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }

    drawTimer() {
        const timerSize = Math.min(this.canvas.width * 0.04, 24); // 响应式字体大小
        this.ctx.fillStyle = 'white';
        this.ctx.font = `${timerSize}px Arial`;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`时间: ${this.timeLeft}秒`, this.canvas.width - 20, timerSize + 5);
    }

    addFloatingScore(x, y, score, isPenalty = false) {
        const fontSize = Math.min(this.canvas.width * 0.04, 24);
        this.floatingScores.push({
            x,
            y,
            score,
            opacity: 1,
            distance: 0,
            fontSize,
            isPenalty
        });
    }

    updateFloatingScores() {
        for (let i = this.floatingScores.length - 1; i >= 0; i--) {
            const floating = this.floatingScores[i];
            
            floating.distance += this.canvas.height * 0.003;
            floating.y -= this.canvas.height * 0.003;
            floating.opacity -= 0.02;
            
            this.ctx.fillStyle = floating.isPenalty ? 
                `rgba(255, 0, 0, ${floating.opacity})` : 
                `rgba(0, 255, 0, ${floating.opacity})`;
            this.ctx.font = `bold ${floating.fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                floating.score > 0 ? `+${floating.score}` : `${floating.score}`,
                floating.x,
                floating.y
            );
            
            if (floating.opacity <= 0) {
                this.floatingScores.splice(i, 1);
            }
        }
    }

    checkHit(x, y) {
        if (!this.target) return;

        const distance = Math.sqrt(
            Math.pow(x - this.target.x, 2) + 
            Math.pow(y - this.target.y, 2)
        );

        // 计算得分（1-3分）
        if (distance <= this.target.currentRadius) {
            const scoreMultiplier = Math.max(1, 4 - Math.ceil(distance / 10));
            this.score += scoreMultiplier;
            
            // 添加浮动得分效果
            this.addFloatingScore(this.target.x, this.target.y - 20, scoreMultiplier);
            
            this.updateScore();

            // 增加难度
            if (this.score > this.difficultyLevel * 10) {
                this.difficultyLevel++;
            }

            cancelAnimationFrame(this.animationFrame);
            this.createNewTarget();
        }
    }

    updateScore() {
        document.getElementById('score').textContent = `得分: ${this.score}`;
    }

    showLeaderboardPage() {
        document.getElementById('gamePage').classList.remove('active');
        document.getElementById('leaderboardPage').classList.add('active');
        this.displayLeaderboard(); // 刷新排行榜数据
    }

    showGamePage() {
        document.getElementById('leaderboardPage').classList.remove('active');
        document.getElementById('gamePage').classList.add('active');
    }
}

// 初始化游戏
window.onload = () => {
    new ShootingGame();
}; 