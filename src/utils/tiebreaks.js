export const calculateTiebreaks = (player, allPlayers) => {
  const opponentScores = player.opponents.map(id => {
    const opp = allPlayers.find(p => p.id === id);
    return opp ? opp.score : 0;
  });

  const totalBH = opponentScores.reduce((a, b) => a + b, 0);
  
  // Buchholz Cut-1: Remove the lowest opponent score
  const bhCut1 = opponentScores.length > 0 
    ? totalBH - Math.min(...opponentScores) 
    : 0;

  return { bh: totalBH, bhCut1 };
};