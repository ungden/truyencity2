import {
  assertFirst30PortfolioCommission,
  requireMarketBlueprint,
  StoryFactoryError,
} from '@/services/story-factory';

describe('fresh-story market blueprint boundary', () => {
  test('a story cannot leave setup without a valid market blueprint', () => {
    expect(() => requireMarketBlueprint(null)).toThrow(StoryFactoryError);
    expect(() => requireMarketBlueprint(null))
      .toThrow('Market blueprint is required and must be valid before a new story can leave setup.');
  });

  test('a fresh production commission must use its allocated topic lane', () => {
    expect(() => assertFirst30PortfolioCommission({
      slotKey: 'HX-03',
      genreLane: 'xuanhuan_global_awakening',
    })).not.toThrow();
    expect(() => assertFirst30PortfolioCommission({
      slotKey: 'HX-03',
      genreLane: 'era_coastal',
    })).toThrow('Portfolio slot HX-03 requires lane xuanhuan_global_awakening, not era_coastal.');
  });
});
