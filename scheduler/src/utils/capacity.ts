export function perUserCostFromGrouped(templatesByChannel: Record<string, any[]>) {
  return Object.fromEntries(
    Object.entries(templatesByChannel).map(([ch, arr]) => [ch, (arr || []).length || 1])
  );
}

export function computeUserCap(channelsUsed: string[], availableByChannel: Record<string, number>, perUserChannelCost: Record<string, number>) {
  return channelsUsed.reduce((acc: number, ch: string) => {
    const avail = availableByChannel[ch] ?? 0;
    const cost = perUserChannelCost[ch] || 1;
    const capForChannel = Math.floor(avail / cost);
    return acc === Infinity ? capForChannel : Math.min(acc, capForChannel);
  }, Infinity);
}
