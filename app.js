// Application data and state
const appData = {
  categories: {
    "A": { name: "1995", weightage: 1.870, ballots: 94 },
    "B": { name: "1695", weightage: 1.574, ballots: 300 },
    "C": { name: "1495", weightage: 1.398, ballots: 391 },
    "D": { name: "13XX", weightage: 1.261, ballots: 647 },
    "E": { name: "1030", weightage: 1.000, ballots: 6 }
  },
  candidates: [
    "Abhishek Tiwari (1)", "Ajay Jaitly (2)", "Amit Singh (3)", "Arijit Ghosh (4)", 
            "Mahendra Singh Yadav (5)", "Milan Saxena (6)", "Mukesh Kumar Gupta (7)", "Nisha Singh (8)", 
            "Rajendra Kumar Gupta (9)", "Rakesh Kumar Singh (10)","Sanjay Taneja (11)", "Saurabh C Verma (12)", 
            "Sumit Manocha (13)", "S.C. Bisht (14)", "Vibhor Gupta (15)", "Yogendra Bajaj (16)"
  ],
  votingRules: {
    maxCandidatesPerBallot: 9,
    totalBallots: 1438,
    precision: 3
  }
};

// Initialize vote data structure
let votes = {};
let chart = null;

// Initialize the application
function initializeApp() {
  initializeVotes();
  setupEventListeners();
  renderVotingGrid();
  renderCategorySummary();
  updateDashboard();
}

// Initialize votes structure
function initializeVotes() {
  votes = {};
  appData.candidates.forEach(candidate => {
    votes[candidate] = {};
    Object.keys(appData.categories).forEach(categoryKey => {
      votes[candidate][categoryKey] = 0;
    });
  });
}

// Set up event listeners
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.target.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Reset functionality
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('reset-modal').classList.remove('hidden');
  });

  document.getElementById('cancel-reset').addEventListener('click', () => {
    document.getElementById('reset-modal').classList.add('hidden');
  });

  document.getElementById('confirm-reset').addEventListener('click', () => {
    resetAllVotes();
    document.getElementById('reset-modal').classList.add('hidden');
  });

  // Export functionality
  document.getElementById('export-btn').addEventListener('click', exportData);

  // Modal backdrop click
  document.querySelector('.modal-backdrop').addEventListener('click', () => {
    document.getElementById('reset-modal').classList.add('hidden');
  });
}

// Switch between tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('tab-btn--active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('tab-btn--active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('tab-content--active');
  });
  document.getElementById(tabName).classList.add('tab-content--active');

  // Update dashboard when switching to it
  if (tabName === 'dashboard') {
    updateDashboard();
  }
}

// Render the voting grid
function renderVotingGrid() {
  const grid = document.getElementById('voting-grid');
  grid.innerHTML = '';

  // Header row
  const headerHTML = `
    <div class="grid-header">Candidates</div>
    ${Object.entries(appData.categories).map(([key, cat]) => 
      `<div class="grid-header">${cat.name}<br><small>${cat.ballots} ballots</small></div>`
    ).join('')}
  `;
  grid.innerHTML = headerHTML;

  // Candidate rows
  appData.candidates.forEach(candidate => {
    const candidateRow = document.createElement('div');
    candidateRow.className = 'candidate-row';
    
    const candidateName = document.createElement('div');
    candidateName.className = 'candidate-name';
    candidateName.textContent = candidate;
    candidateRow.appendChild(candidateName);

    Object.keys(appData.categories).forEach(categoryKey => {
      const voteCell = document.createElement('div');
      voteCell.className = 'vote-cell';
      
      const voteControls = document.createElement('div');
      voteControls.className = 'vote-controls';
      
      const decrementBtn = document.createElement('button');
      decrementBtn.className = 'vote-btn';
      decrementBtn.innerHTML = '−';
      decrementBtn.onclick = () => changeVote(candidate, categoryKey, -1);
      
      const voteCount = document.createElement('span');
      voteCount.className = 'vote-count';
      voteCount.textContent = votes[candidate][categoryKey];
      
      const incrementBtn = document.createElement('button');
      incrementBtn.className = 'vote-btn';
      incrementBtn.innerHTML = '+';
      incrementBtn.onclick = () => changeVote(candidate, categoryKey, 1);
      
      voteControls.appendChild(decrementBtn);
      voteControls.appendChild(voteCount);
      voteControls.appendChild(incrementBtn);
      voteCell.appendChild(voteControls);
      candidateRow.appendChild(voteCell);
    });

    grid.appendChild(candidateRow);
  });

  updateVotingGridState();
}

// Change vote with validation
function changeVote(candidate, categoryKey, delta) {
  const currentVote = votes[candidate][categoryKey];
  const newVote = currentVote + delta;

  // Basic bounds check
  if (newVote < 0) return;

  // Get current category total
  const categoryTotal = getCategoryTotal(categoryKey);
  const categoryBallots = appData.categories[categoryKey].ballots;
  const maxVotesPerCategory = categoryBallots * appData.votingRules.maxCandidatesPerBallot;

  // Check if candidate would exceed ballot limit for this category
  if (newVote > categoryBallots) {
    showValidationMessage(`${candidate} cannot exceed ${categoryBallots} votes in ${appData.categories[categoryKey].name} (max ballots available)`);
    return;
  }

  // Check if adding this vote would exceed the category's total vote limit
  // Each ballot can select up to 9 candidates, so max total votes = ballots * 9
  if (delta > 0 && categoryTotal >= maxVotesPerCategory) {
    showValidationMessage(`Category ${appData.categories[categoryKey].name} has reached maximum total votes (${maxVotesPerCategory.toLocaleString()}) - each of ${categoryBallots} ballots can select up to ${appData.votingRules.maxCandidatesPerBallot} candidates`);
    return;
  }

  // Apply the change
  votes[candidate][categoryKey] = newVote;
  
  // Update the display
  updateVotingGridState();
  updateCategorySummary();
  updateDashboard();
}

// Get total votes for a category
function getCategoryTotal(categoryKey) {
  return appData.candidates.reduce((sum, candidate) => {
    return sum + votes[candidate][categoryKey];
  }, 0);
}

// Get total votes for a candidate across all categories
function getCandidateTotal(candidate) {
  return Object.keys(appData.categories).reduce((sum, categoryKey) => {
    return sum + votes[candidate][categoryKey];
  }, 0);
}

// Calculate weighted score for a candidate
function calculateWeightedScore(candidate) {
  let totalScore = 0;
  Object.entries(appData.categories).forEach(([categoryKey, category]) => {
    totalScore += votes[candidate][categoryKey] * category.weightage;
  });
  return parseFloat(totalScore.toFixed(appData.votingRules.precision));
}

// Update voting grid state (enable/disable buttons)
function updateVotingGridState() {
  const grid = document.getElementById('voting-grid');
  const rows = grid.querySelectorAll('.candidate-row');
  
  rows.forEach((row, candidateIndex) => {
    const candidate = appData.candidates[candidateIndex];
    const cells = row.querySelectorAll('.vote-cell');
    
    cells.forEach((cell, categoryIndex) => {
      const categoryKey = Object.keys(appData.categories)[categoryIndex];
      const currentVote = votes[candidate][categoryKey];
      const categoryTotal = getCategoryTotal(categoryKey);
      const categoryBallots = appData.categories[categoryKey].ballots;
      const maxVotesPerCategory = categoryBallots * appData.votingRules.maxCandidatesPerBallot;
      
      const decrementBtn = cell.querySelector('.vote-btn:first-child');
      const incrementBtn = cell.querySelector('.vote-btn:last-child');
      const voteCount = cell.querySelector('.vote-count');
      
      // Update vote count display
      voteCount.textContent = currentVote;
      
      // Enable/disable decrement button
      decrementBtn.disabled = currentVote === 0;
      
      // Enable/disable increment button
      const canIncrementCategory = categoryTotal < maxVotesPerCategory;
      const canIncrementCandidate = currentVote < categoryBallots;
      incrementBtn.disabled = !canIncrementCategory || !canIncrementCandidate;
    });
  });

  // Update top candidate styling
  updateTopCandidateHighlights();
}

// Update top candidate highlights
function updateTopCandidateHighlights() {
  const rankings = getRankings();
  const grid = document.getElementById('voting-grid');
  const candidateNames = grid.querySelectorAll('.candidate-name');
  
  candidateNames.forEach((nameElement, index) => {
    const candidate = appData.candidates[index];
    const ranking = rankings.find(r => r.candidate === candidate);
    
    if (ranking && ranking.rank <= 9) {
      nameElement.classList.add('top-candidate');
    } else {
      nameElement.classList.remove('top-candidate');
    }
  });
}

// Get candidate rankings
function getRankings() {
  const rankings = appData.candidates.map(candidate => ({
    candidate,
    totalVotes: getCandidateTotal(candidate),
    weightedScore: calculateWeightedScore(candidate)
  }));
  
  rankings.sort((a, b) => b.weightedScore - a.weightedScore);
  
  return rankings.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
}

// Render category summary
function renderCategorySummary() {
  const container = document.getElementById('category-summary');
  container.innerHTML = '';
  
  Object.entries(appData.categories).forEach(([categoryKey, category]) => {
    const categoryCard = document.createElement('div');
    categoryCard.className = 'category-card';
    
    const total = getCategoryTotal(categoryKey);
    const maxVotes = category.ballots * appData.votingRules.maxCandidatesPerBallot;
    const utilization = (total / maxVotes) * 100;
    
    categoryCard.innerHTML = `
      <div class="category-header">
        <div class="category-title">${category.name}</div>
        <div class="category-weightage">×${category.weightage.toFixed(3)}</div>
      </div>
      <div class="category-stats">
        <div class="stat-item">
          <span class="stat-value">${total}</span>
          <span class="stat-label">Votes Cast</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${maxVotes}</span>
          <span class="stat-label">Max Votes</span>
        </div>
      </div>
      <div class="category-stats">
        <div class="stat-item">
          <span class="stat-value">${category.ballots}</span>
          <span class="stat-label">Ballots</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${appData.votingRules.maxCandidatesPerBallot}</span>
          <span class="stat-label">Max per Ballot</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${utilization >= 90 ? 'warning' : ''} ${utilization >= 100 ? 'error' : ''}" 
             style="width: ${Math.min(utilization, 100)}%"></div>
      </div>
      <div style="text-align: center; margin-top: 8px; font-size: 12px; color: var(--color-text-secondary);">
        ${utilization.toFixed(1)}% utilized (${total}/${maxVotes})
      </div>
    `;
    
    container.appendChild(categoryCard);
  });
}

// Update category summary
function updateCategorySummary() {
  renderCategorySummary();
}

// Update dashboard
function updateDashboard() {
  updateRankings();
  updateChart();
  updateDashboardStats();
}

// Update rankings display
function updateRankings() {
  const rankings = getRankings();
  const container = document.getElementById('ranking-list');
  container.innerHTML = '';
  
  rankings.forEach(item => {
    const rankingItem = document.createElement('div');
    rankingItem.className = `ranking-item ${item.rank <= 9 ? 'top-nine' : ''}`;
    
    rankingItem.innerHTML = `
      <div class="ranking-position">${item.rank}</div>
      <div class="ranking-details">
        <div class="ranking-name">${item.candidate}</div>
        <div class="ranking-score">
          ${item.totalVotes} votes • ${item.weightedScore.toFixed(appData.votingRules.precision)} weighted score
        </div>
      </div>
    `;
    
    container.appendChild(rankingItem);
  });
}

// Update chart
function updateChart() {
  const ctx = document.getElementById('votes-chart').getContext('2d');
  const rankings = getRankings().slice(0, 10); // Top 10 for chart
  
  if (chart) {
    chart.destroy();
  }
  
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rankings.map(r => r.candidate),
      datasets: [{
        label: 'Weighted Score',
        data: rankings.map(r => r.weightedScore),
        backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'],
        borderWidth: 1,
        borderColor: 'var(--color-border)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Weighted Score'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Candidates'
          }
        }
      }
    }
  });
}

// Update dashboard statistics
function updateDashboardStats() {
  const totalVotes = appData.candidates.reduce((sum, candidate) => {
    return sum + getCandidateTotal(candidate);
  }, 0);
  
  document.getElementById('total-votes-cast').textContent = totalVotes.toLocaleString();
}

// Show validation message
function showValidationMessage(message) {
  // Create a temporary notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--color-error);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 10000;
    max-width: 300px;
    font-size: 14px;
    box-shadow: var(--shadow-lg);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Reset all votes
function resetAllVotes() {
  initializeVotes();
  updateVotingGridState();
  updateCategorySummary();
  updateDashboard();
}

// Export data
function exportData() {
  const exportData = {
    timestamp: new Date().toISOString(),
    votes: votes,
    rankings: getRankings(),
    categorySummary: Object.entries(appData.categories).map(([key, cat]) => ({
      category: key,
      name: cat.name,
      totalVotes: getCategoryTotal(key),
      maxVotes: cat.ballots * appData.votingRules.maxCandidatesPerBallot,
      totalBallots: cat.ballots,
      utilization: ((getCategoryTotal(key) / (cat.ballots * appData.votingRules.maxCandidatesPerBallot)) * 100).toFixed(1)
    }))
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voting-results-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
